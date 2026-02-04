import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, getDay, differenceInMinutes, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  profile_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  department_id: string | null;
}

interface ScheduleDay {
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

interface EmployeeSummary {
  profileId: string;
  name: string;
  totalMinutes: number;
  scheduledMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
}

interface DailyTimecardReportProps {
  date?: Date;
  employeeId?: string;
  departmentId?: string;
}

const DEFAULT_SCHEDULED_MINUTES = 480; // 8 hours

function parseTimeToMinutes(timeStr: string | null): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function calculateScheduledMinutes(schedule: ScheduleDay | undefined): number {
  if (!schedule || schedule.is_day_off) {
    return 0; // Day off means all hours count as overtime
  }
  if (schedule.start_time && schedule.end_time) {
    const startMins = parseTimeToMinutes(schedule.start_time);
    const endMins = parseTimeToMinutes(schedule.end_time);
    return endMins - startMins;
  }
  return DEFAULT_SCHEDULED_MINUTES;
}

export const DailyTimecardReport: React.FC<DailyTimecardReportProps> = ({ 
  date: propDate,
  employeeId,
  departmentId
}) => {
  const { company } = useCompany();
  const [summaries, setSummaries] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Stabilize date to prevent infinite re-renders from new Date() default
  const date = useMemo(() => propDate ?? new Date(), [propDate]);
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch time entries for the day
        const { data: entries, error: entriesError } = await supabase
          .from('time_entries')
          .select('id, user_id, profile_id, start_time, end_time, duration_minutes')
          .eq('company_id', company.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: false });

        if (entriesError) throw entriesError;
        if (!entries || entries.length === 0) {
          setSummaries([]);
          setLoading(false);
          return;
        }

        // Get unique profile/user IDs
        const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))];
        const profileIds = [...new Set(entries.map(e => e.profile_id).filter(Boolean))];

        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, display_name, department_id')
          .or(`user_id.in.(${userIds.join(',')}),id.in.(${profileIds.join(',')})`);

        if (profilesError) throw profilesError;

        // Build profile map
        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          if (p.user_id) acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, Profile>);

        // Fetch employee schedules for the day of week
        const relevantProfileIds = [...new Set(
          entries
            .map(e => e.profile_id || profileMap[e.user_id]?.id)
            .filter(Boolean)
        )] as string[];

        const { data: employeeSchedules } = await supabase
          .from('employee_schedules')
          .select('profile_id, start_time, end_time, is_day_off')
          .in('profile_id', relevantProfileIds)
          .eq('day_of_week', dayOfWeek);

        // Build employee schedule map
        const employeeScheduleMap = (employeeSchedules || []).reduce((acc, s) => {
          acc[s.profile_id] = {
            start_time: s.start_time,
            end_time: s.end_time,
            is_day_off: s.is_day_off ?? false,
          };
          return acc;
        }, {} as Record<string, ScheduleDay>);

        // Fetch department schedules for fallback
        const departmentIds = [...new Set(
          (profiles || []).map(p => p.department_id).filter(Boolean)
        )] as string[];

        let departmentScheduleMap: Record<string, ScheduleDay> = {};
        if (departmentIds.length > 0) {
          const { data: deptSchedules } = await supabase
            .from('department_schedules')
            .select('department_id, start_time, end_time, is_day_off')
            .in('department_id', departmentIds)
            .eq('day_of_week', dayOfWeek);

          departmentScheduleMap = (deptSchedules || []).reduce((acc, s) => {
            acc[s.department_id] = {
              start_time: s.start_time,
              end_time: s.end_time,
              is_day_off: s.is_day_off ?? false,
            };
            return acc;
          }, {} as Record<string, ScheduleDay>);
        }

        // Aggregate entries by employee
        const employeeAggregates = new Map<string, { 
          profile: Profile; 
          totalMinutes: number;
        }>();

        for (const entry of entries) {
          const profile = entry.profile_id 
            ? profileMap[entry.profile_id] 
            : profileMap[entry.user_id];
          
          if (!profile) continue;

          // Apply filters
          if (employeeId && profile.id !== employeeId) continue;
          if (departmentId && profile.department_id !== departmentId) continue;

          // Calculate duration for active entries
          let durationMinutes = entry.duration_minutes;
          if (durationMinutes === null && entry.start_time) {
            const endTime = entry.end_time ? parseISO(entry.end_time) : new Date();
            durationMinutes = differenceInMinutes(endTime, parseISO(entry.start_time));
          }

          const existing = employeeAggregates.get(profile.id);
          if (existing) {
            existing.totalMinutes += durationMinutes || 0;
          } else {
            employeeAggregates.set(profile.id, {
              profile,
              totalMinutes: durationMinutes || 0,
            });
          }
        }

        // Calculate regular vs overtime for each employee
        const summaryList: EmployeeSummary[] = [];
        
        for (const [profileId, data] of employeeAggregates) {
          const { profile, totalMinutes } = data;
          
          // Get schedule: employee > department > default
          let schedule: ScheduleDay | undefined = employeeScheduleMap[profileId];
          if (!schedule && profile.department_id) {
            schedule = departmentScheduleMap[profile.department_id];
          }
          
          const scheduledMinutes = schedule 
            ? calculateScheduledMinutes(schedule)
            : DEFAULT_SCHEDULED_MINUTES;

          const regularMinutes = Math.min(totalMinutes, scheduledMinutes);
          const overtimeMinutes = Math.max(0, totalMinutes - scheduledMinutes);

          const name = profile.first_name || profile.last_name
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : profile.display_name || 'Unknown';

          summaryList.push({
            profileId,
            name,
            totalMinutes,
            scheduledMinutes,
            regularMinutes,
            overtimeMinutes,
          });
        }

        // Sort by name
        summaryList.sort((a, b) => a.name.localeCompare(b.name));
        setSummaries(summaryList);
      } catch (error) {
        console.error('Error fetching daily timecard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company?.id, dateStr, dayOfWeek, employeeId, departmentId]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Timecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Timecard - {format(date, 'MMMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No time entries for this date
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Regular Hours</TableHead>
                <TableHead className="text-right">Overtime Hours</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((summary) => (
                <TableRow key={summary.profileId}>
                  <TableCell className="font-medium">{summary.name}</TableCell>
                  <TableCell className="text-right">{formatDuration(summary.regularMinutes)}</TableCell>
                  <TableCell className="text-right">
                    {summary.overtimeMinutes > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {formatDuration(summary.overtimeMinutes)}
                      </span>
                    ) : (
                      formatDuration(0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatDuration(summary.totalMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
