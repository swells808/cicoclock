import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface DepartmentScheduleDay {
  id?: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useDepartmentSchedule = (departmentId: string | undefined) => {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const scheduleQuery = useQuery({
    queryKey: ["department-schedule", departmentId],
    queryFn: async () => {
      if (!departmentId) return getDefaultSchedule();

      const { data, error } = await supabase
        .from("department_schedules")
        .select("*")
        .eq("department_id", departmentId)
        .order("day_of_week", { ascending: true });

      if (error) throw error;

      // Merge with default schedule to ensure all days are present
      const scheduleMap = new Map(data?.map(s => [s.day_of_week, s]));
      
      return Array.from({ length: 7 }, (_, i) => {
        const existing = scheduleMap.get(i);
        return existing ? {
          id: existing.id,
          day_of_week: existing.day_of_week,
          start_time: existing.start_time,
          end_time: existing.end_time,
          is_day_off: existing.is_day_off ?? false,
        } : {
          day_of_week: i,
          start_time: null,
          end_time: null,
          is_day_off: i === 0 || i === 6, // Default weekends off
        };
      });
    },
    enabled: !!departmentId,
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (schedule: DepartmentScheduleDay[]) => {
      if (!departmentId || !company?.id) throw new Error("Missing department or company");

      // Upsert each day's schedule
      for (const day of schedule) {
        const { error } = await supabase
          .from("department_schedules")
          .upsert({
            department_id: departmentId,
            company_id: company.id,
            day_of_week: day.day_of_week,
            start_time: day.is_day_off ? null : day.start_time,
            end_time: day.is_day_off ? null : day.end_time,
            is_day_off: day.is_day_off,
          }, {
            onConflict: "department_id,day_of_week",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-schedule", departmentId] });
      toast.success("Department schedule saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save department schedule:", error);
      toast.error("Failed to save department schedule");
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

function getDefaultSchedule(): DepartmentScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: i > 0 && i < 6 ? "08:00" : null,
    end_time: i > 0 && i < 6 ? "17:00" : null,
    is_day_off: i === 0 || i === 6,
  }));
}
