import React, { useState, useMemo, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, User, Clock, List, Map as MapIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import { useFaceVerifications, useFlaggedCount, FaceVerification } from "@/hooks/useFaceVerifications";
import { EditTimeEntryDialog } from "@/components/admin/EditTimeEntryDialog";
import { FaceReviewDialog } from "@/components/admin/FaceReviewDialog";
import { TimeEntryTimelineCard, TimeEntryForCard } from "@/components/reports/TimeEntryTimelineCard";
import { TimeEntriesMap } from "@/components/admin/TimeEntriesMap";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TimeEntry {
  id: string;
  user_id: string;
  profile_id: string | null;
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
  is_break?: boolean;
  profiles: {
    id: string;
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  project?: {
    name: string;
  } | null;
}

interface Employee {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface SignedUrls {
  [entryId: string]: {
    clockIn?: string | null;
    clockOut?: string | null;
  };
}

const AdminTimeTracking: React.FC = () => {
  const { isAdmin, isSupervisor, isForeman, isManager, isLoading: roleLoading } = useUserRole();
  const { company } = useCompany();
  const { data: companyFeatures } = useCompanyFeatures();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingVerification, setReviewingVerification] = useState<FaceVerification | null>(null);
  const [reviewingEmployeeName, setReviewingEmployeeName] = useState<string>('');
  const queryClient = useQueryClient();

  // Set mapbox token in localStorage when available
  useEffect(() => {
    if (companyFeatures?.mapbox_public_token) {
      localStorage.setItem("mapbox_public_token", companyFeatures.mapbox_public_token);
    }
  }, [companyFeatures]);

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, first_name, last_name, email")
        .eq("company_id", company.id)
        .order("first_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch time entries for selected date with photos and geolocation
  const { data: timeEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ["admin-time-entries", company?.id, selectedDate],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          id,
          user_id,
          profile_id,
          start_time,
          end_time,
          duration_minutes,
          project_id,
          is_break,
          clock_in_photo_url,
          clock_out_photo_url,
          clock_in_latitude,
          clock_in_longitude,
          clock_in_address,
          clock_out_latitude,
          clock_out_longitude,
          clock_out_address,
          projects:project_id (name)
        `)
        .eq("company_id", company.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time", { ascending: false });

      if (error) throw error;
      
      // Manually fetch profiles to avoid ambiguous foreign key issue
      const profileIds = [...new Set((data || []).map(e => e.profile_id || e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, first_name, last_name, email, avatar_url")
        .or(`id.in.(${profileIds.join(',')}),user_id.in.(${profileIds.join(',')})`);
      
      const profileMap = new Map();
      (profiles || []).forEach(p => {
        profileMap.set(p.id, p);
        if (p.user_id) profileMap.set(p.user_id, p);
      });
      
      return (data || []).map(entry => ({
        ...entry,
        profiles: profileMap.get(entry.profile_id) || profileMap.get(entry.user_id) || null,
        project: entry.projects as { name: string } | null
      }));
    },
    enabled: !!company?.id,
  });

  // Fetch signed URLs for photos
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (!timeEntries.length) return;
      
      const newSignedUrls: SignedUrls = {};
      
      await Promise.all(
        timeEntries.map(async (entry) => {
          const urls: { clockIn?: string | null; clockOut?: string | null } = {};
          
          if (entry.clock_in_photo_url) {
            const { data, error } = await supabase.storage
              .from("timeclock-photos")
              .createSignedUrl(entry.clock_in_photo_url, 3600);
            if (error) {
              console.error('Failed to get signed URL for clock-in:', entry.clock_in_photo_url, error);
            }
            urls.clockIn = data?.signedUrl || null;
          }
          
          if (entry.clock_out_photo_url) {
            const { data, error } = await supabase.storage
              .from("timeclock-photos")
              .createSignedUrl(entry.clock_out_photo_url, 3600);
            if (error) {
              console.error('Failed to get signed URL for clock-out:', entry.clock_out_photo_url, error);
            }
            urls.clockOut = data?.signedUrl || null;
          }
          
          if (urls.clockIn || urls.clockOut) {
            newSignedUrls[entry.id] = urls;
          }
        })
      );
      
      setSignedUrls(newSignedUrls);
    };
    
    fetchSignedUrls();
  }, [timeEntries]);

  // Face verification data
  const entryIds = useMemo(() => timeEntries.map(e => e.id), [timeEntries]);
  const { data: verificationMap } = useFaceVerifications(entryIds, !!companyFeatures?.face_verification);
  const { data: flaggedCount = 0 } = useFlaggedCount(company?.id, !!companyFeatures?.face_verification);

  // Filter entries by selected employee
  const filteredEntries = useMemo(() => {
    if (selectedEmployee === "all") return timeEntries;
    // Find the selected employee's profile to cross-reference both id and user_id
    const selectedEmp = employees.find(e => (e.user_id || e.id) === selectedEmployee);
    return timeEntries.filter(entry => 
      entry.user_id === selectedEmployee || 
      entry.profile_id === selectedEmployee ||
      (selectedEmp && entry.profile_id === selectedEmp.id) ||
      (selectedEmp?.user_id && entry.user_id === selectedEmp.user_id)
    );
  }, [timeEntries, selectedEmployee, employees]);

  // Calculate summary
  const summary = useMemo(() => {
    const activeShifts = timeEntries.filter(e => !e.end_time).length;
    const completed = timeEntries.filter(e => e.end_time).length;
    return { activeShifts, completed };
  }, [timeEntries]);

  const getEmployeeDisplayName = (emp: Employee) => {
    if (emp.display_name) return emp.display_name;
    if (emp.first_name || emp.last_name) {
      return `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
    }
    return emp.email || "Unknown";
  };

  const getProfileDisplayName = (profile: TimeEntry["profiles"]) => {
    if (!profile) return "Unknown";
    if (profile.display_name) return profile.display_name;
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email || "Unknown";
  };

  // Transform entries to TimeEntryForCard format
  const transformedEntries: TimeEntryForCard[] = useMemo(() => {
    const entries = filteredEntries.map(entry => {
      const verification = verificationMap?.get(entry.id);
      let flagStatus: 'flagged' | 'approved' | 'rejected' | null = null;
      if (verification) {
        if (!verification.is_match && !verification.review_decision) flagStatus = 'flagged';
        else if (verification.review_decision === 'approved') flagStatus = 'approved';
        else if (verification.review_decision === 'rejected') flagStatus = 'rejected';
      }

      return {
        id: entry.id,
        start_time: entry.start_time,
        end_time: entry.end_time,
        duration_minutes: entry.duration_minutes,
        clock_in_photo_url: entry.clock_in_photo_url,
        clock_out_photo_url: entry.clock_out_photo_url,
        clock_in_latitude: entry.clock_in_latitude,
        clock_in_longitude: entry.clock_in_longitude,
        clock_out_latitude: entry.clock_out_latitude,
        clock_out_longitude: entry.clock_out_longitude,
        clock_in_address: entry.clock_in_address,
        clock_out_address: entry.clock_out_address,
        is_break: entry.is_break || false,
        employeeName: getProfileDisplayName(entry.profiles),
        projectName: entry.project?.name || null,
        signedClockInUrl: signedUrls[entry.id]?.clockIn,
        signedClockOutUrl: signedUrls[entry.id]?.clockOut,
        flagStatus,
      };
    });

    // Sort: Active (no end_time) first, then completed, both alphabetically by employee name
    return entries.sort((a, b) => {
      const aIsActive = !a.end_time;
      const bIsActive = !b.end_time;
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredEntries, signedUrls, verificationMap]);

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  };

  const handleReviewClick = (entryId: string) => {
    const verification = verificationMap?.get(entryId);
    if (!verification) return;
    const entry = filteredEntries.find(e => e.id === entryId);
    setReviewingVerification(verification);
    setReviewingEmployeeName(getProfileDisplayName(entry?.profiles || null));
    setReviewDialogOpen(true);
  };

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Allow admins, supervisors, managers (full edit), and foremen (read-only)
  const canEdit = isAdmin || isManager || isSupervisor;
  
  if (!isAdmin && !isSupervisor && !isForeman && !isManager) {
    return (
      <DashboardLayout>
        <div className="py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator, manager, or foreman to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">
            View and manage employee time entries
          </p>
        </div>

        {/* Filter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Select Date Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMMM do, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Select Employee Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Select Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.user_id} value={emp.user_id || emp.id}>
                      {getEmployeeDisplayName(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Shifts:</span>
                  <span className="font-medium text-foreground">{summary.activeShifts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-foreground">{summary.completed}</span>
                </div>
                {companyFeatures?.face_verification && flaggedCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Flagged:</span>
                    <span className="font-medium text-destructive">{flaggedCount}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Time Entries</h2>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "list" | "map")}>
              <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="map" aria-label="Map view" className="gap-1.5">
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {viewMode === "map" ? (
            <TimeEntriesMap entries={filteredEntries} selectedDate={selectedDate} />
          ) : filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No time entries found for this date.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transformedEntries.map((transformedEntry) => (
                <TimeEntryTimelineCard
                  key={transformedEntry.id}
                  entry={transformedEntry}
                  onReviewClick={
                    transformedEntry.flagStatus === 'flagged' && canEdit && companyFeatures?.face_verification
                      ? () => handleReviewClick(transformedEntry.id)
                      : undefined
                  }
                  onEdit={canEdit ? () => {
                    const originalEntry = filteredEntries.find(e => e.id === transformedEntry.id);
                    if (originalEntry) handleEdit(originalEntry);
                  } : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <EditTimeEntryDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            entry={editingEntry}
            onSuccess={() => {
              refetchEntries();
              setEditDialogOpen(false);
              setEditingEntry(null);
            }}
          />
        )}

        {canEdit && companyFeatures?.face_verification && (
          <FaceReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            verification={reviewingVerification}
            employeeName={reviewingEmployeeName}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['face-verifications'] });
              queryClient.invalidateQueries({ queryKey: ['flagged-count'] });
              setReviewDialogOpen(false);
              setReviewingVerification(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminTimeTracking;
