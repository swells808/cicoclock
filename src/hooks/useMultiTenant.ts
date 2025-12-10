import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

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
    await fetchProjectTasks();
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
    await fetchProjectTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    await fetchProjectTasks();
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
