import { useReportExecutionLog } from '@/hooks/useScheduledReports';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReportExecutionHistoryProps {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportExecutionHistory = ({ reportId, open, onOpenChange }: ReportExecutionHistoryProps) => {
  const { logs, loading } = useReportExecutionLog(reportId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execution History</DialogTitle>
          <DialogDescription>
            View the execution history for this scheduled report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading history...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No execution history yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.executed_at), 'PPp')}
                        </span>
                      </div>
                      <div className="text-sm flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Sent to {log.recipients_count} recipient{log.recipients_count !== 1 ? 's' : ''}
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-500 mt-2">
                          Error: {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
