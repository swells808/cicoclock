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

export interface ScheduleResult {
  schedule: ScheduleDay[];
  isCustom: boolean;
  source: "employee" | "department" | "default";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const useEmployeeSchedule = (profileId: string | undefined, departmentId?: string | null) => {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const scheduleQuery = useQuery({
    queryKey: ["employee-schedule", profileId, departmentId],
    queryFn: async (): Promise<ScheduleResult> => {
      if (!profileId) {
        return { schedule: getDefaultSchedule(), isCustom: false, source: "default" };
      }

      // 1. Check for employee's own custom schedule
      const { data: employeeSchedule, error: empError } = await supabase
        .from("employee_schedules")
        .select("*")
        .eq("profile_id", profileId)
        .order("day_of_week", { ascending: true });

      if (empError) throw empError;

      // If employee has a custom schedule saved, use it
      if (employeeSchedule && employeeSchedule.length > 0) {
        const scheduleMap = new Map(employeeSchedule.map(s => [s.day_of_week, s]));
        const mergedSchedule = Array.from({ length: 7 }, (_, i) => {
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
            is_day_off: i === 0 || i === 6,
          };
        });
        return { schedule: mergedSchedule, isCustom: true, source: "employee" };
      }

      // 2. Otherwise, check department schedule
      if (departmentId) {
        const { data: deptSchedule, error: deptError } = await supabase
          .from("department_schedules")
          .select("*")
          .eq("department_id", departmentId)
          .order("day_of_week", { ascending: true });

        if (deptError) throw deptError;

        if (deptSchedule && deptSchedule.length > 0) {
          const scheduleMap = new Map(deptSchedule.map(s => [s.day_of_week, s]));
          const mergedSchedule = Array.from({ length: 7 }, (_, i) => {
            const existing = scheduleMap.get(i);
            return existing ? {
              day_of_week: existing.day_of_week,
              start_time: existing.start_time,
              end_time: existing.end_time,
              is_day_off: existing.is_day_off ?? false,
            } : {
              day_of_week: i,
              start_time: null,
              end_time: null,
              is_day_off: i === 0 || i === 6,
            };
          });
          return { schedule: mergedSchedule, isCustom: false, source: "department" };
        }
      }

      // 3. Fall back to generic default
      return { schedule: getDefaultSchedule(), isCustom: false, source: "default" };
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
      queryClient.invalidateQueries({ queryKey: ["employee-schedule", profileId, departmentId] });
      toast.success("Schedule saved successfully");
    },
    onError: (error) => {
      console.error("Failed to save schedule:", error);
      toast.error("Failed to save schedule");
    },
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Missing profile");

      // Delete all custom schedule entries for this employee
      const { error } = await supabase
        .from("employee_schedules")
        .delete()
        .eq("profile_id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedule", profileId, departmentId] });
      toast.success("Reset to department default schedule");
    },
    onError: (error) => {
      console.error("Failed to reset schedule:", error);
      toast.error("Failed to reset schedule");
    },
  });

  const result = scheduleQuery.data || { schedule: getDefaultSchedule(), isCustom: false, source: "default" as const };

  return {
    schedule: result.schedule,
    isCustom: result.isCustom,
    source: result.source,
    loading: scheduleQuery.isLoading,
    error: scheduleQuery.error,
    saveSchedule: saveScheduleMutation.mutate,
    isSaving: saveScheduleMutation.isPending,
    resetToDefault: resetToDefaultMutation.mutate,
    isResetting: resetToDefaultMutation.isPending,
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
