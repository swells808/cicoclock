import React, { useState, useEffect } from "react";
import { Play, Square, Coffee, Clock, MapPin, Download, FileText, Edit2, CheckCircle, PlayCircle, StickyNote } from "lucide-react";
import { RecentTaskActivity } from "@/components/dashboard/RecentTaskActivity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProjects } from "@/hooks/useProjects";
import { useTimeEntries, useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { useToast } from "@/hooks/use-toast";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import { useCompany } from "@/contexts/CompanyContext";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const { company, companyFeatures } = useCompany();
  const { data: projects } = useActiveProjects();
  const { data: timeEntries, refetch: refetchTimeEntries } = useTimeEntries();
  const { data: activeEntry, refetch: refetchActiveEntry } = useActiveTimeEntry();
  const { toast } = useToast();
  const { taskTypes } = useTaskTypes(company?.id);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("");
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoAction, setPhotoAction] = useState<'clock_in' | 'clock_out' | null>(null);

  // Helper function to check if a date is today
  const isToday = (date: Date | string) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get user's location automatically
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.error("Error getting location:", error)
      );
    }

    return () => clearInterval(timer);
  }, []);

  // Check for active time entry on mount to sync state with database
  useEffect(() => {
    if (activeEntry) {
      setIsClockedIn(true);
      setCurrentTimeEntry(activeEntry.id);
      setSelectedProject(activeEntry.project_id || "");
    } else {
      setIsClockedIn(false);
      setCurrentTimeEntry(null);
    }
  }, [activeEntry]);

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string> => {
    if (!company || !user) throw new Error('Company or user not found');

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const userId = user.id.toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${company.id}/${actionPath}/${timestamp}_${userId}.jpg`;

    const { error } = await supabase.storage
      .from('timeclock-photos')
      .upload(filePath, photoBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) throw error;
    return filePath;
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      const photoUrl = await uploadPhoto(photoBlob, photoAction!);
      setShowPhotoCapture(false);

      if (photoAction === 'clock_in') {
        await performClockIn(photoUrl);
      } else if (photoAction === 'clock_out') {
        await performClockOut(photoUrl);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Photo Upload Failed",
        description: "Failed to upload photo. Continuing without photo.",
        variant: "destructive"
      });

      if (photoAction === 'clock_in') {
        await performClockIn();
      } else if (photoAction === 'clock_out') {
        await performClockOut();
      }
    }
    setPhotoAction(null);
  };

  const performClockIn = async (photoUrl?: string) => {
    if (!company || !user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: entry, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          company_id: company.id,
          project_id: selectedProject || null,
          start_time: new Date().toISOString(),
          is_break: false,
          clock_in_photo_url: photoUrl
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentTimeEntry(entry.id);
      setIsClockedIn(true);
      refetchTimeEntries();
      refetchActiveEntry();

      // Auto-assign "Other" task type if no task type selected
      if (!selectedTaskType) {
        const otherTaskType = taskTypes.find(tt => tt.code === '8050' || tt.code === 'OTH');
        if (otherTaskType) {
          try {
            await supabase.functions.invoke('record-task-activity', {
              body: {
                userId: user.id,
                profileId: profile.id,
                taskId: otherTaskType.id,
                taskTypeId: otherTaskType.id,
                actionType: 'start',
                timeEntryId: entry.id,
                projectId: selectedProject || null,
                companyId: company.id,
              }
            });
          } catch (taskError) {
            console.error('Error creating auto "Other" task activity:', taskError);
          }
        }
      } else {
        // Create task activity for selected task type
        try {
          await supabase.functions.invoke('record-task-activity', {
            body: {
              userId: user.id,
              profileId: profile.id,
              taskId: selectedTaskType,
              taskTypeId: selectedTaskType,
              actionType: 'start',
              timeEntryId: entry.id,
              projectId: selectedProject || null,
              companyId: company.id,
            }
          });
        } catch (taskError) {
          console.error('Error creating task activity:', taskError);
        }
      }

      toast({
        title: "Clocked In",
        description: "You have successfully clocked in.",
      });
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: "Clock In Failed",
        description: "Failed to clock in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const performClockOut = async (photoUrl?: string) => {
    if (!currentTimeEntry || !company) return;

    try {
      const endTime = new Date();
      const entry = timeEntries?.find(e => e.id === currentTimeEntry);
      const startTime = entry ? new Date(entry.start_time) : new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          clock_out_photo_url: photoUrl
        })
        .eq('id', currentTimeEntry);

      if (error) throw error;

      // Auto-close any open tasks
      try {
        const { data, error: autoCloseError } = await supabase.functions.invoke('auto-close-tasks-on-shift-end', {
          body: {
            time_entry_id: currentTimeEntry,
            end_timestamp: endTime.toISOString()
          }
        });

        if (!autoCloseError && data?.closed_count > 0) {
          const taskNames = data.tasks.map((t: any) => t.task_name).join(', ');
          toast({
            title: "Clocked Out",
            description: `Shift ended. ${data.closed_count} active task(s) automatically completed: ${taskNames}`,
          });
        } else {
          toast({
            title: "Clocked Out",
            description: `You worked for ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m.`,
          });
        }
      } catch (autoCloseError) {
        console.error('Auto-close tasks error:', autoCloseError);
        toast({
          title: "Clocked Out",
          description: `You worked for ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m.`,
        });
      }

      setIsClockedIn(false);
      setCurrentTimeEntry(null);
      setSelectedProject("");
      setSelectedTaskType("");
      refetchTimeEntries();
      refetchActiveEntry();
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: "Clock Out Failed",
        description: "Failed to clock out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClockInOut = () => {
    if (companyFeatures?.photo_capture) {
      setPhotoAction(isClockedIn ? 'clock_out' : 'clock_in');
      setShowPhotoCapture(true);
    } else {
      if (isClockedIn) {
        performClockOut();
      } else {
        performClockIn();
      }
    }
  };

  const todayEntries = timeEntries?.filter(entry => isToday(entry.start_time)) || [];

  return (
    <DashboardLayout>
      {/* Current Status Section */}
      <Card className="mb-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isClockedIn ? "Currently Working" : "Not Clocked In"}
            </h2>
            <p className="text-muted-foreground">
              {isClockedIn && currentTimeEntry
                ? `Clocked in at ${format(new Date(timeEntries?.find(e => e.id === currentTimeEntry)?.start_time || new Date()), "h:mm a")}`
                : "Ready to start work?"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {location && (
              <span className="flex items-center text-green-600 text-sm">
                <MapPin className="h-4 w-4 mr-1" />
                Location Verified
              </span>
            )}
            {isClockedIn && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                Active
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Clock In/Out Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-1 p-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold mb-2">{format(currentTime, "h:mm:ss a")}</div>
            <div className="text-muted-foreground">{format(currentTime, "EEEE, MMMM d, yyyy")}</div>
          </div>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Select Project (Optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Projects</SelectLabel>
                {projects?.filter(p => p.is_active).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Select Task Type (Optional - defaults to Other)" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Task Types</SelectLabel>
                {taskTypes.map((taskType) => (
                  <SelectItem key={taskType.id} value={taskType.id}>
                    {taskType.name} ({taskType.code})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button
            className={`w-full h-14 text-lg mb-4 ${isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-[#008000] hover:bg-[#008000]/90'}`}
            onClick={handleClockInOut}
          >
            {isClockedIn ? "Clock Out" : "Clock In"}
          </Button>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => setIsOnBreak(!isOnBreak)}
            >
              <Coffee className="mr-2 h-4 w-4" />
              {isOnBreak ? "End Break" : "Start Break"}
            </Button>
            <Button
              className="flex-1 bg-[#4BA0F4] hover:bg-[#4BA0F4]/90 text-white"
            >
              <StickyNote className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </Card>

        {/* Live Time Log */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Today's Activity</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Current Session */}
            {isClockedIn && activeEntry && (
              <div className="flex items-start space-x-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-lg">
                <PlayCircle className="text-green-600 w-5 h-5 mt-1" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">Current Session</div>
                      <div className="text-sm text-muted-foreground">
                        {projects?.find(p => p.id === selectedProject)?.name || 'No Project'}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Started at {format(new Date(activeEntry.start_time), "h:mm a")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Sessions */}
            {todayEntries
              .filter(entry => entry.end_time && entry.id !== currentTimeEntry)
              .slice(0, 5)
              .map((entry) => (
                <div key={entry.id} className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg">
                  <CheckCircle className="text-blue-600 w-5 h-5 mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">Work Session</div>
                        <div className="text-sm text-muted-foreground">{entry.projects?.name || 'No Project'}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.start_time), 'h:mm a')} - {format(new Date(entry.end_time!), 'h:mm a')} ({entry.duration_minutes ? `${Math.round(entry.duration_minutes / 60 * 10) / 10}h` : '0h'})
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {todayEntries.filter(entry => entry.end_time).length === 0 && !isClockedIn && (
              <div className="text-center py-4 text-muted-foreground">
                No activity yet today. Clock in to start tracking your time.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Timesheet History */}
      <Card className="mb-8 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Timesheet History</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Project</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Clock In</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Clock Out</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries?.slice(0, 10).map((entry) => (
                <tr key={entry.id} className="border-b border-border">
                  <td className="py-3 px-4">{format(new Date(entry.start_time), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4">{entry.projects?.name || 'No Project'}</td>
                  <td className="py-3 px-4">{format(new Date(entry.start_time), 'h:mm a')}</td>
                  <td className="py-3 px-4">{entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}</td>
                  <td className="py-3 px-4">{entry.duration_minutes ? `${Math.round(entry.duration_minutes / 60 * 10) / 10}h` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Task Activity */}
      <RecentTaskActivity />

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              {photoAction === 'clock_in' ? 'Clock In Photo' : 'Clock Out Photo'}
            </h3>
            <PhotoCapture
              open={showPhotoCapture}
              onCapture={handlePhotoCapture}
              onCancel={() => {
                setShowPhotoCapture(false);
                setPhotoAction(null);
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
