import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDepartmentSchedule, DepartmentScheduleDay } from "@/hooks/useDepartmentSchedule";
import { Save, Loader2, Clock } from "lucide-react";

interface DepartmentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  departmentName: string;
}

export const DepartmentScheduleDialog = ({
  open,
  onOpenChange,
  departmentId,
  departmentName,
}: DepartmentScheduleDialogProps) => {
  const { schedule, loading, saveSchedule, isSaving, dayNames } = useDepartmentSchedule(departmentId);
  const [localSchedule, setLocalSchedule] = useState<DepartmentScheduleDay[]>([]);

  useEffect(() => {
    if (schedule.length > 0) {
      setLocalSchedule(schedule);
    }
  }, [schedule]);

  const handleDayChange = (dayIndex: number, field: keyof DepartmentScheduleDay, value: any) => {
    setLocalSchedule(prev => prev.map((day, i) => 
      i === dayIndex ? { ...day, [field]: value } : day
    ));
  };

  const handleSave = () => {
    saveSchedule(localSchedule, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Default Schedule for {departmentName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Set the default work schedule for employees in this department. This can be applied to individual employees.
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b">
                    <th className="pb-3 font-medium">Day</th>
                    <th className="pb-3 font-medium">Start</th>
                    <th className="pb-3 font-medium">End</th>
                    <th className="pb-3 font-medium text-center">Off</th>
                  </tr>
                </thead>
                <tbody>
                  {localSchedule.map((day, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 font-medium text-foreground text-sm">
                        {dayNames[day.day_of_week]}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="time"
                          value={day.start_time || ""}
                          onChange={(e) => handleDayChange(index, "start_time", e.target.value || null)}
                          disabled={day.is_day_off}
                          className="w-28 h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="time"
                          value={day.end_time || ""}
                          onChange={(e) => handleDayChange(index, "end_time", e.target.value || null)}
                          disabled={day.is_day_off}
                          className="w-28 h-8 text-sm"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <Switch
                          checked={day.is_day_off}
                          onCheckedChange={(checked) => handleDayChange(index, "is_day_off", checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || loading}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
