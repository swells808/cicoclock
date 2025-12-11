import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ProjectTaskWithDetails {
  id: string;
  name: string;
  status: string | null;
  due_date: string | null;
  project_id: string;
  assignee_id: string | null;
  created_at: string;
  project: {
    id: string;
    name: string;
  } | null;
  assignee: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  } | null;
}

export const useAllProjectTasks = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["all-project-tasks", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          id,
          name,
          status,
          due_date,
          project_id,
          assignee_id,
          created_at,
          project:projects!inner(id, name, company_id),
          assignee:profiles(id, email, first_name, last_name, display_name)
        `)
        .eq("project.company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as unknown as ProjectTaskWithDetails[];
    },
    enabled: !!company?.id,
  });
};
