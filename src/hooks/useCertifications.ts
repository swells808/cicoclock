import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface Certification {
  id: string;
  profile_id: string;
  company_id: string;
  cert_code: string;
  cert_name: string;
  issue_date: string | null;
  expiry_date?: string;
  certifier_name: string | null;
  cert_number: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useCertifications = (profileId?: string) => {
  const { company } = useCompany();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCertifications = async () => {
    if (!company?.id || !profileId) {
      setCertifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_certifications')
        .select('*')
        .eq('profile_id', profileId)
        .eq('company_id', company.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      setCertifications(data || []);
    } catch (err) {
      console.error('Error fetching certifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch certifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, [company?.id, profileId]);

  const createCertification = async (certificationData: Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'status'>) => {
    if (!company?.id) throw new Error('No company selected');
    if (!profileId) throw new Error('No profile selected');

    const status = certificationData.expiry_date
      ? (new Date(certificationData.expiry_date) < new Date() ? 'Expired' : 'Active')
      : 'Active';

    const { data, error } = await supabase
      .from('user_certifications')
      .insert([{
        ...certificationData,
        profile_id: profileId,
        company_id: company.id,
        status
      }])
      .select()
      .single();

    if (error) throw error;

    await fetchCertifications();
    return data;
  };

  const updateCertification = async (id: string, updates: Partial<Certification>) => {
    if (updates.expiry_date !== undefined) {
      updates.status = updates.expiry_date
        ? (new Date(updates.expiry_date) < new Date() ? 'Expired' : 'Active')
        : 'Active';
    }

    const { data, error } = await supabase
      .from('user_certifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchCertifications();
    return data;
  };

  const deleteCertification = async (id: string) => {
    const { error } = await supabase
      .from('user_certifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchCertifications();
  };

  return {
    certifications,
    loading,
    error,
    refetch: fetchCertifications,
    createCertification,
    updateCertification,
    deleteCertification,
  };
};
