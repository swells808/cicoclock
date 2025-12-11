import React, { useState } from "react";
import { Clock, History, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OpenTimeEntriesList } from "@/components/admin/OpenTimeEntriesList";
import { RetroactiveClockoutDialog } from "@/components/admin/RetroactiveClockoutDialog";
import { TimeAdjustmentHistory } from "@/components/admin/TimeAdjustmentHistory";
import {
  useOpenTimeEntries,
  useTimeAdjustmentHistory,
  useRetroactiveClockout,
} from "@/hooks/useAdminTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";

interface OpenTimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  project_id: string | null;
  profiles: {
    id: string;
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
  } | null;
}

const AdminTimeTracking: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: openEntries = [], isLoading: entriesLoading } = useOpenTimeEntries();
  const { data: adjustments = [], isLoading: historyLoading } = useTimeAdjustmentHistory();
  const retroactiveClockout = useRetroactiveClockout();

  const [selectedEntry, setSelectedEntry] = useState<OpenTimeEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClockOut = (entry: OpenTimeEntry) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
  };

  const handleConfirmClockout = (endTime: string, reason: string) => {
    if (!selectedEntry) return;

    retroactiveClockout.mutate(
      {
        timeEntryId: selectedEntry.id,
        newEndTime: endTime,
        reason,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedEntry(null);
        },
      }
    );
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
        <div className="container mx-auto py-8 px-4">
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
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Time Tracking</h1>
          <p className="text-muted-foreground mt-2">
            Manage employee time entries and perform retroactive clock-outs
          </p>
        </div>

        <Tabs defaultValue="open-entries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="open-entries" className="gap-2">
              <Clock className="w-4 h-4" />
              Open Entries ({openEntries.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Adjustment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open-entries">
            <Card>
              <CardHeader>
                <CardTitle>Open Time Entries</CardTitle>
                <CardDescription>
                  Employees currently clocked in. You can perform retroactive clock-outs for missed punches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OpenTimeEntriesList
                  entries={openEntries}
                  isLoading={entriesLoading}
                  onClockOut={handleClockOut}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Time Adjustment History</CardTitle>
                <CardDescription>
                  A log of all administrative time adjustments made in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeAdjustmentHistory
                  adjustments={adjustments}
                  isLoading={historyLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <RetroactiveClockoutDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={selectedEntry}
          onConfirm={handleConfirmClockout}
          isLoading={retroactiveClockout.isPending}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminTimeTracking;
