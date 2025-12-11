import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

interface TaskActivity {
  id: string;
  task_id: string;
  task_type_id: string;
  project_id: string;
  timestamp: string;
  action_type: string;
  task_type?: {
    name: string;
    code: string;
  };
  project?: {
    name: string;
  };
}

interface ActiveTaskDisplayProps {
  task: TaskActivity;
  onFinish: () => void;
  isLoading?: boolean;
}

export const ActiveTaskDisplay = ({ task, onFinish, isLoading }: ActiveTaskDisplayProps) => {
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  useEffect(() => {
    const startTime = new Date(task.timestamp).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const diff = now - startTime;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [task.timestamp]);

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          Active Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">
              {task.task_type?.name || "Unknown Task"}
            </h3>
            <p className="text-muted-foreground">
              {task.project?.name || "No Project"}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Started at {new Date(task.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-3xl font-mono font-bold text-primary">
              {elapsedTime}
            </div>
            <Button
              onClick={onFinish}
              disabled={isLoading}
              variant="default"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Finish Task
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
