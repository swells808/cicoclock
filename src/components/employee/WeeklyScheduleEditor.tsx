import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEmployeeSchedule, ScheduleDay } from "@/hooks/useEmployeeSchedule";
import { Save, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface WeeklyScheduleEditorProps {
  profileId: string;
}

export const WeeklyScheduleEditor = ({ profileId }: WeeklyScheduleEditorProps) => {
  const { schedule, loading, saveSchedule, isSaving, dayNames } = useEmployeeSchedule(profileId);
  const { isAdmin, isSupervisor } = useUserRole();
  const canEdit = isAdmin || isSupervisor;

  const [localSchedule, setLocalSchedule] = useState<ScheduleDay[]>(schedule);

  // Update local state when data loads
  if (!loading && schedule.length > 0 && localSchedule.length === 0) {
    setLocalSchedule(schedule);
  }

  const handleDayChange = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
    setLocalSchedule(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, [field]: value } : day
    ));
  };

  const handleSave = () => {
    saveSchedule(localSchedule);
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading schedule...</div>;
  }

  return (
    <div className="space-y-4">
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
