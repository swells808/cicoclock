import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReportRecipients } from '@/hooks/useScheduledReports';
import { useUsers } from '@/hooks/useUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Mail, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
}

export const ReportRecipientsDialog = ({ open, onOpenChange, reportId }: ReportRecipientsDialogProps) => {
  const { recipients, loading, addRecipient, removeRecipient } = useReportRecipients(reportId || undefined);
  const { users } = useUsers();
  const [newEmail, setNewEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const handleAddRecipient = async () => {
    if (!newEmail.trim() && !selectedUserId) return;

    setAdding(true);
    try {
      const email = selectedUserId
        ? users.find(u => u.id === selectedUserId)?.email || ''
        : newEmail.trim();

      if (!email) {
        toast.error('Please enter or select an email');
        return;
      }

      await addRecipient(email, selectedUserId || undefined);
      setNewEmail('');
      setSelectedUserId('');
    } catch (err) {
      console.error('Error adding recipient:', err);
      toast.error('Failed to add recipient');
    } finally {
      setAdding(false);
    }
  };

  const handleSendTestEmail = async (email: string) => {
    if (!reportId) return;

    setSendingTest(email);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-report', {
        body: {
          scheduled_report_id: reportId,
          recipient_email: email,
        },
      });

      if (error) throw error;
      toast.success(`Test email sent to ${email}`);
    } catch (err) {
      console.error('Error sending test email:', err);
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Report Recipients
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add recipient form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setSelectedUserId('');
                }}
              />
            </div>
            <span className="flex items-center text-muted-foreground">or</span>
            <div className="flex-1">
              <Select
                value={selectedUserId}
                onValueChange={(value) => {
                  setSelectedUserId(value);
                  setNewEmail('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.email).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddRecipient} disabled={adding || (!newEmail && !selectedUserId)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Recipients list */}
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading recipients...</div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recipients added yet.</p>
              <p className="text-sm">Add recipients to receive this report via email.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendTestEmail(recipient.email)}
                          disabled={sendingTest === recipient.email}
                          title="Send test email"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeRecipient(recipient.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
