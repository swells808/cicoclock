import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface Client {
  id: string;
  company_id: string;
  company_name: string;
  contact_person_name?: string;
  contact_person_title?: string;
  phone?: string;
  email?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { company } = useCompany();

  const fetchClients = async () => {
    if (!company?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!company?.id) throw new Error('No company selected');

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      setClients(prev => [...prev, data]);
      toast.success('Client created successfully');
      return data;
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error('Failed to create client');
      throw err;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setClients(prev => prev.map(client => client.id === id ? data : client));
      toast.success('Client updated successfully');
      return data;
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error('Failed to update client');
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      setClients(prev => prev.filter(client => client.id !== id));
      toast.success('Client deleted successfully');
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error('Failed to delete client');
      throw err;
    }
  };

  useEffect(() => {
    fetchClients();
  }, [company?.id]);

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  };
};
