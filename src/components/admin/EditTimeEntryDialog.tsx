import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  profiles: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface EditTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntry | null;
  onSuccess: () => void;
}

export const EditTimeEntryDialog: React.FC<EditTimeEntryDialogProps> = ({
  open,
  onOpenChange,
  entry,
  onSuccess,
}) => {
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      const start = new Date(entry.start_time);
      setStartDate(format(start, "yyyy-MM-dd"));
      setStartTime(format(start, "HH:mm"));
      
      if (entry.end_time) {
        const end = new Date(entry.end_time);
        setEndDate(format(end, "yyyy-MM-dd"));
        setEndTime(format(end, "HH:mm"));
      } else {
        setEndDate("");
        setEndTime("");
      }
      setReason("");
    }
  }, [entry]);

  const getDisplayName = () => {
    if (!entry?.profiles) return "Unknown User";
    if (entry.profiles.display_name) return entry.profiles.display_name;
    if (entry.profiles.first_name || entry.profiles.last_name) {
      return `${entry.profiles.first_name || ""} ${entry.profiles.last_name || ""}`.trim();
    }
    return entry.profiles.email || "Unknown User";
  };

  const handleSave = async () => {
    if (!entry || !startDate) return;

    setIsLoading(true);
    try {
      const [startHours, startMins] = startTime.split(":").map(Number);
      const newStartTime = new Date(startDate + "T00:00:00");
      newStartTime.setHours(startHours, startMins, 0, 0);

      let newEndTime: Date | null = null;

      if (endDate && endTime) {
        const [endHours, endMins] = endTime.split(":").map(Number);
        newEndTime = new Date(endDate + "T00:00:00");
        newEndTime.setHours(endHours, endMins, 0, 0);
      }

      // Use the edge function for time entry edits
      const response = await supabase.functions.invoke("admin-retroactive-clockout", {
        body: {
          time_entry_id: entry.id,
          new_start_time: newStartTime.toISOString(),
          new_end_time: newEndTime?.toISOString() || new Date().toISOString(),
          reason,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update time entry");
      }

      toast.success("Time entry updated successfully");
      onSuccess();
    } catch (error) {
      toast.error("Failed to update: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Time Entry</DialogTitle>
          <DialogDescription>
            Modify the time entry for {getDisplayName()}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Start Time Section */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Clock In</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={todayStr}
              />
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* End Time Section */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Clock Out</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                max={todayStr}
              />
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="pl-10"
                  placeholder="--:--"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-foreground font-medium">
              Reason for Adjustment
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this time adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !startDate}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
