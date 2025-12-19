import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { startOfDay, endOfDay, parseISO, differenceInMinutes, format } from "date-fns";

export interface TimeEntryWithDetails {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  project_id: string | null;
  project_name?: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  is_break: boolean;
}

export interface DailyTimeEntry {
  date: string;
  entries: TimeEntryWithDetails[];
  totalMinutes: number;
  clockIn: string | null;
  clockOut: string | null;
  isLate: boolean;
  hasNoClockOut: boolean;
}

export interface TimeEntryStats {
  daysWorked: number;
  lateArrivals: number;
  totalHours: number;
  absences: number;
  averageHoursPerDay: number;
}

export const useEmployeeTimeEntries = (
  profileId: string | undefined,
  startDate: Date,
  endDate: Date,
  scheduledStartTime?: string // e.g., "08:00"
) => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["employee-time-entries", profileId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!profileId || !company?.id) {
        return { dailyEntries: [], stats: getEmptyStats() };
      }

      // Get user_id from profile for time entries lookup
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profileId)
        .maybeSingle();

      if (!profile?.user_id) {
        return { dailyEntries: [], stats: getEmptyStats() };
      }

      const { data: entries, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          projects(name)
        `)
        .eq("user_id", profile.user_id)
        .eq("company_id", company.id)
        .gte("start_time", startOfDay(startDate).toISOString())
        .lte("start_time", endOfDay(endDate).toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Group entries by date
      const entriesByDate = new Map<string, TimeEntryWithDetails[]>();
      
      (entries || []).forEach(entry => {
        const dateKey = format(parseISO(entry.start_time), "yyyy-MM-dd");
        const existing = entriesByDate.get(dateKey) || [];
        existing.push({
          ...entry,
          project_name: entry.projects?.name || null,
        });
        entriesByDate.set(dateKey, existing);
      });

      // Build daily entries
      const dailyEntries: DailyTimeEntry[] = [];
      let totalWorkingDays = 0;
      let lateArrivals = 0;
      let totalMinutes = 0;
      
      entriesByDate.forEach((dayEntries, dateKey) => {
        const sortedEntries = dayEntries.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        
        const firstEntry = sortedEntries[0];
        const lastEntry = sortedEntries[sortedEntries.length - 1];
        
        const clockIn = firstEntry?.start_time || null;
        const clockOut = lastEntry?.end_time || null;
        
        // Check if late (comparing against scheduled start time)
        let isLate = false;
        if (clockIn && scheduledStartTime) {
          const clockInTime = format(parseISO(clockIn), "HH:mm");
          isLate = clockInTime > scheduledStartTime;
        }
        
        // Calculate total minutes for the day
        const dayTotalMinutes = dayEntries.reduce((sum, entry) => {
          return sum + (entry.duration_minutes || 0);
        }, 0);
        
        dailyEntries.push({
          date: dateKey,
          entries: sortedEntries,
          totalMinutes: dayTotalMinutes,
          clockIn,
          clockOut,
          isLate,
          hasNoClockOut: !clockOut && dayEntries.some(e => !e.end_time),
        });
        
        totalWorkingDays++;
        if (isLate) lateArrivals++;
        totalMinutes += dayTotalMinutes;
      });

      // Sort by date descending (most recent first)
      dailyEntries.sort((a, b) => b.date.localeCompare(a.date));

      const stats: TimeEntryStats = {
        daysWorked: totalWorkingDays,
        lateArrivals,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        absences: 0, // Would need schedule data to calculate
        averageHoursPerDay: totalWorkingDays > 0 
          ? Math.round((totalMinutes / 60 / totalWorkingDays) * 10) / 10 
          : 0,
      };

      return { dailyEntries, stats };
    },
    enabled: !!profileId && !!company?.id,
  });
};

function getEmptyStats(): TimeEntryStats {
  return {
    daysWorked: 0,
    lateArrivals: 0,
    totalHours: 0,
    absences: 0,
    averageHoursPerDay: 0,
  };
}
