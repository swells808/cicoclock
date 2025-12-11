import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScheduledReports, ScheduledReport } from '@/hooks/useScheduledReports';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ScheduledReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScheduledReport | null;
}

const REPORT_TYPES = [
  'Time Summary',
  'Employee Hours',
  'Project Hours',
  'Overtime Report',
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export const ScheduledReportDialog = ({ open, onOpenChange, report }: ScheduledReportDialogProps) => {
  const { user } = useAuth();
  const { createReport, updateReport } = useScheduledReports();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    report_type: 'Time Summary',
    schedule_frequency: 'weekly',
    schedule_time: '08:00',
    schedule_day_of_week: 1,
    schedule_day_of_month: 1,
  });

  useEffect(() => {
    if (report) {
      setFormData({
        report_type: report.report_type,
        schedule_frequency: report.schedule_frequency,
        schedule_time: report.schedule_time?.slice(0, 5) || '08:00',
        schedule_day_of_week: report.schedule_day_of_week ?? 1,
        schedule_day_of_month: report.schedule_day_of_month ?? 1,
      });
    } else {
      setFormData({
        report_type: 'Time Summary',
        schedule_frequency: 'weekly',
        schedule_time: '08:00',
        schedule_day_of_week: 1,
        schedule_day_of_month: 1,
      });
    }
  }, [report, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        report_type: formData.report_type,
        schedule_frequency: formData.schedule_frequency,
        schedule_time: formData.schedule_time + ':00',
        schedule_day_of_week: formData.schedule_frequency === 'weekly' ? formData.schedule_day_of_week : null,
        schedule_day_of_month: formData.schedule_frequency === 'monthly' ? formData.schedule_day_of_month : null,
        is_active: true,
        report_config: {},
        created_by: user?.id || null,
      };

      if (report) {
        await updateReport(report.id, payload);
      } else {
        await createReport(payload);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving report:', err);
      toast.error('Failed to save scheduled report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{report ? 'Edit Scheduled Report' : 'New Scheduled Report'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report_type">Report Type</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData({ ...formData, report_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule_frequency">Frequency</Label>
            <Select
              value={formData.schedule_frequency}
              onValueChange={(value) => setFormData({ ...formData, schedule_frequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.schedule_frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="schedule_day_of_week">Day of Week</Label>
              <Select
                value={String(formData.schedule_day_of_week)}
                onValueChange={(value) => setFormData({ ...formData, schedule_day_of_week: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.schedule_frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="schedule_day_of_month">Day of Month</Label>
              <Select
                value={String(formData.schedule_day_of_month)}
                onValueChange={(value) => setFormData({ ...formData, schedule_day_of_month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="schedule_time">Time</Label>
            <Input
              id="schedule_time"
              type="time"
              value={formData.schedule_time}
              onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : report ? 'Update' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
