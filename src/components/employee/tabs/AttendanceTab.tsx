import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { useEmployeeTimeEntries } from "@/hooks/useEmployeeTimeEntries";
import { TimelineBar } from "@/components/employee/TimelineBar";
import { Input } from "@/components/ui/input";

interface AttendanceTabProps {
  profileId: string;
}

export const AttendanceTab = ({ profileId }: AttendanceTabProps) => {
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(() => new Date());

  const { data, isLoading } = useEmployeeTimeEntries(profileId, startDate, endDate, "08:00");

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading attendance...</div>;
  }

  const { dailyEntries = [], stats } = data || { dailyEntries: [], stats: { daysWorked: 0, lateArrivals: 0, totalHours: 0, absences: 0, averageHoursPerDay: 0 } };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={format(startDate, "yyyy-MM-dd")}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="w-40"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={format(endDate, "yyyy-MM-dd")}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="w-40"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.daysWorked || 0}</p>
              <p className="text-sm text-muted-foreground">Days Worked</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.lateArrivals || 0}</p>
              <p className="text-sm text-muted-foreground">Late Arrivals</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalHours || 0}h</p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.averageHoursPerDay || 0}h</p>
              <p className="text-sm text-muted-foreground">Avg/Day</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {dailyEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No time entries found for this period.
          </div>
        ) : (
          dailyEntries.map((day) => (
            <TimelineBar key={day.date} dailyEntry={day} />
          ))
        )}
      </div>
    </div>
  );
};
