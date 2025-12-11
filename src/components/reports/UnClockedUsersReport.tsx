import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  department?: {
    name: string;
  } | null;
}

interface UnClockedUsersReportProps {
  date?: Date;
}

export const UnClockedUsersReport: React.FC<UnClockedUsersReportProps> = ({ 
  date = new Date() 
}) => {
  const { company } = useCompany();
  const [unclockedUsers, setUnclockedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnclockedUsers = async () => {
      if (!company?.id) return;

      setLoading(true);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all active profiles for the company
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          display_name,
          departments:department_id(name)
        `)
        .eq('company_id', company.id)
        .eq('status', 'active');

      // Get all users who have clocked in today
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('user_id')
        .eq('company_id', company.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());

      const clockedInUserIds = new Set(timeEntries?.map(e => e.user_id) || []);

      // Filter out users who have clocked in
      const unclocked = (allProfiles || []).filter(
        profile => profile.user_id && !clockedInUserIds.has(profile.user_id)
      );

      setUnclockedUsers(unclocked as any);
      setLoading(false);
    };

    fetchUnclockedUsers();
  }, [company?.id, date]);

  const getEmployeeName = (profile: Profile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.display_name || 'Unknown';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Un-Clocked Users
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
          <UserX className="h-5 w-5" />
          Un-Clocked Users
        </CardTitle>
        <CardDescription>
          Employees who haven't clocked in on {format(date, 'MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unclockedUsers.length === 0 ? (
          <div className="text-center py-8">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              All employees have clocked in today!
            </Badge>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant="destructive">
                {unclockedUsers.length} employee{unclockedUsers.length !== 1 ? 's' : ''} not clocked in
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unclockedUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{getEmployeeName(profile)}</TableCell>
                    <TableCell>{(profile.department as any)?.name || 'No Department'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Not Clocked In
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
};
