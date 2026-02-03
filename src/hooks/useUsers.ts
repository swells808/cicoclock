import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  avatar?: string;
  avatar_url?: string;
  department?: string;
  phone?: string;
  projects?: string[];
  hoursLogged?: number;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  user_id: string;
  employeeId?: string;
  pin?: string;
  date_of_hire?: string;
}

export const useUsers = () => {
  const { company } = useCompany();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!company?.id) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch profiles with department names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          departments!profiles_department_id_fkey (
            name
          )
        `)
        .eq('company_id', company.id);

      if (profilesError) throw profilesError;

      // Fetch user roles separately
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, profile_id, role');

      if (rolesError) throw rolesError;

      // Create user roles lookup - prioritize profile_id for CSV/timeclock-only users
      const rolesLookup = (userRoles || []).reduce((acc: Record<string, string>, r: any) => {
        if (r.profile_id) acc[r.profile_id] = r.role;  // Profile-based (for timeclock-only)
        if (r.user_id) acc[r.user_id] = r.role;        // User-based (for auth users)
        return acc;
      }, {});

      // Role display mapping for UI
      const roleDisplayNames: Record<string, string> = {
        'admin': 'Admin',
        'supervisor': 'Manager',
        'employee': 'Employee'
      };

      // Transform profiles to User interface
      const transformedUsers: User[] = (profiles || []).map(profile => {
        // For CSV-imported users, match roles using profile.id; for authenticated users, use profile.user_id
        const roleKey = profile.user_id || profile.id;
        const dbRole = rolesLookup[roleKey] || 'employee';
        return {
          id: profile.id,
          user_id: profile.user_id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name || 'Unknown User',
          email: profile.email || 'N/A',
          role: roleDisplayNames[dbRole] || 'Employee',
          status: profile.status === 'deactivated' ? 'Deactivated' : profile.status === 'inactive' ? 'Inactive' : 'Active',
          lastActive: 'Recently',
          avatar: profile.avatar_url,
          avatar_url: profile.avatar_url,
          department: profile.departments?.name || 'No Department',
          phone: profile.phone,
          projects: [],
          hoursLogged: 0,
          first_name: profile.first_name,
          last_name: profile.last_name,
          display_name: profile.display_name,
          employeeId: profile.employee_id || '',
          pin: profile.pin || '',
          date_of_hire: profile.date_of_hire || undefined,
        };
      });

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [company?.id]);

  const createUser = async (userData: Partial<User>) => {
    if (!company?.id) throw new Error('No company selected');

    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        company_id: company.id,
        display_name: userData.name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        user_id: userData.user_id!,
      }])
      .select()
      .single();

    if (error) throw error;

    await fetchUsers();
    return data;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        display_name: updates.name
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchUsers();
    return data;
  };

  const updateUserStatus = async (id: string, status: 'active' | 'inactive' | 'deactivated') => {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchUsers();
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
  };
};
