import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  client_id?: string;
  department_id?: string;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  status?: string;
  budget_per_hour?: number;
  track_overtime?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_hours?: number;
  client?: { company_name: string };
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id?: string;
  company_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  is_break: boolean;
  clock_in_photo_url?: string;
  clock_out_photo_url?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  profile?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface ProjectTask {
  id: string;
  project_id: string;
  name: string;
  assignee_id?: string;
  status?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

export const useProjects = () => {
  const { company } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!company?.id) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(company_name),
          total_hours:time_entries(duration_minutes, start_time, end_time, is_break)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate total hours for each project
      const projectsWithHours = (data || []).map(project => {
        const timeEntries = project.total_hours || [];
        const totalMinutes = timeEntries
          .filter((entry: any) => !entry.is_break)
          .reduce((sum: number, entry: any) => {
            if (entry.duration_minutes) {
              return sum + entry.duration_minutes;
            } else if (entry.start_time && entry.end_time) {
              const startTime = new Date(entry.start_time).getTime();
              const endTime = new Date(entry.end_time).getTime();
              return sum + Math.max(0, (endTime - startTime) / (1000 * 60));
            }
            return sum;
          }, 0);

        return {
          ...project,
          total_hours: Math.round((totalMinutes / 60) * 10) / 10, // Round to 1 decimal place
        };
      });

      setProjects(projectsWithHours);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [company?.id]);

  const createProject = async (projectData: Omit<Project, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!company?.id) throw new Error('No company selected');

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...projectData, company_id: company.id }])
      .select()
      .single();

    if (error) throw error;

    await fetchProjects(); // Refresh the list
    return data;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchProjects(); // Refresh the list
    return data;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchProjects(); // Refresh the list
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};

export const useTimeEntries = () => {
  const { company } = useCompany();
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeEntries = async () => {
    if (!company?.id || !user?.id) {
      setTimeEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch time entries with projects
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*, project:projects(*)')
        .eq('company_id', company.id)
        .order('start_time', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch all profiles for this company to map by user_id
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, display_name')
        .eq('company_id', company.id);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile for efficient lookup
      const profileMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Attach profile data to each time entry by matching user_id
      const dataWithProfiles = entriesData?.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id)
      })) || [];

      setTimeEntries(dataWithProfiles as TimeEntry[]);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch time entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [company?.id, user?.id]);

  const createTimeEntry = async (entryData: Omit<TimeEntry, 'id' | 'user_id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!company?.id || !user?.id) throw new Error('No company or user selected');

    const { data, error } = await supabase
      .from('time_entries')
      .insert([{
        ...entryData,
        user_id: user.id,
        company_id: company.id
      }])
      .select()
      .single();

    if (error) throw error;

    await fetchTimeEntries(); // Refresh the list
    return data;
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchTimeEntries(); // Refresh the list
    return data;
  };

  const deleteTimeEntry = async (id: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchTimeEntries(); // Refresh the list
  };

  return {
    timeEntries,
    loading,
    error,
    refetch: fetchTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  };
};

export const useProjectTasks = (projectId?: string) => {
  const { company } = useCompany();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectTasks = async () => {
    if (!company?.id || !projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          assignee:profiles!assignee_id(first_name, last_name, display_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching project tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch project tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectTasks();
  }, [company?.id, projectId]);

  const createTask = async (taskData: {
    project_id: string;
    name: string;
    status: string;
    assignee_id: string | null;
    due_date: string | null;
  }) => {
    if (!company?.id) throw new Error('No company found');

    const { error } = await supabase
      .from('project_tasks')
      .insert([taskData]);

    if (error) throw error;
    await fetchProjectTasks(); // Refresh the tasks
  };

  const updateTask = async (taskId: string, updates: Partial<{
    name: string;
    status: string;
    assignee_id: string | null;
    due_date: string | null;
  }>) => {
    const { error } = await supabase
      .from('project_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;
    await fetchProjectTasks(); // Refresh the tasks
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    await fetchProjectTasks(); // Refresh the tasks
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchProjectTasks,
    createTask,
    updateTask,
    deleteTask,
  };
};
