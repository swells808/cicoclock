import { useState, useEffect } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { DailyTimeEntry, TimeEntryWithDetails } from "@/hooks/useEmployeeTimeEntries";
import { CheckCircle, AlertTriangle, XCircle, Clock, Map, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Color constants for different activity types
const COLORS = {
  regular: 'bg-blue-500',
  late: 'bg-orange-500',
  overtime: 'bg-red-500',
  break: 'bg-teal-500',
  noActivity: 'bg-muted',
};

// MiniMap component for displaying location
const MiniMap: React.FC<{
  latitude: number | null;
  longitude: number | null;
  color: "green" | "red";
}> = ({ latitude, longitude, color }) => {
  const mapboxToken = localStorage.getItem("mapbox_public_token");
  
  if (!latitude || !longitude || !mapboxToken) {
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded border border-dashed border-border flex items-center justify-center bg-muted/30">
        <Map className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }

  const pinColor = color === "green" ? "22c55e" : "ef4444";
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/48x48@2x?access_token=${mapboxToken}`;

  return (
    <img
      src={mapUrl}
      alt="Location map"
      className="w-12 h-12 flex-shrink-0 rounded border border-border object-cover"
    />
  );
};

// PhotoThumbnail component with dialog for full view
const PhotoThumbnail: React.FC<{
  photoUrl: string | null;
  label: string;
}> = ({ photoUrl, label }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!photoUrl) return;
      
      setIsLoading(true);
      try {
        const { data } = await supabase.storage
          .from("timeclock-photos")
          .createSignedUrl(photoUrl, 3600);
        
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        console.error("Error fetching signed URL:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [photoUrl]);

  if (!photoUrl) {
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded border border-dashed border-border flex items-center justify-center bg-muted/30">
        <Image className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-12 h-12 flex-shrink-0 rounded border border-border bg-muted animate-pulse" />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={signedUrl || ""}
          alt={label}
          className="w-12 h-12 flex-shrink-0 rounded border border-border object-cover cursor-pointer hover:opacity-80 transition-opacity"
        />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <img
          src={signedUrl || ""}
          alt={label}
          className="w-full rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
};

// Clock In/Out Panel component
const ClockPanel: React.FC<{
  type: "in" | "out";
  time: string | null;
  photoUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}> = ({ type, time, photoUrl, address, latitude, longitude }) => {
  const label = type === "in" ? "Clock In" : "Clock Out";
  const color = type === "in" ? "green" : "red";
  const bgColor = type === "in" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30";
  const textColor = type === "in" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300";

  if (!time) {
    return (
      <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 min-w-[100px]">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-lg ${bgColor} min-w-[100px]`}>
      <span className={`text-xs font-medium ${textColor}`}>{label}</span>
      <span className={`text-sm font-bold ${textColor}`}>
        {format(parseISO(time), "h:mm a")}
      </span>
      <div className="flex gap-1">
        <PhotoThumbnail photoUrl={photoUrl} label={`${label} Photo`} />
        <MiniMap latitude={latitude} longitude={longitude} color={color} />
      </div>
      {address && (
        <p className="text-[10px] text-muted-foreground max-w-[100px] text-center line-clamp-2" title={address}>
          {address}
        </p>
      )}
    </div>
  );
};

interface TimelineBarProps {
  dailyEntry: DailyTimeEntry;
  scheduledStart?: string; // e.g., "08:00"
  scheduledEnd?: string;   // e.g., "17:00"
}

export const TimelineBar = ({ 
  dailyEntry, 
  scheduledStart = "08:00", 
  scheduledEnd = "17:00" 
}: TimelineBarProps) => {
  const { date, entries, clockIn, clockOut, totalMinutes, isLate, hasNoClockOut } = dailyEntry;

  // Get first entry for clock-in details
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationStr = `${hours}h ${mins}m`;

  // Calculate timeline range (show from 6am to 8pm for full context)
  const timelineStartHour = 6;
  const timelineEndHour = 20;
  const totalHours = timelineEndHour - timelineStartHour;

  // Parse scheduled times
  const scheduledStartHour = parseInt(scheduledStart.split(":")[0]);
  const scheduledEndHour = parseInt(scheduledEnd.split(":")[0]);

  // Calculate position percentage for a given hour
  const getPositionPercent = (hour: number): number => {
    return ((hour - timelineStartHour) / totalHours) * 100;
  };

  // Calculate segments for the timeline bar
  const calculateSegments = () => {
    if (!clockIn || entries.length === 0) {
      // No activity - show grey bar during scheduled hours
      return [{
        type: 'noActivity' as const,
        startPercent: getPositionPercent(scheduledStartHour),
        widthPercent: getPositionPercent(scheduledEndHour) - getPositionPercent(scheduledStartHour),
        label: 'No Clock Activity'
      }];
    }

    const segments: Array<{
      type: 'regular' | 'late' | 'overtime' | 'break';
      startPercent: number;
      widthPercent: number;
      label?: string;
    }> = [];

    const clockInTime = parseISO(clockIn);
    const clockInHour = clockInTime.getHours() + clockInTime.getMinutes() / 60;

    // Calculate if late (more than 10 minutes after scheduled start)
    const scheduledStartMinutes = scheduledStartHour * 60;
    const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
    const isLateByMoreThan10 = clockInMinutes > scheduledStartMinutes + 10;

    // Add late segment if applicable
    if (isLateByMoreThan10) {
      segments.push({
        type: 'late',
        startPercent: getPositionPercent(scheduledStartHour),
        widthPercent: getPositionPercent(clockInHour) - getPositionPercent(scheduledStartHour),
        label: 'Late'
      });
    }

    // Process each entry
    entries.forEach((entry, index) => {
      const entryStart = parseISO(entry.start_time);
      const entryEnd = entry.end_time ? parseISO(entry.end_time) : new Date();
      
      const startHour = entryStart.getHours() + entryStart.getMinutes() / 60;
      const endHour = entryEnd.getHours() + entryEnd.getMinutes() / 60;

      // Determine if this entry is overtime (after scheduled end)
      const entryStartMinutes = entryStart.getHours() * 60 + entryStart.getMinutes();
      const entryEndMinutes = entryEnd.getHours() * 60 + entryEnd.getMinutes();
      const scheduledEndMinutes = scheduledEndHour * 60;

      if (entry.is_break) {
        // Break segment
        segments.push({
          type: 'break',
          startPercent: getPositionPercent(startHour),
          widthPercent: getPositionPercent(endHour) - getPositionPercent(startHour),
          label: 'Break'
        });
      } else if (entryStartMinutes >= scheduledEndMinutes) {
        // Entire entry is overtime
        segments.push({
          type: 'overtime',
          startPercent: getPositionPercent(startHour),
          widthPercent: getPositionPercent(endHour) - getPositionPercent(startHour),
          label: 'Overtime'
        });
      } else if (entryEndMinutes > scheduledEndMinutes) {
        // Entry spans into overtime
        const scheduledEndHourFloat = scheduledEndMinutes / 60;
        
        // Regular portion
        segments.push({
          type: 'regular',
          startPercent: getPositionPercent(startHour),
          widthPercent: getPositionPercent(scheduledEndHourFloat) - getPositionPercent(startHour),
          label: 'Working time'
        });
        
        // Overtime portion
        segments.push({
          type: 'overtime',
          startPercent: getPositionPercent(scheduledEndHourFloat),
          widthPercent: getPositionPercent(endHour) - getPositionPercent(scheduledEndHourFloat),
          label: 'Overtime'
        });
      } else {
        // Regular work
        segments.push({
          type: 'regular',
          startPercent: getPositionPercent(startHour),
          widthPercent: getPositionPercent(endHour) - getPositionPercent(startHour),
          label: 'Working time'
        });
      }
    });

    return segments;
  };

  const segments = calculateSegments();

  // Generate hour ticks
  const hourTicks = [];
  for (let hour = timelineStartHour; hour <= timelineEndHour; hour += 2) {
    hourTicks.push(hour);
  }

  // Status icon and badge
  const getStatusBadge = () => {
    if (!clockIn) {
      return (
        <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
          <XCircle className="h-3 w-3" /> No Activity
        </span>
      );
    }
    if (hasNoClockOut) {
      return (
        <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded-full">
          <Clock className="h-3 w-3" /> Active
        </span>
      );
    }
    if (isLate) {
      return (
        <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-1 rounded-full">
          <AlertTriangle className="h-3 w-3" /> Late
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full">
        <CheckCircle className="h-3 w-3" /> Complete
      </span>
    );
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            {format(parseISO(date), "EEEE, MMM d")}
          </span>
          {getStatusBadge()}
        </div>
        <div className="text-sm font-medium">
          {clockIn ? `Duration: ${durationStr}` : '—'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-stretch gap-4 p-4">
        {/* Clock In Panel */}
        <ClockPanel
          type="in"
          time={clockIn}
          photoUrl={firstEntry?.clock_in_photo_url || null}
          address={firstEntry?.clock_in_address || null}
          latitude={firstEntry?.clock_in_latitude || null}
          longitude={firstEntry?.clock_in_longitude || null}
        />

        {/* Timeline Bar Section */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Hour Labels */}
          <div className="relative h-5 mb-1">
            {hourTicks.map((hour) => (
              <span
                key={hour}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${getPositionPercent(hour)}%` }}
              >
                {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
              </span>
            ))}
          </div>

          {/* Timeline Bar */}
          <div className="relative h-8 bg-muted rounded-md overflow-hidden">
            {/* Hour tick marks */}
            {hourTicks.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${getPositionPercent(hour)}%` }}
              />
            ))}

            {/* Scheduled time range indicator */}
            <div
              className="absolute top-0 bottom-0 border-x-2 border-dashed border-primary/30"
              style={{ 
                left: `${getPositionPercent(scheduledStartHour)}%`,
                width: `${getPositionPercent(scheduledEndHour) - getPositionPercent(scheduledStartHour)}%`
              }}
            />

            {/* Segments */}
            {segments.map((segment, index) => (
              <div
                key={index}
                className={`absolute top-1 bottom-1 rounded ${COLORS[segment.type]} flex items-center justify-center overflow-hidden`}
                style={{ 
                  left: `${segment.startPercent}%`,
                  width: `${Math.max(segment.widthPercent, 0.5)}%`
                }}
                title={segment.label}
              >
                {segment.widthPercent > 8 && (
                  <span className="text-[9px] text-white font-medium truncate px-1">
                    {segment.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Regular</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-[10px] text-muted-foreground">Late</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-[10px] text-muted-foreground">Overtime</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-teal-500" />
              <span className="text-[10px] text-muted-foreground">Break</span>
            </div>
          </div>
        </div>

        {/* Clock Out Panel */}
        <ClockPanel
          type="out"
          time={clockOut}
          photoUrl={lastEntry?.clock_out_photo_url || null}
          address={lastEntry?.clock_out_address || null}
          latitude={lastEntry?.clock_out_latitude || null}
          longitude={lastEntry?.clock_out_longitude || null}
        />
      </div>
    </div>
  );
};
