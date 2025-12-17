import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskTypes } from '@/hooks/useTaskTypes';
import { QRScanner } from '@/components/task-checkin/QRScanner';
import { TaskActionForm } from '@/components/task-checkin/TaskActionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MobileLayout } from './MobileLayout';

interface User {
  id: string;
  profileId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  employeeId: string;
  companyName: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  assigneeId: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  companyId: string;
  companyName: string;
}

interface ClockStatus {
  isClockedIn: boolean;
  timeEntryId: string | null;
  startTime: string | null;
}

type Step = 'badge' | 'task' | 'action' | 'success' | 'error';

export default function MobileTaskCheckin() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('badge');
  const [user, setUser] = useState<User | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { taskTypes } = useTaskTypes(user?.companyId);

  const handleBadgeScan = async (badgeId: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-badge', {
        body: { badgeId }
      });

      if (error) {
        setErrorMessage('Failed to verify badge. Please try again.');
        setCurrentStep('error');
        return;
      }

      if (!data.success) {
        setErrorMessage(data.error || 'Invalid badge');
        setCurrentStep('error');
        return;
      }

      setUser(data.user);

      // Check clock status
      const clockResponse = await supabase.functions.invoke('check-clock-status', {
        body: { userId: data.user.id }
      });

      if (clockResponse.error || !clockResponse.data.success) {
        setErrorMessage('Failed to check clock status. Please try again.');
        setCurrentStep('error');
        return;
      }

      if (!clockResponse.data.isClockedIn) {
        setErrorMessage('You must be clocked in to check in/out of tasks. Please clock in first.');
        setCurrentStep('error');
        return;
      }

      setClockStatus(clockResponse.data);
      setCurrentStep('task');

    } catch (error) {
      console.error('Badge verification error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskScan = async (taskId: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('verify-task', {
        body: { taskId }
      });

      if (error) {
        setErrorMessage('Failed to verify task. Please try again.');
        setCurrentStep('error');
        return;
      }

      if (!data.success) {
        setErrorMessage(data.error || 'Invalid task');
        setCurrentStep('error');
        return;
      }

      // Check if task belongs to same company
      if (data.task.companyId !== user?.companyId) {
        setErrorMessage('This task does not belong to your company.');
        setCurrentStep('error');
        return;
      }

      setTask(data.task);
      setCurrentStep('action');

    } catch (error) {
      console.error('Task verification error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskAction = async (taskTypeId: string, actionType: 'start' | 'finish') => {
    if (!user || !task || !clockStatus) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('record-task-activity', {
        body: {
          userId: user.id,
          profileId: user.profileId,
          taskId: task.id,
          projectId: task.projectId,
          companyId: user.companyId,
          timeEntryId: clockStatus.timeEntryId,
          taskTypeId,
          actionType
        }
      });

      if (error) {
        setErrorMessage('Failed to record activity. Please try again.');
        setCurrentStep('error');
        return;
      }

      if (!data.success) {
        setErrorMessage(data.error || 'Failed to record activity');
        setCurrentStep('error');
        return;
      }

      const taskTypeName = taskTypes.find(tt => tt.id === taskTypeId)?.name || 'Unknown';
      setSuccessMessage(
        `Successfully ${actionType === 'start' ? 'started' : 'finished'} ${taskTypeName} for "${task.name}"`
      );
      setCurrentStep('success');

    } catch (error) {
      console.error('Task activity error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('badge');
    setUser(null);
    setTask(null);
    setClockStatus(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const goBack = () => {
    if (currentStep === 'task') {
      setCurrentStep('badge');
      setUser(null);
      setClockStatus(null);
    } else if (currentStep === 'action') {
      setCurrentStep('task');
      setTask(null);
    }
  };

  return (
    <MobileLayout title="Task Check-In">
      <div className="flex-1 flex flex-col p-4 pb-20 space-y-4">
        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2 py-2">
          {['badge', 'task', 'action'].map((step, index) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentStep === step || (['success', 'error'].includes(currentStep) && index < 3)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 'badge' && (
          <QRScanner
            title="Scan Your Badge"
            description="Scan your employee badge or enter your badge ID"
            onScan={handleBadgeScan}
            isLoading={isLoading}
            placeholder="Enter badge ID"
            autoStart={true}
          />
        )}

        {currentStep === 'task' && user && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-center">
                  Welcome, <strong>{user.displayName || `${user.firstName} ${user.lastName}`}</strong>
                  <br />
                  <span className="text-muted-foreground">{user.companyName}</span>
                </p>
              </CardContent>
            </Card>

            <QRScanner
              title="Scan Task QR Code"
              description="Scan the QR code for the task you want to work on"
              onScan={handleTaskScan}
              isLoading={isLoading}
              placeholder="Enter task ID"
              autoStart={true}
            />

            <Button variant="outline" onClick={goBack} className="w-full h-12">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Badge Scan
            </Button>
          </div>
        )}

        {currentStep === 'action' && user && task && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-center">
                  <strong>{task.name}</strong>
                  <br />
                  <span className="text-muted-foreground">Project: {task.projectName}</span>
                </p>
              </CardContent>
            </Card>

            <TaskActionForm
              taskTypes={taskTypes}
              onSubmit={handleTaskAction}
              isLoading={isLoading}
            />

            <Button variant="outline" onClick={goBack} className="w-full h-12">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Task Scan
            </Button>
          </div>
        )}

        {currentStep === 'success' && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-green-700 dark:text-green-400">Success!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-green-600 dark:text-green-400">{successMessage}</p>
              <Button onClick={resetFlow} className="w-full h-12">
                Check In Another Task
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 'error' && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-red-700 dark:text-red-400">Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={resetFlow} className="h-12">
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
