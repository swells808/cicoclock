import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  ClipboardCheck, 
  Timer,
  ChevronRight,
  Calendar,
  TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "./MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useTimeEntries, useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";

const MobileDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, companyFeatures } = useCompany();
  const { data: timeEntries, refetch: refetchTimeEntries } = useTimeEntries();
  const { data: activeEntry, refetch: refetchActiveEntry } = useActiveTimeEntry();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoAction, setPhotoAction] = useState<'clock_in' | 'clock_out' | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isClockedIn = !!activeEntry;

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!activeEntry) return null;
    const start = new Date(activeEntry.start_time);
    const minutes = differenceInMinutes(currentTime, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, minutes: mins, total: minutes };
  };

  // Today's stats
  const todayEntries = timeEntries?.filter(entry => {
    const entryDate = new Date(entry.start_time);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  }) || [];

  const todayMinutes = todayEntries.reduce((acc, entry) => {
    if (entry.duration_minutes) return acc + entry.duration_minutes;
    if (!entry.end_time) {
      return acc + differenceInMinutes(currentTime, new Date(entry.start_time));
    }
    return acc;
  }, 0);

  // Week stats
  const weekStart = startOfWeek(currentTime, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentTime, { weekStartsOn: 1 });
  const weekEntries = timeEntries?.filter(entry => {
    const entryDate = new Date(entry.start_time);
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
  }) || [];

  const weekMinutes = weekEntries.reduce((acc, entry) => {
    return acc + (entry.duration_minutes || 0);
  }, 0);

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string> => {
    if (!company || !user) throw new Error('Company or user not found');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const userId = user.id.toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${company.id}/${actionPath}/${timestamp}_${userId}.jpg`;
    const { error } = await supabase.storage
      .from('timeclock-photos')
      .upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return filePath;
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      const photoUrl = await uploadPhoto(photoBlob, photoAction!);
      setShowPhotoCapture(false);
      if (photoAction === 'clock_in') await performClockIn(photoUrl);
      else if (photoAction === 'clock_out') await performClockOut(photoUrl);
    } catch {
      toast({ title: "Photo Upload Failed", description: "Continuing without photo.", variant: "destructive" });
      if (photoAction === 'clock_in') await performClockIn();
      else if (photoAction === 'clock_out') await performClockOut();
    }
    setPhotoAction(null);
  };

  const performClockIn = async (photoUrl?: string) => {
    if (!company || !user) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: company.id,
          start_time: new Date().toISOString(),
          clock_in_photo_url: photoUrl
        });
      
      if (error) throw error;
      refetchTimeEntries();
      refetchActiveEntry();
      toast({ title: "Clocked In", description: "Your shift has started." });
    } catch {
      toast({ title: "Clock In Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const performClockOut = async (photoUrl?: string) => {
    if (!activeEntry) return;
    setIsProcessing(true);
    try {
      const endTime = new Date();
      const startTime = new Date(activeEntry.start_time);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          clock_out_photo_url: photoUrl
        })
        .eq('id', activeEntry.id);
      
      if (error) throw error;
      refetchTimeEntries();
      refetchActiveEntry();
      toast({ 
        title: "Clocked Out", 
        description: `Worked ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` 
      });
    } catch {
      toast({ title: "Clock Out Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockAction = () => {
    if (companyFeatures?.photo_capture) {
      setPhotoAction(isClockedIn ? 'clock_out' : 'clock_in');
      setShowPhotoCapture(true);
    } else {
      if (isClockedIn) performClockOut();
      else performClockIn();
    }
  };

  const elapsed = getElapsedTime();

  const formatMinutesToHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <MobileLayout title="Dashboard" currentTime={currentTime}>
      <div className="p-4 space-y-4">
        {/* Clock Status Card */}
        <Card className={cn(
          "p-6",
          isClockedIn 
            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
            : "bg-muted/50"
        )}>
          <div className="text-center">
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3",
              isClockedIn 
                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                isClockedIn ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              )} />
              {isClockedIn ? "Clocked In" : "Clocked Out"}
            </div>

            {isClockedIn && elapsed ? (
              <>
                <div className="text-4xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                  {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Started at {format(new Date(activeEntry!.start_time), "h:mm a")}
                </p>
              </>
            ) : (
              <div className="text-2xl font-semibold text-muted-foreground">
                Ready to work?
              </div>
            )}
          </div>

          {/* Main Clock Button */}
          <Button
            onClick={handleClockAction}
            disabled={isProcessing}
            className={cn(
              "w-full h-16 text-xl mt-4",
              isClockedIn 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {isProcessing ? (
              "Processing..."
            ) : isClockedIn ? (
              <><LogOut className="h-6 w-6 mr-2" /> Clock Out</>
            ) : (
              <><LogIn className="h-6 w-6 mr-2" /> Clock In</>
            )}
          </Button>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-lg font-bold">{formatMinutesToHours(todayMinutes)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-lg font-bold">{formatMinutesToHours(weekMinutes)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-14 flex-col gap-1"
              onClick={() => navigate('/timeclock')}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">Time Clock</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col gap-1"
              onClick={() => navigate('/task-checkin')}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-xs">Task Check-in</span>
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Today's Activity</h3>
            <span className="text-sm text-muted-foreground">
              {todayEntries.length} entries
            </span>
          </div>

          <div className="space-y-3">
            {todayEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No activity yet today
              </p>
            ) : (
              todayEntries.slice(0, 5).map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      entry.end_time 
                        ? "bg-muted" 
                        : "bg-green-100 dark:bg-green-900"
                    )}>
                      {entry.end_time ? (
                        <Timer className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Clock className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {entry.projects?.name || "General"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.start_time), "h:mm a")}
                        {entry.end_time && ` - ${format(new Date(entry.end_time), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.duration_minutes ? (
                      <span className="text-sm font-medium">
                        {formatMinutesToHours(entry.duration_minutes)}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Photo Capture Modal */}
      <PhotoCapture
        open={showPhotoCapture}
        onCapture={handlePhotoCapture}
        onCancel={() => { setShowPhotoCapture(false); setPhotoAction(null); }}
        title={photoAction === 'clock_in' ? "Clock In Photo" : "Clock Out Photo"}
        description={photoAction === 'clock_in' 
          ? "Take a photo to verify your clock in" 
          : "Take a photo to verify your clock out"}
      />
    </MobileLayout>
  );
};

export default MobileDashboard;
