import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export const useOpenTimeEntries = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["open-time-entries", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          profiles:user_id (
            id,
            user_id,
            display_name,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          projects (
            id,
            name
          )
        `)
        .eq("company_id", company.id)
        .is("end_time", null)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
};

export const useTimeAdjustmentHistory = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["time-adjustment-history", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("admin_time_adjustments")
        .select(`
          *,
          time_entries (
            id,
            start_time
          )
        `)
        .eq("company_id", company.id)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profile info for admin and affected users
      const adminIds = [...new Set(data?.map(d => d.admin_user_id) || [])];
      const affectedIds = [...new Set(data?.map(d => d.affected_user_id) || [])];
      const allUserIds = [...new Set([...adminIds, ...affectedIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(adjustment => ({
        ...adjustment,
        admin_profile: profileMap.get(adjustment.admin_user_id),
        affected_profile: profileMap.get(adjustment.affected_user_id),
      }));
    },
    enabled: !!company?.id,
  });
};

export const useRetroactiveClockout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timeEntryId,
      newEndTime,
      reason,
    }: {
      timeEntryId: string;
      newEndTime: string;
      reason?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("admin-retroactive-clockout", {
        body: {
          time_entry_id: timeEntryId,
          new_end_time: newEndTime,
          reason,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to perform retroactive clockout");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["time-adjustment-history"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast.success("Retroactive clock-out completed successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock out: " + error.message);
    },
  });
};
