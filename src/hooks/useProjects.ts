import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export const useProjects = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["projects", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(*), departments(*)")
        .eq("company_id", company.id)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
};

export const useActiveProjects = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["active-projects", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(*)")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (project: {
      name: string;
      description?: string;
      client_id?: string;
      department_id?: string;
      hourly_rate?: number;
      start_date?: string;
      end_date?: string;
      project_number?: string;
      address?: string;
    }) => {
      if (!company?.id) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...project,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["active-projects"] });
      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      description: string;
      client_id: string;
      department_id: string;
      hourly_rate: number;
      is_active: boolean;
      start_date: string;
      end_date: string;
      project_number: string;
      address: string;
    }>) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["active-projects"] });
      toast.success("Project updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update project: " + error.message);
    },
  });
};
