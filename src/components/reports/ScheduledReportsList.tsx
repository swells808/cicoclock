import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useScheduledReports, ScheduledReport } from '@/hooks/useScheduledReports';
import { Plus, Pencil, Trash2, Mail, Calendar, Clock, Send } from 'lucide-react';
import { ScheduledReportDialog } from './ScheduledReportDialog';
import { ReportRecipientsDialog } from './ReportRecipientsDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ScheduledReportsList = () => {
  const { reports, loading, deleteReport, toggleReportStatus } = useScheduledReports();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientsDialogOpen, setRecipientsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const handleOpenDialog = (report?: ScheduledReport) => {
    setEditingReport(report || null);
    setDialogOpen(true);
  };

  const handleOpenRecipients = (reportId: string) => {
    setSelectedReportId(reportId);
    setRecipientsDialogOpen(true);
  };

  const handleSendTestEmail = async (report: ScheduledReport) => {
    setSendingTest(report.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-report', {
        body: {
          scheduled_report_id: report.id,
          recipient_email: 'test@example.com', // This will be replaced in dialog
        },
      });

      if (error) throw error;
      toast.success('Test email sent successfully');
    } catch (err) {
      console.error('Error sending test email:', err);
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(null);
    }
  };

  const formatSchedule = (report: ScheduledReport) => {
    const time = report.schedule_time?.slice(0, 5) || '08:00';
    switch (report.schedule_frequency) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Weekly on ${days[report.schedule_day_of_week || 0]} at ${time}`;
      case 'monthly':
        return `Monthly on day ${report.schedule_day_of_month || 1} at ${time}`;
      default:
        return report.schedule_frequency;
    }
  };

  const getReportTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Time Summary': 'bg-blue-500',
      'Employee Hours': 'bg-green-500',
      'Project Hours': 'bg-purple-500',
      'Overtime Report': 'bg-orange-500',
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{type}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading scheduled reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Automated Reports
            </CardTitle>
            <CardDescription>Schedule automatic email reports for your team</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No scheduled reports</p>
            <p className="mb-4">Create a schedule to automatically send reports to your team.</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Schedule
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name || 'Untitled Report'}</TableCell>
                  <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatSchedule(report)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={report.is_active}
                        onCheckedChange={(checked) => toggleReportStatus(report.id, checked)}
                      />
                      <span className={report.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                        {report.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenRecipients(report.id)}
                        title="Manage Recipients"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(report)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this scheduled report? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteReport(report.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <ScheduledReportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          report={editingReport}
        />

        <ReportRecipientsDialog
          open={recipientsDialogOpen}
          onOpenChange={setRecipientsDialogOpen}
          reportId={selectedReportId}
        />
      </CardContent>
    </Card>
  );
};
