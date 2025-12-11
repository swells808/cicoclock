import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { TaskType } from "@/hooks/useTaskTypes";

interface Project {
  id: string;
  name: string;
}

interface TaskSelectionPanelProps {
  taskTypes: TaskType[];
  projects: Project[];
  onStartTask: (taskTypeId: string, projectId: string, actionType: 'start') => void;
  isLoading?: boolean;
  hasActiveTask?: boolean;
}

export const TaskSelectionPanel = ({
  taskTypes,
  projects,
  onStartTask,
  isLoading,
  hasActiveTask,
}: TaskSelectionPanelProps) => {
  const [selectedTaskType, setSelectedTaskType] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");

  const handleStartTask = () => {
    if (selectedTaskType && selectedProject) {
      onStartTask(selectedTaskType, selectedProject, 'start');
      setSelectedTaskType("");
      setSelectedProject("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Start New Task</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-type">Task Type</Label>
          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger id="task-type">
              <SelectValue placeholder="Select a task type" />
            </SelectTrigger>
            <SelectContent>
              {taskTypes.map((taskType) => (
                <SelectItem key={taskType.id} value={taskType.id}>
                  {taskType.name} ({taskType.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleStartTask}
          disabled={!selectedTaskType || !selectedProject || isLoading || hasActiveTask}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Task
            </>
          )}
        </Button>

        {hasActiveTask && (
          <p className="text-sm text-muted-foreground text-center">
            Finish your current task before starting a new one
          </p>
        )}

        {taskTypes.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center">
            No task types configured. Contact your administrator.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
