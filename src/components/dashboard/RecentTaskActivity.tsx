import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { useTaskActivities } from '@/hooks/useTaskActivities';
import { Skeleton } from '@/components/ui/skeleton';

export const RecentTaskActivity: React.FC = () => {
  // Memoize the filter object to prevent infinite re-renders
  const filters = useMemo(() => ({
    startDate: new Date(new Date().setHours(0, 0, 0, 0)), // Today
  }), []);

  const { taskActivities, loading, error } = useTaskActivities(filters);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Today's Task Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeTask = taskActivities.find(
    activity => activity.action_type === 'start' &&
    !taskActivities.some(a => a.task_id === activity.task_id && a.action_type === 'finish' && a.timestamp > activity.timestamp)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Today's Task Activities
        </CardTitle>
        <CardDescription>
          {taskActivities.length} task {taskActivities.length === 1 ? 'activity' : 'activities'} recorded today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">Error loading task activities</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {activeTask && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-primary animate-pulse" />
                <span className="font-semibold text-foreground">Currently Working On</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{activeTask.task_type?.name}</span> - {activeTask.project?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Started at {format(new Date(activeTask.timestamp), 'h:mm a')}
              </p>
            </div>
          </div>
        )}

        {taskActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No task activities recorded today
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {taskActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  {activity.action_type === 'start' ? (
                    <Play className="h-4 w-4 text-green-600" />
                  ) : (
                    <Square className="h-4 w-4 text-blue-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {activity.task_type?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.project?.name} • {activity.profile?.display_name || `${activity.profile?.first_name} ${activity.profile?.last_name}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={activity.action_type === 'start' ? 'default' : 'secondary'}>
                    {activity.action_type === 'start' ? 'Started' : 'Finished'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
