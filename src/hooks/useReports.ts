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
  odId: string;
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
          id,
          duration_minutes,
          start_time,
          end_time,
          user_id,
          profile_id,
          clock_in_photo_url,
          clock_out_photo_url,
          project_id,
          projects(id, name, status)
        `)
        .eq('company_id', company.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      if (timeError) throw timeError;

      // Fetch timecard_allocations to get project data for modern entries
      const timeEntryIds = rawTimeEntries?.map(e => e.id).filter(Boolean) || [];
      let allocationsMap: Record<string, { projectId: string; projectName: string; projectStatus?: string }[]> = {};
      
      if (timeEntryIds.length > 0) {
        const { data: allocations } = await supabase
          .from('timecard_allocations')
          .select('time_entry_id, project_id, projects:project_id(id, name, status)')
          .in('time_entry_id', timeEntryIds);

        if (allocations) {
          for (const alloc of allocations) {
            const proj = alloc.projects as any;
            if (!proj) continue;
            if (!allocationsMap[alloc.time_entry_id]) {
              allocationsMap[alloc.time_entry_id] = [];
            }
            // Avoid duplicate projects per time entry
            if (!allocationsMap[alloc.time_entry_id].some(p => p.projectId === proj.id)) {
              allocationsMap[alloc.time_entry_id].push({
                projectId: proj.id,
                projectName: proj.name,
                projectStatus: proj.status,
              });
            }
          }
        }
      }

      // Calculate minutes for each entry, prorating entries that span multiple days
      const timeEntries = rawTimeEntries?.map(entry => {
        const entryStart = new Date(entry.start_time).getTime();
        const entryEnd = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
        
        // Clamp to the report's date range to prorate multi-day entries
        const rangeStart = start.getTime();
        const rangeEnd = end.getTime();
        
        const effectiveStart = Math.max(entryStart, rangeStart);
        const effectiveEnd = Math.min(entryEnd, rangeEnd);
        
        // Calculate only the minutes within the date range
        const minutes = effectiveStart < effectiveEnd 
          ? Math.floor((effectiveEnd - effectiveStart) / 1000 / 60)
          : 0;
        
        return { ...entry, calculated_minutes: minutes };
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
        .select('id, user_id, display_name, first_name, last_name, department_id')
        .eq('company_id', company.id);

      // Build profile lookup map using profile id as key (for profile_id lookups)
      // Also index by user_id for backwards compatibility
      const userProfiles = profiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        if (profile.user_id) {
          acc[profile.user_id] = profile;
        }
        return acc;
      }, {} as Record<string, any>) || {};

      const employeeHours = timeEntries?.reduce((acc, entry: any) => {
        // Look up profile by profile_id first, fall back to user_id
        const profile = entry.profile_id 
          ? userProfiles[entry.profile_id] 
          : userProfiles[entry.user_id];
        const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                    profile?.display_name ||
                    'Unknown User';

        const hours = entry.calculated_minutes / 60;

        // Use profile_id or user_id as grouping key
        const entryKey = entry.profile_id || entry.user_id || 'unknown';
        if (!acc[entryKey]) {
          acc[entryKey] = {
            name,
            week: 0,
            month: 0,
            odId: entryKey,
            departmentId: profile?.department_id
          };
        }
        acc[entryKey].month += hours;

        const entryDate = new Date(entry.start_time);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (entryDate >= weekAgo) {
          acc[entryKey].week += hours;
        }

        return acc;
      }, {} as Record<string, EmployeeReport & { name: string }>) || {};

      const employeeReportData: EmployeeReport[] = Object.values(employeeHours)
        .map(data => ({
          name: data.name,
          week: Math.round(data.week),
          month: Math.round(data.month),
          odId: data.odId,
          departmentId: data.departmentId,
        }))
        .sort((a, b) => b.month - a.month);

      const projectHours = timeEntries?.reduce((acc, entry: any) => {
        const hours = entry.calculated_minutes / 60;
        const entryDate = new Date(entry.start_time);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const isThisWeek = entryDate >= weekAgo;

        // Use timecard_allocations projects first, fall back to time_entries.projects
        const allocProjects = allocationsMap[entry.id];
        if (allocProjects && allocProjects.length > 0) {
          // Split hours evenly across allocated projects
          const perProjectHours = hours / allocProjects.length;
          for (const proj of allocProjects) {
            if (!acc[proj.projectId]) {
              acc[proj.projectId] = { name: proj.projectName, week: 0, month: 0, projectId: proj.projectId, status: proj.projectStatus };
            }
            acc[proj.projectId].month += perProjectHours;
            if (isThisWeek) acc[proj.projectId].week += perProjectHours;
          }
        } else {
          const project = entry.projects;
          if (!project) return acc;
          if (!acc[project.id]) {
            acc[project.id] = { name: project.name || 'No Project', week: 0, month: 0, projectId: project.id, status: project.status };
          }
          acc[project.id].month += hours;
          if (isThisWeek) acc[project.id].week += hours;
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
