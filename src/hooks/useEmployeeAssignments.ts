import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AssignmentCategory = Database["public"]["Enums"]["assignment_category"];

export interface Assignment {
  id: string;
  profile_id: string;
  company_id: string;
  category: AssignmentCategory;
  name: string;
  description: string | null;
  serial_number: string | null;
  assigned_date: string | null;
  return_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AssignmentInput = Omit<Assignment, "id" | "company_id" | "created_at" | "updated_at">;

export const ASSIGNMENT_CATEGORIES: { value: AssignmentCategory; label: string }[] = [
  { value: "tools", label: "Tools" },
  { value: "fleet", label: "Fleet" },
  { value: "tech_assets", label: "Tech Assets" },
  { value: "equipment", label: "Equipment" },
  { value: "cards", label: "Cards" },
];

export const useEmployeeAssignments = (profileId: string | undefined) => {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery({
    queryKey: ["employee-assignments", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("employee_assignments")
        .select("*")
        .eq("profile_id", profileId)
        .order("assigned_date", { ascending: false });

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!profileId,
  });

  const createAssignment = useMutation({
    mutationFn: async (assignment: Omit<AssignmentInput, "profile_id">) => {
      if (!profileId || !company?.id) throw new Error("Missing profile or company");

      const { data, error } = await supabase
        .from("employee_assignments")
        .insert({
          ...assignment,
          profile_id: profileId,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-assignments", profileId] });
      toast.success("Assignment added successfully");
    },
    onError: (error) => {
      console.error("Failed to add assignment:", error);
      toast.error("Failed to add assignment");
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Assignment> & { id: string }) => {
      const { data, error } = await supabase
        .from("employee_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-assignments", profileId] });
      toast.success("Assignment updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update assignment:", error);
      toast.error("Failed to update assignment");
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-assignments", profileId] });
      toast.success("Assignment deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete assignment:", error);
      toast.error("Failed to delete assignment");
    },
  });

  return {
    assignments: assignmentsQuery.data || [],
    loading: assignmentsQuery.isLoading,
    error: assignmentsQuery.error,
    createAssignment: createAssignment.mutate,
    updateAssignment: updateAssignment.mutate,
    deleteAssignment: deleteAssignment.mutate,
    isCreating: createAssignment.isPending,
    isUpdating: updateAssignment.isPending,
    isDeleting: deleteAssignment.isPending,
  };
};
