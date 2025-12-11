import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCertifications, Certification } from '@/hooks/useCertifications';
import { Plus, Pencil, Trash2, Award, AlertTriangle } from 'lucide-react';
import { format, isAfter, isBefore, addMonths } from 'date-fns';
import { CertificationDialog } from './CertificationDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CertificationsListProps {
  profileId: string;
}

export const CertificationsList = ({ profileId }: CertificationsListProps) => {
  const { certifications, loading, createCertification, updateCertification, deleteCertification } = useCertifications(profileId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  const handleOpenDialog = (cert?: Certification) => {
    setEditingCert(cert || null);
    setDialogOpen(true);
  };

  const handleSave = async (data: Omit<Certification, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'status'>) => {
    if (editingCert) {
      await updateCertification(editingCert.id, data);
    } else {
      await createCertification(data);
    }
    setDialogOpen(false);
  };

  const getStatusBadge = (cert: Certification) => {
    const now = new Date();
    const expiryDate = cert.expiry_date ? new Date(cert.expiry_date) : null;
    
    if (!expiryDate) {
      return <Badge variant="secondary">No Expiry</Badge>;
    }
    
    if (isBefore(expiryDate, now)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (isBefore(expiryDate, addMonths(now, 1))) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Expiring Soon</Badge>;
    }
    
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading certifications...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Certifications & Licenses</h3>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Certification
        </Button>
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg">
          No certifications on file. Add certifications to track employee qualifications.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certification</TableHead>
              <TableHead>Certifier</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certifications.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{cert.cert_name}</div>
                    <div className="text-sm text-muted-foreground">{cert.cert_code}</div>
                  </div>
                </TableCell>
                <TableCell>{cert.certifier_name || '—'}</TableCell>
                <TableCell>
                  {cert.issue_date ? format(new Date(cert.issue_date), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell>
                  {cert.expiry_date ? format(new Date(cert.expiry_date), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>{getStatusBadge(cert)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cert)}>
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
                          <AlertDialogTitle>Delete Certification</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{cert.cert_name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCertification(cert.id)}>Delete</AlertDialogAction>
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

      <CertificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        certification={editingCert}
        profileId={profileId}
        onSave={handleSave}
      />
    </div>
  );
};
