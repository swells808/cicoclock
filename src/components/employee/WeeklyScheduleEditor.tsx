import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useEmployeeSchedule, ScheduleDay } from "@/hooks/useEmployeeSchedule";
import { Save, Loader2, RotateCcw, Building2, User } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface WeeklyScheduleEditorProps {
  profileId: string;
}

export const WeeklyScheduleEditor = ({ profileId }: WeeklyScheduleEditorProps) => {
  const { isAdmin, isSupervisor } = useUserRole();
  const canEdit = isAdmin || isSupervisor;

  // Fetch employee's department
  const { data: employeeProfile } = useQuery({
    queryKey: ["employee-profile-department", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("department_id, departments(name)")
        .eq("id", profileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const departmentId = employeeProfile?.department_id;
  const departmentName = (employeeProfile as any)?.departments?.name;

  const { 
    schedule, 
    loading, 
    saveSchedule, 
    isSaving, 
    dayNames,
    isCustom,
    source,
    resetToDefault,
    isResetting
  } = useEmployeeSchedule(profileId, departmentId);

  const [localSchedule, setLocalSchedule] = useState<ScheduleDay[]>(schedule);

  // Update local state when data loads
  useEffect(() => {
    if (!loading && schedule.length > 0) {
      setLocalSchedule(schedule);
    }
  }, [loading, schedule]);

  const handleDayChange = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
    setLocalSchedule(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, [field]: value } : day
    ));
  };

  const handleResetToDefault = () => {
    resetToDefault();
  };

  const handleSave = () => {
    saveSchedule(localSchedule);
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading schedule...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Schedule source indicator */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          {source === "department" && (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Using <span className="font-medium text-foreground">{departmentName || "department"}</span> default schedule
              </span>
              <Badge variant="secondary" className="ml-2">Inherited</Badge>
            </>
          )}
          {source === "employee" && (
            <>
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Custom schedule</span>
              <Badge variant="outline" className="ml-2">Custom</Badge>
            </>
          )}
          {source === "default" && (
            <>
              <span className="text-sm text-muted-foreground">
                {departmentId 
                  ? "No department schedule configured. Using system default."
                  : "No department assigned. Using system default."}
              </span>
            </>
          )}
        </div>

        {canEdit && isCustom && departmentId && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetToDefault}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reset to Department Default
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="text-left text-sm text-muted-foreground border-b">
              <th className="pb-3 font-medium">Day</th>
              <th className="pb-3 font-medium">Start Time</th>
              <th className="pb-3 font-medium">End Time</th>
              <th className="pb-3 font-medium text-center">Day Off</th>
            </tr>
          </thead>
          <tbody>
            {localSchedule.map((day, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className="py-3 font-medium text-foreground">
                  {dayNames[day.day_of_week]}
                </td>
                <td className="py-3 pr-2">
                  <Input
                    type="time"
                    value={day.start_time || ""}
                    onChange={(e) => handleDayChange(index, "start_time", e.target.value || null)}
                    disabled={day.is_day_off || !canEdit}
                    className="w-32"
                  />
                </td>
                <td className="py-3 pr-2">
                  <Input
                    type="time"
                    value={day.end_time || ""}
                    onChange={(e) => handleDayChange(index, "end_time", e.target.value || null)}
                    disabled={day.is_day_off || !canEdit}
                    className="w-32"
                  />
                </td>
                <td className="py-3 text-center">
                  <Switch
                    checked={day.is_day_off}
                    onCheckedChange={(checked) => handleDayChange(index, "is_day_off", checked)}
                    disabled={!canEdit}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Schedule
          </Button>
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Only supervisors and admins can edit schedules.
        </p>
      )}
    </div>
  );
};
