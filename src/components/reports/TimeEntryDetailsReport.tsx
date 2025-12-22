import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TimeEntryDetail {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  description: string | null;
  is_break: boolean;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  };
  projects?: {
    name: string;
  } | null;
}

interface TimeEntryDetailsReportProps {
  startDate?: Date;
  endDate?: Date;
}

export const TimeEntryDetailsReport: React.FC<TimeEntryDetailsReportProps> = ({ 
  startDate: propStartDate,
  endDate: propEndDate
}) => {
  const { company } = useCompany();
  const [entries, setEntries] = useState<TimeEntryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, { clockIn?: string; clockOut?: string }>>({});

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
            start_time,
            end_time,
            duration_minutes,
            clock_in_photo_url,
            clock_out_photo_url,
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

        // Fetch profiles separately
        const userIds = [...new Set(data.map(e => e.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, display_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profileMap = profiles?.reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>) || {};

        setEntries(data.map(entry => ({
          ...entry,
          profile: profileMap[entry.user_id]
        })));
      } catch (error) {
        console.error('Error fetching time entry details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [company?.id, startDateStr, endDateStr]);

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

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getEmployeeName = (entry: TimeEntryDetail) => {
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
            <FileText className="h-5 w-5" />
            Time Entry Details
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Photos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.start_time), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{getEmployeeName(entry)}</TableCell>
                    <TableCell>{entry.projects?.name || 'No Project'}</TableCell>
                    <TableCell>{format(new Date(entry.start_time), 'h:mm a')}</TableCell>
                    <TableCell>
                      {entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}
                    </TableCell>
                    <TableCell>{formatDuration(entry.duration_minutes)}</TableCell>
                    <TableCell>
                      <Badge variant={entry.is_break ? 'secondary' : 'default'}>
                        {entry.is_break ? 'Break' : 'Work'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {entry.clock_in_photo_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="cursor-pointer flex flex-col items-center gap-1">
                                {photoUrls[entry.id]?.clockIn ? (
                                  <img 
                                    src={photoUrls[entry.id].clockIn} 
                                    alt="Clock in" 
                                    className="w-10 h-10 rounded object-cover border border-border hover:border-primary transition-colors"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">In</span>
                              </div>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Clock In Photo</DialogTitle>
                              </DialogHeader>
                              {photoUrls[entry.id]?.clockIn ? (
                                <img 
                                  src={photoUrls[entry.id].clockIn} 
                                  alt="Clock in" 
                                  className="w-full rounded-lg"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                                  <span className="text-muted-foreground">Loading photo...</span>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                        {entry.clock_out_photo_url && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="cursor-pointer flex flex-col items-center gap-1">
                                {photoUrls[entry.id]?.clockOut ? (
                                  <img 
                                    src={photoUrls[entry.id].clockOut} 
                                    alt="Clock out" 
                                    className="w-10 h-10 rounded object-cover border border-border hover:border-primary transition-colors"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">Out</span>
                              </div>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Clock Out Photo</DialogTitle>
                              </DialogHeader>
                              {photoUrls[entry.id]?.clockOut ? (
                                <img 
                                  src={photoUrls[entry.id].clockOut} 
                                  alt="Clock out" 
                                  className="w-full rounded-lg"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                                  <span className="text-muted-foreground">Loading photo...</span>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                        {!entry.clock_in_photo_url && !entry.clock_out_photo_url && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
