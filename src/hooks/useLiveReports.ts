import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';

export interface ReportMetrics {
  totalHours: number;
  activeProjects: number;
  overtimeHours: number;
}

export interface EmployeeReport {
  id: string;
  name: string;
  hours: number;
}

export interface ProjectReport {
  id: string;
  name: string;
  hours: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export const useLiveReports = () => {
  const { company } = useCompany();
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalHours: 0,
    activeProjects: 0,
    overtimeHours: 0,
  });
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async (dateRange: DateRange) => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(`id, duration_minutes, start_time, end_time, user_id, project_id, projects(id, name)`)
        .eq('company_id', company.id)
        .gte('start_time', dateRange.from.toISOString())
        .lte('start_time', dateRange.to.toISOString());

      // Fetch timecard_allocations for project data on modern entries
      const teIds = (timeEntries || []).map(e => e.id);
      let allocMap: Record<string, { id: string; name: string }[]> = {};
      if (teIds.length > 0) {
        const { data: allocs } = await supabase
          .from('timecard_allocations')
          .select('time_entry_id, project_id, projects:project_id(id, name)')
          .in('time_entry_id', teIds);
        if (allocs) {
          for (const a of allocs) {
            const p = a.projects as any;
            if (!p) continue;
            if (!allocMap[a.time_entry_id]) allocMap[a.time_entry_id] = [];
            if (!allocMap[a.time_entry_id].some(x => x.id === p.id)) {
              allocMap[a.time_entry_id].push({ id: p.id, name: p.name });
            }
          }
        }
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, display_name')
        .eq('company_id', company.id);

      const { data: activeProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', company.id)
        .eq('is_active', true);

      const userProfiles = (profiles || []).reduce((acc: Record<string, any>, p) => {
        if (p.user_id) acc[p.user_id] = p;
        return acc;
      }, {});

      let totalMinutes = 0;
      const employeeHours: Record<string, { id: string; name: string; hours: number }> = {};
      const projectHours: Record<string, { id: string; name: string; hours: number }> = {};

      (timeEntries || []).forEach((entry: any) => {
        let minutes = entry.duration_minutes;
        if (!minutes && entry.start_time) {
          const startTime = new Date(entry.start_time).getTime();
          const endTime = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
          minutes = Math.floor((endTime - startTime) / 1000 / 60);
        }
        totalMinutes += minutes || 0;

        const profile = userProfiles[entry.user_id];
        const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.display_name || 'Unknown';
        if (!employeeHours[entry.user_id]) {
          employeeHours[entry.user_id] = { id: entry.user_id, name, hours: 0 };
        }
        employeeHours[entry.user_id].hours += (minutes || 0) / 60;

        // Use timecard_allocations projects first, fall back to time_entries.projects
        const allocProjects = allocMap[entry.id];
        if (allocProjects && allocProjects.length > 0) {
          const perProjHours = (minutes || 0) / 60 / allocProjects.length;
          for (const proj of allocProjects) {
            if (!projectHours[proj.id]) projectHours[proj.id] = { id: proj.id, name: proj.name, hours: 0 };
            projectHours[proj.id].hours += perProjHours;
          }
        } else if (entry.projects) {
          const project = entry.projects;
          if (!projectHours[project.id]) {
            projectHours[project.id] = { id: project.id, name: project.name, hours: 0 };
          }
          projectHours[project.id].hours += (minutes || 0) / 60;
        }
      });

      setMetrics({
        totalHours: Math.round(totalMinutes / 60),
        activeProjects: activeProjects?.length || 0,
        overtimeHours: Math.max(0, Math.round(totalMinutes / 60) - 160),
      });

      setEmployeeReports(
        Object.values(employeeHours)
          .map((e) => ({ ...e, hours: Math.round(e.hours * 10) / 10 }))
          .sort((a, b) => b.hours - a.hours)
      );

      setProjectReports(
        Object.values(projectHours)
          .map((p) => ({ ...p, hours: Math.round(p.hours * 10) / 10 }))
          .sort((a, b) => b.hours - a.hours)
      );
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  return {
    metrics,
    employeeReports,
    projectReports,
    loading,
    fetchReports,
  };
};

export const getPresetDateRange = (preset: string): DateRange => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: new Date(now.setHours(0, 0, 0, 0)), to: new Date() };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { 
        from: new Date(yesterday.setHours(0, 0, 0, 0)), 
        to: new Date(yesterday.setHours(23, 59, 59, 999)) 
      };
    case 'thisWeek':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'lastWeek':
      const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      return { from: lastWeekStart, to: lastWeekEnd };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'last7Days':
      return { from: subDays(now, 7), to: now };
    case 'last30Days':
      return { from: subDays(now, 30), to: now };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};
