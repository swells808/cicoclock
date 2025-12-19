import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ScheduleDay {
  id?: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useEmployeeSchedule = (profileId: string | undefined) => {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const scheduleQuery = useQuery({
    queryKey: ["employee-schedule", profileId],
    queryFn: async () => {
      if (!profileId) return getDefaultSchedule();

      const { data, error } = await supabase
        .from("employee_schedules")
        .select("*")
        .eq("profile_id", profileId)
        .order("day_of_week", { ascending: true });

      if (error) throw error;

      // Merge with default schedule to ensure all days are present
      const scheduleMap = new Map(data?.map(s => [s.day_of_week, s]));
      
      return Array.from({ length: 7 }, (_, i) => {
        const existing = scheduleMap.get(i);
        return existing || {
          day_of_week: i,
          start_time: null,
          end_time: null,
          is_day_off: i === 0 || i === 6, // Default weekends off
        };
      });
    },
    enabled: !!profileId,
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (schedule: ScheduleDay[]) => {
      if (!profileId || !company?.id) throw new Error("Missing profile or company");

      // Upsert each day's schedule
      for (const day of schedule) {
        const { error } = await supabase
          .from("employee_schedules")
          .upsert({
            profile_id: profileId,
            company_id: company.id,
            day_of_week: day.day_of_week,
            start_time: day.is_day_off ? null : day.start_time,
            end_time: day.is_day_off ? null : day.end_time,
            is_day_off: day.is_day_off,
          }, {
            onConflict: "profile_id,day_of_week",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedule", profileId] });
      toast.success("Schedule saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save schedule:", error);
      toast.error("Failed to save schedule");
    },
  });

  return {
    schedule: scheduleQuery.data || getDefaultSchedule(),
    loading: scheduleQuery.isLoading,
    error: scheduleQuery.error,
    saveSchedule: saveScheduleMutation.mutate,
    isSaving: saveScheduleMutation.isPending,
    dayNames: DAY_NAMES,
  };
};

function getDefaultSchedule(): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: i > 0 && i < 6 ? "08:00" : null,
    end_time: i > 0 && i < 6 ? "17:00" : null,
    is_day_off: i === 0 || i === 6,
  }));
}
