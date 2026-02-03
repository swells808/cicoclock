import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/constants";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return data?.map((r) => r.role) || [];
    },
    enabled: !!user?.id,
  });

  const isAdmin = roles?.includes("admin") ?? false;
  const isSupervisor = roles?.includes("supervisor") ?? false;
  const isEmployee = roles?.includes("employee") ?? false;
  const isForeman = roles?.includes("foreman") ?? false;
  const isManager = roles?.includes("manager") ?? false;

  const hasRole = (role: UserRole) => roles?.includes(role) ?? false;

  return {
    roles: roles || [],
    isAdmin,
    isSupervisor,
    isEmployee,
    isForeman,
    isManager,
    hasRole,
    isLoading,
  };
};
