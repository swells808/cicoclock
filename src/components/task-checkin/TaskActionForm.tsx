import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TaskType } from '@/hooks/useTaskTypes';

interface TaskActionFormProps {
  taskTypes: TaskType[];
  onSubmit: (taskTypeId: string, actionType: 'start' | 'finish') => void;
  isLoading?: boolean;
}

export const TaskActionForm = ({ taskTypes, onSubmit, isLoading = false }: TaskActionFormProps) => {
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [actionType, setActionType] = useState<'start' | 'finish'>('start');

  useEffect(() => {
    console.log('TaskActionForm: Task types available:', taskTypes.length, taskTypes);
  }, [taskTypes]);

  const handleSubmit = () => {
    console.log('TaskActionForm: Submitting with taskType:', selectedTaskType, 'action:', actionType);
    if (selectedTaskType) {
      onSubmit(selectedTaskType, actionType);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Select Activity</CardTitle>
        <p className="text-muted-foreground">Choose task type and action</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="task-type">Task Type</Label>
          {taskTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/20">
              No task types available. Please contact your administrator.
            </div>
          ) : (
            <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
              <SelectTrigger>
                <SelectValue placeholder={`Select a task type (${taskTypes.length} available)`} />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map((taskType) => (
                  <SelectItem key={taskType.id} value={taskType.id}>
                    {taskType.name} ({taskType.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-3">
          <Label>Action</Label>
          <RadioGroup value={actionType} onValueChange={(value) => setActionType(value as 'start' | 'finish')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="start" id="start" />
              <Label htmlFor="start">Starting Task</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="finish" id="finish" />
              <Label htmlFor="finish">Finishing Task</Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedTaskType || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Recording...' : `${actionType === 'start' ? 'Start' : 'Finish'} Task`}
        </Button>
      </CardContent>
    </Card>
  );
};
