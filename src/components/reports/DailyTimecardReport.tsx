import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  profile_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
  };
  projects?: {
    name: string;
  } | null;
}

interface DailyTimecardReportProps {
  date?: Date;
  employeeId?: string;
  departmentId?: string;
}

export const DailyTimecardReport: React.FC<DailyTimecardReportProps> = ({ 
  date: propDate,
  employeeId,
  departmentId
}) => {
  const { company } = useCompany();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Stabilize date to prevent infinite re-renders from new Date() default
  const date = useMemo(() => propDate ?? new Date(), [propDate]);
  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchEntries = async () => {
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

        const { data, error } = await supabase
          .from('time_entries')
          .select(`
            id,
            user_id,
            profile_id,
            start_time,
            end_time,
            duration_minutes,
            projects(name)
          `)
          .eq('company_id', company.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: false });

        if (error) throw error;

        // Fetch profiles separately - get all profiles for the company for filtering
        const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
        const profileIds = [...new Set(data.map(e => e.profile_id).filter(Boolean))];
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, display_name, department_id')
          .or(`user_id.in.(${userIds.join(',')}),id.in.(${profileIds.join(',')})`);

        if (profilesError) throw profilesError;

        // Build profile map indexed by both id and user_id
        const profileMap = profiles?.reduce((acc, p) => {
          acc[p.id] = p;
          if (p.user_id) acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        // Map entries and apply filters
        let filteredEntries = data.map(entry => ({
          ...entry,
          profile: entry.profile_id ? profileMap[entry.profile_id] : profileMap[entry.user_id]
        }));

        // Filter by employee if specified
        if (employeeId) {
          filteredEntries = filteredEntries.filter(entry => 
            entry.profile?.id === employeeId || entry.profile_id === employeeId
          );
        }

        // Filter by department if specified
        if (departmentId) {
          filteredEntries = filteredEntries.filter(entry => 
            entry.profile?.department_id === departmentId
          );
        }

        setEntries(filteredEntries);
      } catch (error) {
        console.error('Error fetching daily timecard entries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [company?.id, dateStr, employeeId, departmentId]);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEmployeeName = (entry: TimeEntry) => {
    if (!entry.profile) return 'Unknown';
    const { first_name, last_name, display_name } = entry.profile;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return display_name || 'Unknown';
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
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No time entries for this date
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{getEmployeeName(entry)}</TableCell>
                  <TableCell>{entry.projects?.name || 'No Project'}</TableCell>
                  <TableCell>{format(new Date(entry.start_time), 'h:mm a')}</TableCell>
                  <TableCell>
                    {entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}
                  </TableCell>
                  <TableCell>{formatDuration(entry.duration_minutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
