import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type OvertimeStatus = Database["public"]["Enums"]["overtime_status"];

export interface OvertimeEntry {
  id: string;
  profile_id: string;
  company_id: string;
  time_entry_id: string | null;
  date: string;
  hours: number;
  reason: string | null;
  status: OvertimeStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OvertimeEntryInput = {
  date: string;
  hours: number;
  reason?: string | null;
  time_entry_id?: string | null;
};

export const useOvertimeEntries = (profileId: string | undefined) => {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["overtime-entries", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("overtime_entries")
        .select("*")
        .eq("profile_id", profileId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as OvertimeEntry[];
    },
    enabled: !!profileId,
  });

  const createEntry = useMutation({
    mutationFn: async (entry: OvertimeEntryInput) => {
      if (!profileId || !company?.id) throw new Error("Missing profile or company");

      const { data, error } = await supabase
        .from("overtime_entries")
        .insert({
          ...entry,
          profile_id: profileId,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries", profileId] });
      toast.success("Overtime entry added");
    },
    onError: (error) => {
      console.error("Failed to add overtime:", error);
      toast.error("Failed to add overtime entry");
    },
  });

  const updateEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OvertimeStatus }) => {
      // Get approver profile id
      const { data: approverProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("overtime_entries")
        .update({
          status,
          approved_by: approverProfile?.id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries", profileId] });
      toast.success(`Overtime ${variables.status}`);
    },
    onError: (error) => {
      console.error("Failed to update overtime:", error);
      toast.error("Failed to update overtime");
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("overtime_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime-entries", profileId] });
      toast.success("Overtime entry deleted");
    },
    onError: (error) => {
      console.error("Failed to delete overtime:", error);
      toast.error("Failed to delete overtime entry");
    },
  });

  return {
    entries: entriesQuery.data || [],
    loading: entriesQuery.isLoading,
    error: entriesQuery.error,
    createEntry: createEntry.mutate,
    updateEntryStatus: updateEntryStatus.mutate,
    deleteEntry: deleteEntry.mutate,
    isCreating: createEntry.isPending,
    isUpdating: updateEntryStatus.isPending,
  };
};
