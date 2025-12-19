import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type TimeOffType = Database["public"]["Enums"]["time_off_type"];
type TimeOffStatus = Database["public"]["Enums"]["time_off_status"];

export interface TimeOffRequest {
  id: string;
  profile_id: string;
  company_id: string;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  hours_requested: number | null;
  reason: string | null;
  status: TimeOffStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeOffRequestInput = {
  type: TimeOffType;
  start_date: string;
  end_date: string;
  hours_requested?: number | null;
  reason?: string | null;
};

export const TIME_OFF_TYPES: { value: TimeOffType; label: string }[] = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal" },
  { value: "bereavement", label: "Bereavement" },
  { value: "other", label: "Other" },
];

export const useTimeOffRequests = (profileId: string | undefined) => {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["time-off-requests", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TimeOffRequest[];
    },
    enabled: !!profileId,
  });

  const createRequest = useMutation({
    mutationFn: async (request: TimeOffRequestInput) => {
      if (!profileId || !company?.id) throw new Error("Missing profile or company");

      const { data, error } = await supabase
        .from("time_off_requests")
        .insert({
          ...request,
          profile_id: profileId,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests", profileId] });
      toast.success("Time off request submitted");
    },
    onError: (error) => {
      console.error("Failed to submit request:", error);
      toast.error("Failed to submit time off request");
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TimeOffStatus }) => {
      // Get reviewer profile id
      const { data: reviewerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("time_off_requests")
        .update({
          status,
          reviewed_by: reviewerProfile?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests", profileId] });
      toast.success(`Request ${variables.status}`);
    },
    onError: (error) => {
      console.error("Failed to update request:", error);
      toast.error("Failed to update request");
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("time_off_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-off-requests", profileId] });
      toast.success("Request deleted");
    },
    onError: (error) => {
      console.error("Failed to delete request:", error);
      toast.error("Failed to delete request");
    },
  });

  return {
    requests: requestsQuery.data || [],
    loading: requestsQuery.isLoading,
    error: requestsQuery.error,
    createRequest: createRequest.mutate,
    updateRequestStatus: updateRequestStatus.mutate,
    deleteRequest: deleteRequest.mutate,
    isCreating: createRequest.isPending,
    isUpdating: updateRequestStatus.isPending,
  };
};
