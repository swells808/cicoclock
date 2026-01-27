import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FaceVerification = Database["public"]["Tables"]["face_verifications"]["Row"];

export const useFaceVerifications = (entryIds: string[], enabled: boolean) => {
  return useQuery({
    queryKey: ["face-verifications", entryIds],
    queryFn: async () => {
      if (!entryIds.length) return new Map<string, FaceVerification>();

      const { data, error } = await supabase
        .from("face_verifications")
        .select("*")
        .in("time_entry_id", entryIds);

      if (error) throw error;

      const map = new Map<string, FaceVerification>();
      (data || []).forEach((v) => {
        const existing = map.get(v.time_entry_id);
        if (!existing) {
          map.set(v.time_entry_id, v);
        } else {
          // Keep the one with is_match = false (worst case); if both same, keep latest
          if (v.is_match === false && existing.is_match !== false) {
            map.set(v.time_entry_id, v);
          } else if (existing.is_match === v.is_match && v.created_at > existing.created_at) {
            map.set(v.time_entry_id, v);
          }
        }
      });

      return map;
    },
    enabled: enabled && entryIds.length > 0,
  });
};

export const useFlaggedCount = (companyId: string | undefined, enabled: boolean) => {
  return useQuery({
    queryKey: ["flagged-count", companyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("face_verifications")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .eq("is_match", false)
        .is("review_decision", null);

      if (error) throw error;
      return count || 0;
    },
    enabled: enabled && !!companyId,
  });
};
