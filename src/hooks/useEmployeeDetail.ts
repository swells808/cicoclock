import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface EmployeeProfile {
  id: string;
  user_id: string | null;
  company_id: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  employee_id: string | null;
  date_of_hire: string | null;
  trade_number: string | null;
  department_id: string | null;
  department_name?: string | null;
  avatar_url: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  pin: string | null;
  created_at: string;
  updated_at: string;
  role?: string;
}

export const useEmployeeDetail = (profileId: string | undefined) => {
  const { company } = useCompany();

  const employeeQuery = useQuery({
    queryKey: ["employee-detail", profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments(name)
        `)
        .eq("id", profileId)
        .maybeSingle();

      if (error) throw error;
      if (!profile) return null;

      // Fetch user role - prioritize profile_id for timeclock-only users
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", profile.id)
        .maybeSingle();

      return {
        ...profile,
        department_name: profile.departments?.name || null,
        role: roleData?.role || "employee",
      } as EmployeeProfile;
    },
    enabled: !!profileId,
  });

  // Fetch all employees for navigation
  const allEmployeesQuery = useQuery({
    queryKey: ["all-employees", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name")
        .eq("company_id", company.id)
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const currentIndex = allEmployeesQuery.data?.findIndex(e => e.id === profileId) ?? -1;
  const totalEmployees = allEmployeesQuery.data?.length ?? 0;
  const previousEmployeeId = currentIndex > 0 ? allEmployeesQuery.data?.[currentIndex - 1]?.id : null;
  const nextEmployeeId = currentIndex < totalEmployees - 1 ? allEmployeesQuery.data?.[currentIndex + 1]?.id : null;

  return {
    employee: employeeQuery.data,
    loading: employeeQuery.isLoading,
    error: employeeQuery.error,
    refetch: employeeQuery.refetch,
    navigation: {
      currentIndex: currentIndex + 1,
      total: totalEmployees,
      previousId: previousEmployeeId,
      nextId: nextEmployeeId,
    },
  };
};
