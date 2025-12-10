import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useCompany();

  const fetchDepartments = async () => {
    if (!company?.id) {
      setDepartments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (departmentData: Omit<Department, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!company?.id) throw new Error('No company selected');

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          ...departmentData,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      setDepartments(prev => [...prev, data]);
      toast.success('Department created successfully');
      return data;
    } catch (err) {
      console.error('Error creating department:', err);
      toast.error('Failed to create department');
      throw err;
    }
  };

  const updateDepartment = async (id: string, updates: Partial<Department>) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setDepartments(prev => prev.map(dept => dept.id === id ? data : dept));
      toast.success('Department updated successfully');
      return data;
    } catch (err) {
      console.error('Error updating department:', err);
      toast.error('Failed to update department');
      throw err;
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      setDepartments(prev => prev.filter(dept => dept.id !== id));
      toast.success('Department deleted successfully');
    } catch (err) {
      console.error('Error deleting department:', err);
      toast.error('Failed to delete department');
      throw err;
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [company?.id]);

  const refetch = () => {
    fetchDepartments();
  };

  return {
    departments,
    loading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    refetch,
  };
};
