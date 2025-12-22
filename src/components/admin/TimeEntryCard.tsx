import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, MapPin, Camera, Edit, User, Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// Mini map component using Mapbox Static Images API
const MiniMap: React.FC<{
  latitude: number | null;
  longitude: number | null;
  color: "green" | "red";
}> = ({ latitude, longitude, color }) => {
  const mapboxToken = localStorage.getItem("mapbox_public_token");
  
  if (!latitude || !longitude || !mapboxToken) {
    return (
      <div className="w-16 h-16 flex-shrink-0 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/30">
        <Map className="h-5 w-5 text-muted-foreground/50" />
      </div>
    );
  }

  const pinColor = color === "green" ? "22c55e" : "ef4444";
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/64x64@2x?access_token=${mapboxToken}`;

  return (
    <img
      src={mapUrl}
      alt="Location map"
      className="w-16 h-16 flex-shrink-0 rounded-md border border-border object-cover"
    />
  );
};

interface TimeEntryProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  project_id: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  profiles: TimeEntryProfile | null;
}

interface TimeEntryCardProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
}

export const TimeEntryCard: React.FC<TimeEntryCardProps> = ({ entry, onEdit }) => {
  const [clockInPhotoUrl, setClockInPhotoUrl] = useState<string | null>(null);
  const [clockOutPhotoUrl, setClockOutPhotoUrl] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Fetch signed URLs for photos
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (entry.clock_in_photo_url) {
        const { data } = await supabase.storage
          .from("timeclock-photos")
          .createSignedUrl(entry.clock_in_photo_url, 3600);
        if (data?.signedUrl) setClockInPhotoUrl(data.signedUrl);
      }
      if (entry.clock_out_photo_url) {
        const { data } = await supabase.storage
          .from("timeclock-photos")
          .createSignedUrl(entry.clock_out_photo_url, 3600);
        if (data?.signedUrl) setClockOutPhotoUrl(data.signedUrl);
      }
    };
    fetchSignedUrls();
  }, [entry.clock_in_photo_url, entry.clock_out_photo_url]);

  const getEmployeeName = () => {
    if (!entry.profiles) return "Unknown";
    if (entry.profiles.display_name) return entry.profiles.display_name;
    if (entry.profiles.first_name || entry.profiles.last_name) {
      return `${entry.profiles.first_name || ""} ${entry.profiles.last_name || ""}`.trim();
    }
    return entry.profiles.email || "Unknown";
  };

  const getInitials = () => {
    const name = getEmployeeName();
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTimeRange = () => {
    const start = format(new Date(entry.start_time), "h:mm a");
    if (!entry.end_time) return `${start} - Active`;
    const end = format(new Date(entry.end_time), "h:mm a");
    return `${start} - ${end}`;
  };

  const formatDuration = () => {
    if (!entry.duration_minutes && !entry.end_time) {
      const now = new Date();
      const start = new Date(entry.start_time);
      const mins = Math.floor((now.getTime() - start.getTime()) / 60000);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    if (entry.duration_minutes) {
      const hours = Math.floor(entry.duration_minutes / 60);
      const mins = entry.duration_minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return "";
  };

  const handlePhotoClick = (url: string, title: string) => {
    setSelectedPhoto({ url, title });
    setPhotoDialogOpen(true);
  };

  const isActive = !entry.end_time;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          {/* Header with employee info and edit button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{getEmployeeName()}</p>
                  {isActive && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatTimeRange()}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDuration()}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(entry)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>

          {/* Clock In Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clock In</p>
              <div className="flex items-start gap-2">
                {clockInPhotoUrl ? (
                  <button
                    onClick={() => handlePhotoClick(clockInPhotoUrl, "Clock In Photo")}
                    className="relative flex-shrink-0 rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    <img
                      src={clockInPhotoUrl}
                      alt="Clock in"
                      className="w-16 h-16 object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                      <Camera className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ) : (
                  <div className="w-16 h-16 flex-shrink-0 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/30">
                    <Camera className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <MiniMap 
                  latitude={entry.clock_in_latitude} 
                  longitude={entry.clock_in_longitude} 
                  color="green" 
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {format(new Date(entry.start_time), "h:mm a")}
                  </p>
                  {entry.clock_in_address ? (
                    <div className="flex items-start gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {entry.clock_in_address}
                      </p>
                    </div>
                  ) : entry.clock_in_latitude && entry.clock_in_longitude ? (
                    <div className="flex items-start gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        {entry.clock_in_latitude.toFixed(4)}, {entry.clock_in_longitude.toFixed(4)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-1">No location data</p>
                  )}
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.title}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
