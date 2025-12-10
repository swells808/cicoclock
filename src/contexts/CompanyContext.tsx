import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Company {
  id: string;
  company_name: string;
  industry?: string;
  website?: string;
  phone: string;
  street_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  company_logo_url?: string;
  departments?: string[];
}

interface CompanyFeatures {
  id: string;
  company_id: string;
  geolocation: boolean;
  employee_pin: boolean;
  photo_capture: boolean;
}

interface CompanyContextType {
  company: Company | null;
  companyFeatures: CompanyFeatures | null;
  loading: boolean;
  error: string | null;
  refetchCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setCompanyFeatures(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile to get company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      // Handle profile not found - self-healing for existing users
      if (profileError?.code === 'PGRST116') {
        console.log('Profile not found, creating minimal profile for user');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0]
          })
          .select('company_id')
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          setCompany(null);
          setCompanyFeatures(null);
          setLoading(false);
          return;
        }

        // Use the newly created profile
        if (!newProfile?.company_id) {
          setCompany(null);
          setCompanyFeatures(null);
          setLoading(false);
          return;
        }
      } else if (profileError) {
        // Handle other profile errors (like RLS issues)
        console.error('Profile fetch error:', profileError);
        setError(`Unable to access profile: ${profileError.message}`);
        setCompany(null);
        setCompanyFeatures(null);
        setLoading(false);
        return;
      }

      if (!profile?.company_id) {
        setCompany(null);
        setCompanyFeatures(null);
        setLoading(false);
        return;
      }

      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) {
        console.error('Company fetch error:', companyError);
        setError(`Unable to access company: ${companyError.message}`);
        setCompany(null);
        setCompanyFeatures(null);
        setLoading(false);
        return;
      }

      // Fetch company features
      const { data: featuresData, error: featuresError } = await supabase
        .from('company_features')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (featuresError && featuresError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is okay for features
        console.warn('Failed to fetch company features:', featuresError.message);
      }

      setCompany(companyData);
      setCompanyFeatures(featuresData || null);
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company data');
      setCompany(null);
      setCompanyFeatures(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const refetchCompany = async () => {
    await fetchCompanyData();
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyFeatures,
        loading,
        error,
        refetchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
