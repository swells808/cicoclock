import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface Employee {
  id: string;
  user_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  pin: string | null;
  avatar_url: string | null;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useCompany();

  const fetchEmployees = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all active users in the company
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          pin,
          avatar_url
        `)
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('display_name', { ascending: true });

      if (fetchError) throw fetchError;

      setEmployees(data || []);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [company?.id]);

  const authenticatePin = async (employeeId: string, pin: string): Promise<boolean> => {
    if (!company?.id) return false;

    try {
      // Use the authenticate-pin edge function which verifies PIN for the company
      const { data, error } = await supabase.functions.invoke('authenticate-pin', {
        body: {
          company_id: company.id,
          pin,
        },
      });

      if (error) throw error;

      // Check if the authenticated user matches the selected employee
      return data?.success === true && data?.user?.profile_id === employeeId;
    } catch (err) {
      console.error('PIN authentication error:', err);
      return false;
    }
  };

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    authenticatePin,
  };
};
