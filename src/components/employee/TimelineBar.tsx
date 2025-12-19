import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { DailyTimeEntry } from "@/hooks/useEmployeeTimeEntries";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface TimelineBarProps {
  dailyEntry: DailyTimeEntry;
}

export const TimelineBar = ({ dailyEntry }: TimelineBarProps) => {
  const { date, clockIn, clockOut, totalMinutes, isLate, hasNoClockOut } = dailyEntry;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    return format(parseISO(time), "h:mm a");
  };

  // Calculate bar width (assuming 12-hour workday as 100%)
  const barWidth = Math.min((totalMinutes / 720) * 100, 100);

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* Date */}
      <div className="w-24 shrink-0">
        <p className="font-medium text-sm">{format(parseISO(date), "EEE, MMM d")}</p>
      </div>

      {/* Clock In */}
      <div className="w-20 shrink-0 text-sm">
        <span className={isLate ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}>
          {formatTime(clockIn)}
        </span>
      </div>

      {/* Timeline Bar */}
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            isLate 
              ? "bg-yellow-500" 
              : hasNoClockOut 
                ? "bg-orange-500" 
                : "bg-green-500"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Clock Out */}
      <div className="w-20 shrink-0 text-sm">
        {formatTime(clockOut)}
      </div>

      {/* Duration */}
      <div className="w-16 shrink-0 text-sm font-medium text-right">
        {durationStr}
      </div>

      {/* Status Icon */}
      <div className="w-6 shrink-0">
        {hasNoClockOut ? (
          <XCircle className="h-5 w-5 text-orange-500" />
        ) : isLate ? (
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>
    </div>
  );
};
