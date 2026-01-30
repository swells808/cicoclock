import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export const useTimeEntries = (userId?: string) => {
  const { user } = useAuth();
  const { company } = useCompany();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["time-entries", targetUserId, company?.id],
    queryFn: async () => {
      if (!targetUserId || !company?.id) return [];
      
      // First get the user's profile to also match by profile_id (for PIN-clocked entries)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", targetUserId)
        .single();

      // Query time entries matching either user_id OR profile_id
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, projects(*)")
        .eq("company_id", company.id)
        .or(`user_id.eq.${targetUserId}${profile ? `,profile_id.eq.${profile.id}` : ''}`)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId && !!company?.id,
  });
};

export const useActiveTimeEntry = () => {
  const { user } = useAuth();
  const { company } = useCompany();

  return useQuery({
    queryKey: ["active-time-entry", user?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return null;
      
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, projects(*)")
        .eq("user_id", user.id)
        .eq("company_id", company.id)
        .is("end_time", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!company?.id,
  });
};

export const useClockIn = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async ({ projectId, photoUrl }: { projectId?: string; photoUrl?: string }) => {
      if (!user?.id || !company?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          company_id: company.id,
          project_id: projectId || null,
          start_time: new Date().toISOString(),
          clock_in_photo_url: photoUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      toast.success("Clocked in successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock in: " + error.message);
    },
  });
};

export const useClockOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, photoUrl }: { entryId: string; photoUrl?: string }) => {
      const endTime = new Date();
      
      const { data: entry } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("id", entryId)
        .single();

      const startTime = new Date(entry?.start_time || "");
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          clock_out_photo_url: photoUrl || null,
        })
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-time-entry"] });
      toast.success("Clocked out successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock out: " + error.message);
    },
  });
};
