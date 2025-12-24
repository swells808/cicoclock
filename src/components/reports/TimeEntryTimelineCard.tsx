import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, AlertTriangle, XCircle, Clock, Map, Image, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
      <div className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded border border-dashed border-border flex items-center justify-center bg-muted/30">
        <Map className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50" />
      </div>
    );
  }

  const pinColor = color === "green" ? "22c55e" : "ef4444";
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/48x48@2x?access_token=${mapboxToken}`;

  return (
    <img
      src={mapUrl}
      alt="Location map"
      className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded border border-border object-cover"
    />
  );
};

// PhotoThumbnail component with dialog for full view
const PhotoThumbnail: React.FC<{
  photoUrl: string | null;
  signedUrl?: string | null;
  label: string;
}> = ({ photoUrl, signedUrl, label }) => {
  if (!photoUrl) {
    return (
      <div className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded border border-dashed border-border flex items-center justify-center bg-muted/30">
        <Image className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50" />
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded border border-border bg-muted animate-pulse" />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={signedUrl}
          alt={label}
          className="w-8 h-8 sm:w-12 sm:h-12 flex-shrink-0 rounded border border-border object-cover cursor-pointer hover:opacity-80 transition-opacity"
        />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <img
          src={signedUrl}
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
  signedPhotoUrl?: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}> = ({ type, time, photoUrl, signedPhotoUrl, address, latitude, longitude }) => {
  const label = type === "in" ? "Clock In" : "Clock Out";
  const color = type === "in" ? "green" : "red";
  const bgColor = type === "in" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30";
  const textColor = type === "in" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300";

  if (!time) {
    return (
      <div className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-lg bg-muted/30 min-w-[60px] sm:min-w-[100px]">
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-lg ${bgColor} min-w-[60px] sm:min-w-[100px]`}>
      <span className={`text-[10px] sm:text-xs font-medium ${textColor}`}>{label}</span>
      <span className={`text-xs sm:text-sm font-bold ${textColor}`}>
        {format(parseISO(time), "h:mm a")}
      </span>
      <div className="flex gap-1">
        <PhotoThumbnail photoUrl={photoUrl} signedUrl={signedPhotoUrl} label={`${label} Photo`} />
        <MiniMap latitude={latitude} longitude={longitude} color={color} />
      </div>
      {address && (
        <p className="text-[10px] text-muted-foreground max-w-[80px] sm:max-w-[100px] text-center line-clamp-2 hidden sm:block" title={address}>
          {address}
        </p>
      )}
    </div>
  );
};

export interface TimeEntryForCard {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  is_break: boolean;
  employeeName: string;
  projectName: string | null;
  signedClockInUrl?: string | null;
  signedClockOutUrl?: string | null;
}

interface TimeEntryTimelineCardProps {
  entry: TimeEntryForCard;
  scheduledStart?: string;
  scheduledEnd?: string;
  onEdit?: () => void;
}

export const TimeEntryTimelineCard = ({ 
  entry,
  scheduledStart = "08:00", 
  scheduledEnd = "17:00",
  onEdit
}: TimeEntryTimelineCardProps) => {
  const { 
    start_time, 
    end_time, 
    duration_minutes, 
    is_break,
    employeeName,
    projectName,
    clock_in_photo_url,
    clock_out_photo_url,
    signedClockInUrl,
    signedClockOutUrl,
    clock_in_address,
    clock_out_address,
    clock_in_latitude,
    clock_in_longitude,
    clock_out_latitude,
    clock_out_longitude
  } = entry;

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

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
    const clockInTime = parseISO(start_time);
    const clockInHour = clockInTime.getHours() + clockInTime.getMinutes() / 60;
    
    const clockOutTime = end_time ? parseISO(end_time) : new Date();
    const clockOutHour = clockOutTime.getHours() + clockOutTime.getMinutes() / 60;

    const segments: Array<{
      type: 'regular' | 'late' | 'overtime' | 'break';
      startPercent: number;
      widthPercent: number;
      label?: string;
    }> = [];

    // Calculate if late (more than 10 minutes after scheduled start)
    const scheduledStartMinutes = scheduledStartHour * 60;
    const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
    const isLateByMoreThan10 = clockInMinutes > scheduledStartMinutes + 10;

    // Add late segment if applicable (only for work entries, not breaks)
    if (isLateByMoreThan10 && !is_break) {
      segments.push({
        type: 'late',
        startPercent: getPositionPercent(scheduledStartHour),
        widthPercent: getPositionPercent(clockInHour) - getPositionPercent(scheduledStartHour),
        label: 'Late'
      });
    }

    // Determine segment type
    const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
    const scheduledEndMinutes = scheduledEndHour * 60;

    if (is_break) {
      // Break segment
      segments.push({
        type: 'break',
        startPercent: getPositionPercent(clockInHour),
        widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour),
        label: 'Break'
      });
    } else if (clockInMinutes >= scheduledEndMinutes) {
      // Entire entry is overtime
      segments.push({
        type: 'overtime',
        startPercent: getPositionPercent(clockInHour),
        widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour),
        label: 'Overtime'
      });
    } else if (clockOutMinutes > scheduledEndMinutes) {
      // Entry spans into overtime
      const scheduledEndHourFloat = scheduledEndMinutes / 60;
      
      // Regular portion
      segments.push({
        type: 'regular',
        startPercent: getPositionPercent(clockInHour),
        widthPercent: getPositionPercent(scheduledEndHourFloat) - getPositionPercent(clockInHour),
        label: 'Working time'
      });
      
      // Overtime portion
      segments.push({
        type: 'overtime',
        startPercent: getPositionPercent(scheduledEndHourFloat),
        widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(scheduledEndHourFloat),
        label: 'Overtime'
      });
    } else {
      // Regular work
      segments.push({
        type: 'regular',
        startPercent: getPositionPercent(clockInHour),
        widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour),
        label: 'Working time'
      });
    }

    return segments;
  };

  const segments = calculateSegments();

  // Generate hour ticks
  const hourTicks = [];
  for (let hour = timelineStartHour; hour <= timelineEndHour; hour += 2) {
    hourTicks.push(hour);
  }

  // Check if late
  const clockInTime = parseISO(start_time);
  const scheduledStartMinutes = scheduledStartHour * 60;
  const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  const isLate = clockInMinutes > scheduledStartMinutes + 10 && !is_break;

  // Status badge
  const getStatusBadge = () => {
    if (!end_time) {
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
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-sm">
            {format(parseISO(start_time), "EEEE, MMM d")}
          </span>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm font-medium">{employeeName}</span>
          {projectName && (
            <>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{projectName}</span>
            </>
          )}
          <Badge variant={is_break ? 'secondary' : 'default'} className="text-xs">
            {is_break ? 'Break' : 'Work'}
          </Badge>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Duration: {formatDuration(duration_minutes)}
          </span>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <Edit className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-stretch gap-2 sm:gap-4 p-2 sm:p-4">
        {/* Clock In Panel */}
        <ClockPanel
          type="in"
          time={start_time}
          photoUrl={clock_in_photo_url}
          signedPhotoUrl={signedClockInUrl}
          address={clock_in_address}
          latitude={clock_in_latitude}
          longitude={clock_in_longitude}
        />

        {/* Timeline Bar Section */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Hour Labels - hidden on mobile */}
          <div className="relative h-5 mb-1 hidden sm:block">
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

          {/* Legend - hidden on mobile for space */}
          <div className="hidden sm:flex items-center gap-3 mt-2 flex-wrap">
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
          time={end_time}
          photoUrl={clock_out_photo_url}
          signedPhotoUrl={signedClockOutUrl}
          address={clock_out_address}
          latitude={clock_out_latitude}
          longitude={clock_out_longitude}
        />
      </div>
    </div>
  );
};
