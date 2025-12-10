import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface ReportMetrics {
  totalHours: number;
  totalHoursChange: number;
  activeProjects: number;
  activeProjectsChange: number;
  overtimeHours: number;
  overtimeHoursChange: number;
}

export interface EmployeeReport {
  name: string;
  week: number;
  month: number;
  userId: string;
  departmentId?: string;
}

export interface ProjectReport {
  name: string;
  week: number;
  month: number;
  projectId: string;
  status?: string;
}

export const useReports = (startDate?: Date, endDate?: Date) => {
  const { company } = useCompany();
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalHours: 0,
    totalHoursChange: 0,
    activeProjects: 0,
    activeProjectsChange: 0,
    overtimeHours: 0,
    overtimeHoursChange: 0,
  });
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const currentMonth = new Date();
      const start = startDate || new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = endDate || new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const { data: rawTimeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          duration_minutes,
          start_time,
          end_time,
          user_id,
          clock_in_photo_url,
          clock_out_photo_url,
          projects(id, name, status)
        `)
        .eq('company_id', company.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      if (timeError) throw timeError;

      const timeEntries = rawTimeEntries?.map(entry => {
        let minutes = entry.duration_minutes;
        if (!minutes && entry.start_time) {
          const startTime = new Date(entry.start_time).getTime();
          const endTime = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
          minutes = Math.floor((endTime - startTime) / 1000 / 60);
        }
        return { ...entry, calculated_minutes: minutes || 0 };
      }) || [];

      const totalMinutes = timeEntries?.reduce((sum, entry: any) => {
        return sum + (entry.calculated_minutes || 0);
      }, 0) || 0;
      const totalHours = Math.round(totalMinutes / 60);

      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (projectsError) throw projectsError;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, department_id')
        .eq('company_id', company.id);

      const userProfiles = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      const employeeHours = timeEntries?.reduce((acc, entry: any) => {
        const profile = userProfiles[entry.user_id];
        const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                    profile?.display_name ||
                    'Unknown User';

        const hours = entry.calculated_minutes / 60;

        const userId = entry.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            name,
            week: 0,
            month: 0,
            userId,
            departmentId: profile?.department_id
          };
        }
        acc[userId].month += hours;

        const entryDate = new Date(entry.start_time);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (entryDate >= weekAgo) {
          acc[userId].week += hours;
        }

        return acc;
      }, {} as Record<string, EmployeeReport & { name: string }>) || {};

      const employeeReportData: EmployeeReport[] = Object.values(employeeHours)
        .map(data => ({
          name: data.name,
          week: Math.round(data.week),
          month: Math.round(data.month),
          userId: data.userId,
          departmentId: data.departmentId,
        }))
        .sort((a, b) => b.month - a.month);

      const projectHours = timeEntries?.reduce((acc, entry: any) => {
        const project = entry.projects;
        if (!project) return acc;

        const projectId = project.id;
        const projectName = project.name || 'No Project';
        const projectStatus = project.status;

        const hours = entry.calculated_minutes / 60;

        if (!acc[projectId]) {
          acc[projectId] = {
            name: projectName,
            week: 0,
            month: 0,
            projectId,
            status: projectStatus
          };
        }
        acc[projectId].month += hours;

        const entryDate = new Date(entry.start_time);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (entryDate >= weekAgo) {
          acc[projectId].week += hours;
        }

        return acc;
      }, {} as Record<string, ProjectReport & { name: string }>) || {};

      const projectReportData: ProjectReport[] = Object.values(projectHours)
        .map(data => ({
          name: data.name,
          week: Math.round(data.week),
          month: Math.round(data.month),
          projectId: data.projectId,
          status: data.status,
        }))
        .sort((a, b) => b.month - a.month);

      setMetrics({
        totalHours,
        totalHoursChange: 12,
        activeProjects: activeProjects?.length || 0,
        activeProjectsChange: 3,
        overtimeHours: Math.max(0, totalHours - (40 * 4)),
        overtimeHoursChange: 2,
      });

      setEmployeeReports(employeeReportData);
      setProjectReports(projectReportData);

    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [company?.id, startDate, endDate]);

  return {
    metrics,
    employeeReports,
    projectReports,
    loading,
    error,
    refetch: fetchReports,
  };
};
