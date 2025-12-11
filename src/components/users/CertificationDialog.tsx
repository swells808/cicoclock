import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certification } from '@/hooks/useCertifications';
import { toast } from 'sonner';

interface CertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certification: Certification | null;
  profileId: string;
  onSave: (data: Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'status'>) => Promise<void>;
}

export const CertificationDialog = ({
  open,
  onOpenChange,
  certification,
  profileId,
  onSave,
}: CertificationDialogProps) => {
  const [formData, setFormData] = useState({
    cert_code: '',
    cert_name: '',
    certifier_name: '',
    cert_number: '',
    issue_date: '',
    expiry_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (certification) {
      setFormData({
        cert_code: certification.cert_code || '',
        cert_name: certification.cert_name || '',
        certifier_name: certification.certifier_name || '',
        cert_number: certification.cert_number || '',
        issue_date: certification.issue_date || '',
        expiry_date: certification.expiry_date || '',
      });
    } else {
      setFormData({
        cert_code: '',
        cert_name: '',
        certifier_name: '',
        cert_number: '',
        issue_date: '',
        expiry_date: '',
      });
    }
  }, [certification, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cert_code.trim() || !formData.cert_name.trim()) {
      toast.error('Certification code and name are required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        profile_id: profileId,
        cert_code: formData.cert_code.trim(),
        cert_name: formData.cert_name.trim(),
        certifier_name: formData.certifier_name.trim() || null,
        cert_number: formData.cert_number.trim() || null,
        issue_date: formData.issue_date || null,
        expiry_date: formData.expiry_date || undefined,
      });
      toast.success(certification ? 'Certification updated' : 'Certification added');
    } catch (error) {
      toast.error('Failed to save certification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{certification ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cert_code">Certification Code *</Label>
              <Input
                id="cert_code"
                value={formData.cert_code}
                onChange={(e) => setFormData({ ...formData, cert_code: e.target.value })}
                placeholder="e.g., OSHA-30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert_name">Certification Name *</Label>
              <Input
                id="cert_name"
                value={formData.cert_name}
                onChange={(e) => setFormData({ ...formData, cert_name: e.target.value })}
                placeholder="e.g., OSHA 30-Hour Safety"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="certifier_name">Certifying Organization</Label>
              <Input
                id="certifier_name"
                value={formData.certifier_name}
                onChange={(e) => setFormData({ ...formData, certifier_name: e.target.value })}
                placeholder="e.g., OSHA, Red Cross"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert_number">Certificate Number</Label>
              <Input
                id="cert_number"
                value={formData.cert_number}
                onChange={(e) => setFormData({ ...formData, cert_number: e.target.value })}
                placeholder="Certificate ID or number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave blank if no expiration</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : certification ? 'Update' : 'Add Certification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
