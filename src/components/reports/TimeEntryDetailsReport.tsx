import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { TimeEntryTimelineCard, TimeEntryForCard } from './TimeEntryTimelineCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeEntryDetail {
  id: string;
  user_id: string;
  profile_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  description: string | null;
  is_break: boolean;
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

interface TimeEntryDetailsReportProps {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  departmentId?: string;
}

export const TimeEntryDetailsReport: React.FC<TimeEntryDetailsReportProps> = ({ 
  startDate: propStartDate,
  endDate: propEndDate,
  employeeId,
  departmentId
}) => {
  const { company } = useCompany();
  const [entries, setEntries] = useState<TimeEntryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, { clockIn?: string; clockOut?: string }>>({});
  const [allocProjectMap, setAllocProjectMap] = useState<Record<string, string>>({});

  // Stabilize dates to prevent infinite re-renders from new Date() defaults
  const startDate = useMemo(() => propStartDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1), [propStartDate]);
  const endDate = useMemo(() => propEndDate ?? new Date(), [propEndDate]);
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  useEffect(() => {
    const fetchEntries = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('time_entries')
          .select(`
            id,
            user_id,
            profile_id,
            start_time,
            end_time,
            duration_minutes,
            clock_in_photo_url,
            clock_out_photo_url,
            clock_in_latitude,
            clock_in_longitude,
            clock_out_latitude,
            clock_out_longitude,
            clock_in_address,
            clock_out_address,
            description,
            is_break,
            projects(name)
          `)
          .eq('company_id', company.id)
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .order('start_time', { ascending: false })
          .limit(100);

        if (error) throw error;

        // Fetch timecard_allocations for project names on modern entries
        const entryIds = data.map(e => e.id);
        let localAllocProjectMap: Record<string, string> = {};
        if (entryIds.length > 0) {
          const { data: allocs } = await supabase
            .from('timecard_allocations')
            .select('time_entry_id, projects:project_id(name)')
            .in('time_entry_id', entryIds);
          if (allocs) {
            for (const a of allocs) {
              const p = a.projects as any;
              if (p?.name && !localAllocProjectMap[a.time_entry_id]) {
                localAllocProjectMap[a.time_entry_id] = p.name;
              } else if (p?.name && localAllocProjectMap[a.time_entry_id] && !localAllocProjectMap[a.time_entry_id].includes(p.name)) {
                localAllocProjectMap[a.time_entry_id] += `, ${p.name}`;
              }
            }
          }
        }

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

        setAllocProjectMap(localAllocProjectMap);
        setEntries(filteredEntries);
      } catch (error) {
        console.error('Error fetching time entry details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [company?.id, startDateStr, endDateStr, employeeId, departmentId]);

  // Fetch signed URLs for photos from private bucket
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const urlMap: Record<string, { clockIn?: string; clockOut?: string }> = {};

      for (const entry of entries) {
        const urls: { clockIn?: string; clockOut?: string } = {};

        if (entry.clock_in_photo_url) {
          const path = entry.clock_in_photo_url.startsWith('http') 
            ? null 
            : entry.clock_in_photo_url;
          
          if (path) {
            const { data } = await supabase.storage
              .from('timeclock-photos')
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              urls.clockIn = data.signedUrl;
            }
          } else {
            urls.clockIn = entry.clock_in_photo_url;
          }
        }

        if (entry.clock_out_photo_url) {
          const path = entry.clock_out_photo_url.startsWith('http') 
            ? null 
            : entry.clock_out_photo_url;
          
          if (path) {
            const { data } = await supabase.storage
              .from('timeclock-photos')
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              urls.clockOut = data.signedUrl;
            }
          } else {
            urls.clockOut = entry.clock_out_photo_url;
          }
        }

        if (urls.clockIn || urls.clockOut) {
          urlMap[entry.id] = urls;
        }
      }

      setPhotoUrls(urlMap);
    };

    if (entries.length > 0) {
      fetchPhotoUrls();
    }
  }, [entries]);

  const getEmployeeName = (entry: TimeEntryDetail) => {
    if (!entry.profile) return 'Unknown';
    const { first_name, last_name, display_name } = entry.profile;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return display_name || 'Unknown';
  };

  // Transform entries to card format
  const cardEntries: TimeEntryForCard[] = entries.map(entry => ({
    id: entry.id,
    start_time: entry.start_time,
    end_time: entry.end_time,
    duration_minutes: entry.duration_minutes,
    clock_in_photo_url: entry.clock_in_photo_url,
    clock_out_photo_url: entry.clock_out_photo_url,
    clock_in_latitude: entry.clock_in_latitude,
    clock_in_longitude: entry.clock_in_longitude,
    clock_out_latitude: entry.clock_out_latitude,
    clock_out_longitude: entry.clock_out_longitude,
    clock_in_address: entry.clock_in_address,
    clock_out_address: entry.clock_out_address,
    is_break: entry.is_break,
    employeeName: getEmployeeName(entry),
    projectName: allocProjectMap[entry.id] || entry.projects?.name || null,
    signedClockInUrl: photoUrls[entry.id]?.clockIn || null,
    signedClockOutUrl: photoUrls[entry.id]?.clockOut || null,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Time Entry Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
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
          <FileText className="h-5 w-5" />
          Time Entry Details
        </CardTitle>
        <CardDescription>
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')} ({entries.length} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No time entries for this period
          </p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {cardEntries.map((entry) => (
                <TimeEntryTimelineCard key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
