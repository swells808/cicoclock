import React, { useState, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { EditTimeEntryDialog } from "@/components/admin/EditTimeEntryDialog";
import { TimeEntryCard } from "@/components/admin/TimeEntryCard";
import { TimeEntriesMap } from "@/components/admin/TimeEntriesMap";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  profiles: {
    id: string;
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
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

const AdminTimeTracking: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { company } = useCompany();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
          clock_in_photo_url,
          clock_out_photo_url,
          clock_in_latitude,
          clock_in_longitude,
          clock_in_address,
          clock_out_latitude,
          clock_out_longitude,
          clock_out_address
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
        profiles: profileMap.get(entry.profile_id) || profileMap.get(entry.user_id) || null
      }));
    },
    enabled: !!company?.id,
  });

  // Filter entries by selected employee
  const filteredEntries = useMemo(() => {
    if (selectedEmployee === "all") return timeEntries;
    return timeEntries.filter(entry => entry.user_id === selectedEmployee);
  }, [timeEntries, selectedEmployee]);

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

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
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

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="py-8 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be an administrator to access this page.
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
              {filteredEntries.map((entry) => (
                <TimeEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

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
      </div>
    </DashboardLayout>
  );
};

export default AdminTimeTracking;
