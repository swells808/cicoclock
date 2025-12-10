import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTaskTypes = (companyId?: string) => {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTaskTypes = async () => {
    if (!companyId) {
      console.log('useTaskTypes: No companyId provided');
      setTaskTypes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('useTaskTypes: Fetching task types for company:', companyId);

      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('useTaskTypes: Database error:', error);
        throw error;
      }

      console.log('useTaskTypes: Successfully fetched task types:', data?.length);
      setTaskTypes(data || []);
    } catch (err) {
      console.error('useTaskTypes: Error fetching task types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskTypes();
  }, [companyId]);

  return {
    taskTypes,
    loading,
    error,
    refetch: fetchTaskTypes,
  };
};
