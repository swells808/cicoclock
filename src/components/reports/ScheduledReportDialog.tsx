import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useScheduledReports, ScheduledReport } from '@/hooks/useScheduledReports';
import { useReportRecipients } from '@/hooks/useScheduledReports';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

interface ScheduledReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScheduledReport | null;
}

interface Recipient {
  email: string;
  profile_id?: string;
  id?: string; // existing recipient id from DB
}

const REPORT_TYPES = [
  { value: 'employee_timecard', label: 'Employee Timecard' },
  { value: 'project_timecard', label: 'Project Timecard' },
  { value: 'weekly_payroll', label: 'Weekly Payroll' },
  { value: 'monthly_project_billing', label: 'Monthly Project Billing' },
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
  const { data: profile } = useProfile();
  const { createReport, updateReport } = useScheduledReports();
  const { recipients: existingRecipients, refetch: fetchRecipients, addRecipient, removeRecipient } = useReportRecipients(report?.id || '');
  const { departments } = useDepartments();
  const { users } = useUsers();
  const [saving, setSaving] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    report_type: 'employee_timecard',
    schedule_frequency: 'weekly',
    schedule_time: '08:00',
    schedule_day_of_week: 1,
    schedule_day_of_month: 1,
    report_scope: 'all' as 'all' | 'department',
    department_ids: [] as string[],
  });

  useEffect(() => {
    if (report) {
      const config = report.report_config as { scope?: string; department_ids?: string[] } | null;
      setFormData({
        report_type: report.report_type,
        schedule_frequency: report.schedule_frequency,
        schedule_time: report.schedule_time?.slice(0, 5) || '08:00',
        schedule_day_of_week: report.schedule_day_of_week ?? 1,
        schedule_day_of_month: report.schedule_day_of_month ?? 1,
        report_scope: (config?.scope as 'all' | 'department') || 'all',
        department_ids: config?.department_ids || [],
      });
      fetchRecipients();
    } else {
      setFormData({
        report_type: 'employee_timecard',
        schedule_frequency: 'weekly',
        schedule_time: '08:00',
        schedule_day_of_week: 1,
        schedule_day_of_month: 1,
        report_scope: 'all',
        department_ids: [],
      });
      setRecipients([]);
    }
  }, [report, open]);

  // Sync existing recipients to local state when they load
  useEffect(() => {
    if (existingRecipients.length > 0) {
      setRecipients(existingRecipients.map(r => ({
        email: r.email,
        profile_id: r.profile_id || undefined,
        id: r.id,
      })));
    }
  }, [existingRecipients]);

  const handleDepartmentToggle = (departmentId: string) => {
    setFormData(prev => ({
      ...prev,
      department_ids: prev.department_ids.includes(departmentId)
        ? prev.department_ids.filter(id => id !== departmentId)
        : [...prev.department_ids, departmentId],
    }));
  };

  const addEmailRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Check for duplicates
    if (recipients.some(r => r.email.toLowerCase() === email)) {
      toast.error('This email is already added');
      return;
    }
    
    setRecipients([...recipients, { email }]);
    setEmailInput('');
  };

  const addUserRecipient = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    if (!selectedUser || !selectedUser.email) return;
    
    // Check for duplicates
    if (recipients.some(r => r.email.toLowerCase() === selectedUser.email?.toLowerCase())) {
      toast.error('This user is already added');
      setSelectedUserId('');
      return;
    }
    
    setRecipients([...recipients, { 
      email: selectedUser.email, 
      profile_id: selectedUser.id 
    }]);
    setSelectedUserId('');
  };

  const removeLocalRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

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
        report_config: {
          scope: formData.report_scope,
          department_ids: formData.report_scope === 'department' ? formData.department_ids : [],
        },
        created_by: profile?.id || null,
      };

      let reportId: string;

      if (report) {
        await updateReport(report.id, payload);
        reportId = report.id;
        
        // Handle recipient changes for existing report
        const existingEmails = existingRecipients.map(r => r.email.toLowerCase());
        const newEmails = recipients.map(r => r.email.toLowerCase());
        
        // Remove recipients that were deleted
        for (const existing of existingRecipients) {
          if (!newEmails.includes(existing.email.toLowerCase())) {
            await removeRecipient(existing.id);
          }
        }
        
        // Add new recipients
        for (const recipient of recipients) {
          if (!existingEmails.includes(recipient.email.toLowerCase())) {
            await addRecipient(recipient.email, recipient.profile_id);
          }
        }
      } else {
        const newReport = await createReport(payload);
        reportId = newReport.id;
        
        // Add all recipients to the new report
        for (const recipient of recipients) {
          // We need to add recipients using the new report ID
          // Since useReportRecipients is tied to report?.id, we need to add directly
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase.from('scheduled_report_recipients').insert({
            scheduled_report_id: reportId,
            email: recipient.email,
            profile_id: recipient.profile_id || null,
          });
        }
      }
      
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving report:', err);
      toast.error('Failed to save scheduled report');
    } finally {
      setSaving(false);
    }
  };

  // Filter for active users with valid emails, sorted alphabetically
  const usersWithEmails = users
    .filter(u => u.status === 'Active')
    .filter(u => u.email && u.email !== 'N/A' && u.email.includes('@'))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Report Scope</Label>
            <RadioGroup
              value={formData.report_scope}
              onValueChange={(value: 'all' | 'department') => setFormData({ ...formData, report_scope: value, department_ids: [] })}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="scope-all" />
                <Label htmlFor="scope-all" className="font-normal cursor-pointer">All Employees</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="scope-department" />
                <Label htmlFor="scope-department" className="font-normal cursor-pointer">By Department</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.report_scope === 'department' && (
            <div className="space-y-2 pl-6">
              <Label>Select Departments</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {departments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No departments available</p>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept.id}`}
                        checked={formData.department_ids.includes(dept.id)}
                        onCheckedChange={() => handleDepartmentToggle(dept.id)}
                      />
                      <Label htmlFor={`dept-${dept.id}`} className="font-normal cursor-pointer">
                        {dept.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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

          {/* Recipients Section */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Recipients</Label>
            
            {/* Add by email */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmailRecipient();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addEmailRecipient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Add from users */}
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={addUserRecipient}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Or select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithEmails.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* List of recipients */}
            {recipients.length > 0 && (
              <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                {recipients.map((recipient) => (
                  <div key={recipient.email} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm truncate">{recipient.email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLocalRecipient(recipient.email)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">No recipients added yet</p>
            )}
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