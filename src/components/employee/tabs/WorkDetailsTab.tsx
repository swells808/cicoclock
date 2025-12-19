import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Calendar, Eye, EyeOff } from "lucide-react";
import { EmployeeProfile } from "@/hooks/useEmployeeDetail";
import { WeeklyScheduleEditor } from "@/components/employee/WeeklyScheduleEditor";
import { AttendanceTab } from "@/components/employee/tabs/AttendanceTab";
import { TimeOffTab } from "@/components/employee/tabs/TimeOffTab";
import { OvertimeTab } from "@/components/employee/tabs/OvertimeTab";

interface WorkDetailsTabProps {
  employee: EmployeeProfile;
  onRefetch: () => void;
}

export const WorkDetailsTab = ({ employee, onRefetch }: WorkDetailsTabProps) => {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="space-y-6">
      {/* Access & Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Access & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-muted-foreground">Role</label>
              <p className="font-medium text-foreground capitalize">{employee.role || "Employee"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">PIN</label>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground font-mono">
                  {employee.pin 
                    ? (showPin ? employee.pin : "••••") 
                    : "Not set"
                  }
                </p>
                {employee.pin && (
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Account Status</label>
              <Badge 
                variant={employee.status === "active" ? "default" : "secondary"}
                className="mt-1"
              >
                {employee.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyScheduleEditor profileId={employee.id} />
        </CardContent>
      </Card>

      {/* Time Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Time Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="attendance" className="w-full">
            <div className="px-6 border-b">
              <TabsList className="h-auto p-0 bg-transparent border-0">
                <TabsTrigger 
                  value="attendance" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Attendance
                </TabsTrigger>
                <TabsTrigger 
                  value="timeoff"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Time Off
                </TabsTrigger>
                <TabsTrigger 
                  value="overtime"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Overtime
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="attendance" className="m-0">
                <AttendanceTab profileId={employee.id} />
              </TabsContent>

              <TabsContent value="timeoff" className="m-0">
                <TimeOffTab profileId={employee.id} />
              </TabsContent>

              <TabsContent value="overtime" className="m-0">
                <OvertimeTab profileId={employee.id} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
