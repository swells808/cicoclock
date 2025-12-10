import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface TaskActivity {
  id: string;
  user_id: string;
  profile_id: string;
  task_id: string;
  project_id: string;
  company_id: string;
  time_entry_id: string;
  task_type_id: string;
  action_type: 'start' | 'finish';
  timestamp: string;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    first_name: string;
    last_name: string;
    display_name: string;
  };
  project?: {
    name: string;
  };
  task_type?: {
    name: string;
    code: string;
  };
}

export interface TaskActivityFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  projectId?: string;
  taskTypeId?: string;
}

export const useTaskActivities = (filters?: TaskActivityFilters) => {
  const [taskActivities, setTaskActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useCompany();

  const fetchTaskActivities = async () => {
    if (!company?.id) {
      console.log('[useTaskActivities] No company ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useTaskActivities] Fetching with:', {
        companyId: company.id,
        startDate: filters?.startDate?.toISOString(),
        startDateUTC: filters?.startDate ? new Date(filters.startDate).toUTCString() : null,
        filters
      });

      let query = supabase
        .from('task_activities')
        .select(`
          *,
          profile:profile_id(first_name, last_name, display_name),
          project:project_id(name),
          task_type:task_type_id(name, code)
        `)
        .eq('company_id', company.id)
        .order('timestamp', { ascending: false });

      // Apply filters - Use date-only comparison for startDate to avoid timezone issues
      if (filters?.startDate) {
        const startDateStr = filters.startDate.toISOString().split('T')[0];
        console.log('[useTaskActivities] Filtering by date:', startDateStr);
        query = query.gte('timestamp', startDateStr);
      }
      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.taskTypeId) {
        query = query.eq('task_type_id', filters.taskTypeId);
      }

      const { data, error: fetchError } = await query;

      console.log('[useTaskActivities] Query result:', {
        dataCount: data?.length || 0,
        error: fetchError,
        sampleData: data?.[0]
      });

      if (fetchError) throw fetchError;

      // Transform the data to handle profile as a single object instead of array
      const transformedData = ((data as any) || []).map((activity: any) => ({
        ...activity,
        profile: Array.isArray(activity.profile) ? activity.profile[0] : activity.profile
      }));

      setTaskActivities(transformedData);
    } catch (err) {
      console.error('[useTaskActivities] Error fetching task activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch task activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskActivities();
    // Use stringified filters to ensure stable comparison
  }, [
    company?.id,
    filters?.startDate?.toISOString(),
    filters?.endDate?.toISOString(),
    filters?.userId,
    filters?.projectId,
    filters?.taskTypeId
  ]);

  return {
    taskActivities,
    loading,
    error,
    refetch: fetchTaskActivities
  };
};
