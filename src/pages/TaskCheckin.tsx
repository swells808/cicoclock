import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { useActiveProjects } from "@/hooks/useProjects";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import { useTaskActivities } from "@/hooks/useTaskActivities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaskCheckinScanner } from "@/components/task-checkin/TaskCheckinScanner";
import { TaskSelectionPanel } from "@/components/task-checkin/TaskSelectionPanel";
import { ActiveTaskDisplay } from "@/components/task-checkin/ActiveTaskDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ClipboardCheck, Clock } from "lucide-react";

const TaskCheckin = () => {
  const { t } = useLanguage();
  const { company } = useCompany();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: activeTimeEntry } = useActiveTimeEntry();
  const { data: projects } = useActiveProjects();
  const { taskTypes, loading: taskTypesLoading } = useTaskTypes(company?.id);
  const { taskActivities, loading: activitiesLoading, refetch: refetchActivities } = useTaskActivities({
    startDate: new Date(),
    endDate: new Date(),
    userId: user?.id,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Find currently active task (started but not finished)
  const activeTask = taskActivities?.find((activity) => {
    if (activity.action_type !== 'start') return false;
    // Check if there's a matching finish for this task
    const hasFinish = taskActivities.some(
      (a) => a.action_type === 'finish' && 
             a.task_id === activity.task_id && 
             new Date(a.timestamp) > new Date(activity.timestamp)
    );
    return !hasFinish;
  });

  const handleTaskAction = async (taskTypeId: string, projectId: string, actionType: 'start' | 'finish') => {
    if (!user?.id || !profile?.id || !company?.id || !activeTimeEntry?.id) {
      toast.error("Missing required information");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('record-task-activity', {
        body: {
          user_id: user.id,
          profile_id: profile.id,
          task_id: crypto.randomUUID(), // Generate unique task instance ID
          project_id: projectId,
          company_id: company.id,
          time_entry_id: activeTimeEntry.id,
          task_type_id: taskTypeId,
          action_type: actionType,
        },
      });

      if (error) throw error;

      toast.success(actionType === 'start' ? "Task started" : "Task completed");
      refetchActivities();
    } catch (error: any) {
      console.error('Task action error:', error);
      toast.error(error.message || "Failed to record task activity");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = async (scannedCode: string) => {
    if (!company?.id) return;

    setIsProcessing(true);
    try {
      // Verify the task code
      const { data, error } = await supabase.functions.invoke('verify-task', {
        body: {
          task_code: scannedCode,
          company_id: company.id,
        },
      });

      if (error) throw error;

      if (!data?.valid) {
        toast.error("Invalid task code");
        return;
      }

      // If valid, show task selection with the verified task type
      toast.success(`Task verified: ${data.task_type.name}`);
    } catch (error: any) {
      console.error('QR scan error:', error);
      toast.error(error.message || "Failed to verify task");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishTask = async () => {
    if (!activeTask) return;

    await handleTaskAction(
      activeTask.task_type_id,
      activeTask.project_id,
      'finish'
    );
  };

  // Check if user is clocked in
  if (!activeTimeEntry) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8" />
              {t("taskCheckin") || "Task Check-in"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("taskCheckinDescription") || "Start and track tasks during your shift"}
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("notClockedIn") || "Not Clocked In"}</AlertTitle>
            <AlertDescription>
              {t("mustBeClockdInForTasks") || "You must be clocked in to start or finish tasks. Please go to the Timeclock to clock in first."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8" />
            {t("taskCheckin") || "Task Check-in"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("taskCheckinDescription") || "Start and track tasks during your shift"}
          </p>
        </div>

        {/* Current Shift Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t("currentShift") || "Current Shift"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("clockedInAt") || "Clocked in at"}: {new Date(activeTimeEntry.start_time).toLocaleTimeString()}
              {activeTimeEntry.projects?.name && ` • ${activeTimeEntry.projects.name}`}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Task Display */}
          {activeTask && (
            <div className="md:col-span-2">
              <ActiveTaskDisplay
                task={activeTask}
                onFinish={handleFinishTask}
                isLoading={isProcessing}
              />
            </div>
          )}

          {/* QR Scanner */}
          <TaskCheckinScanner
            onScan={handleQRScan}
            isLoading={isProcessing}
          />

          {/* Manual Task Selection */}
          <TaskSelectionPanel
            taskTypes={taskTypes}
            projects={projects || []}
            onStartTask={handleTaskAction}
            isLoading={isProcessing || taskTypesLoading}
            hasActiveTask={!!activeTask}
          />
        </div>

        {/* Today's Task Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("todayTaskActivity") || "Today's Task Activity"}</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : taskActivities && taskActivities.length > 0 ? (
              <div className="space-y-3">
                {taskActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.action_type === 'start' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium">
                          {activity.task_type?.name || "Unknown Task"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.project?.name || "No Project"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {activity.action_type === 'start' ? t("started") || "Started" : t("finished") || "Finished"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {t("noTasksToday") || "No tasks recorded today"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TaskCheckin;
