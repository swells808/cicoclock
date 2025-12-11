import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { useScheduledReports } from '@/hooks/useScheduledReports';
import { toast } from 'sonner';

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  reportType: string;
}

export const ReportPreviewDialog = ({ open, onOpenChange, reportId, reportType }: ReportPreviewDialogProps) => {
  const { getReportPreview, sendTestEmail } = useScheduledReports();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const loadPreview = async () => {
    setLoading(true);
    try {
      const html = await getReportPreview(reportId);
      setHtmlContent(html);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && reportId) {
      loadPreview();
    }
  }, [open, reportId]);

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      await sendTestEmail(reportId, testEmail || undefined);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test:', error);
    } finally {
      setSendingTest(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setHtmlContent('');
      setTestEmail('');
    }
    onOpenChange(isOpen);
  };

  const reportTypeNames: Record<string, string> = {
    employee_timecard: "Daily Employee Timecard",
    project_timecard: "Weekly Project Timecard",
    weekly_payroll: "Weekly Payroll Report",
    monthly_project_billing: "Monthly Project Billing"
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Preview</DialogTitle>
          <DialogDescription>
            Preview of {reportTypeNames[reportType] || reportType} report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading preview...</span>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden bg-white">
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Send Test Email</h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="testEmail" className="text-sm text-muted-foreground mb-1 block">
                      Email address (optional - defaults to your email)
                    </Label>
                    <Input
                      id="testEmail"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSendTest}
                    disabled={sendingTest}
                    className="self-end"
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
