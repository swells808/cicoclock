import { useState } from 'react';
import { useScheduledReports, ScheduledReport } from '@/hooks/useScheduledReports';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Calendar, Clock, Trash2, Edit, Eye, Send, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduledReportDialog } from './ScheduledReportDialog';
import { ReportExecutionHistory } from './ReportExecutionHistory';
import { ReportPreviewDialog } from './ReportPreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const ScheduledReportsManager = () => {
  const { reports, loading, deleteReport, toggleReportStatus, sendTestEmail } = useScheduledReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [historyReportId, setHistoryReportId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sendingTestId, setSendingTestId] = useState<string | null>(null);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [previewReportType, setPreviewReportType] = useState<string>('');
  const { toast } = useToast();

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingReport(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteReport(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSendTest = async (reportId: string) => {
    setSendingTestId(reportId);
    try {
      await sendTestEmail(reportId);
      toast({
        title: "Test email sent",
        description: "Check your email inbox for the test report.",
      });
    } catch (error) {
      toast({
        title: "Failed to send test email",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingTestId(null);
    }
  };

  const handlePreview = (report: ScheduledReport) => {
    setPreviewReportId(report.id);
    setPreviewReportType(report.report_type);
  };

  const getReportTypeName = (type: string) => {
    const types: Record<string, string> = {
      employee_timecard: 'Daily Timecard',
      project_timecard: 'Weekly Project Timecard',
      weekly_payroll: 'Weekly Payroll',
      monthly_project_billing: 'Monthly Project Billing',
    };
    return types[type] || type;
  };

  const getFrequencyName = (frequency: string) => {
    const frequencies: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      'bi-weekly': 'Bi-Weekly',
      monthly: 'Monthly',
    };
    return frequencies[frequency] || frequency;
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  if (loading) {
    return <div className="text-center py-8">Loading scheduled reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Reports</h2>
          <p className="text-muted-foreground">
            Schedule reports to be automatically generated and emailed
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Scheduled Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Reports</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automated report to get started
            </p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Scheduled Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {report.name || getReportTypeName(report.report_type)}
                      <Badge variant={report.is_active ? 'default' : 'secondary'}>
                        {report.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {getFrequencyName(report.schedule_frequency)}
                        {report.schedule_day_of_week !== null &&
                          ` on ${getDayName(report.schedule_day_of_week)}`}
                        {report.schedule_day_of_month !== null &&
                          ` on day ${report.schedule_day_of_month}`}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {report.schedule_time}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={report.is_active}
                      onCheckedChange={(checked) => toggleReportStatus(report.id, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(report)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTest(report.id)}
                    disabled={sendingTestId === report.id}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendingTestId === report.id ? 'Sending...' : 'Test'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(report)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryReportId(report.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmId(report.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScheduledReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={editingReport}
      />

      {historyReportId && (
        <ReportExecutionHistory
          reportId={historyReportId}
          open={!!historyReportId}
          onOpenChange={(open) => !open && setHistoryReportId(null)}
        />
      )}

      {previewReportId && (
        <ReportPreviewDialog
          open={!!previewReportId}
          onOpenChange={(open) => !open && setPreviewReportId(null)}
          reportId={previewReportId}
          reportType={previewReportType}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled report and all its execution history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
