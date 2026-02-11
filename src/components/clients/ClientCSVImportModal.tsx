import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface ClientCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CSVRow {
  company_name?: string;
  contact_person_name?: string;
  contact_person_title?: string;
  email?: string;
  phone?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export const ClientCSVImportModal: React.FC<ClientCSVImportModalProps> = ({
  open,
  onOpenChange,
  onImportComplete
}) => {
  const { company } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        const validationErrors: string[] = [];

        data.forEach((row, index) => {
          if (!row.company_name?.trim()) {
            validationErrors.push(`Row ${index + 2}: Missing company_name`);
          }
        });

        setErrors(validationErrors);
        setParsedData(data);
      },
      error: (error) => {
        setErrors([`Failed to parse CSV: ${error.message}`]);
      }
    });
  };

  const handleImport = async () => {
    if (!company?.id || parsedData.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of parsedData) {
        const { error } = await supabase
          .from('clients')
          .insert({
            company_id: company.id,
            company_name: row.company_name || '',
            contact_person_name: row.contact_person_name || null,
            contact_person_title: row.contact_person_title || null,
            email: row.email || null,
            phone: row.phone || null,
            street_address: row.street_address || null,
            city: row.city || null,
            state_province: row.state_province || null,
            postal_code: row.postal_code || null,
            country: row.country || null,
            notes: row.notes || null,
          });

        if (error) {
          errorCount++;
          console.error('Import error:', error);
        } else {
          successCount++;
        }
      }

      toast.success(`Imported ${successCount} client(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      onImportComplete();
      onOpenChange(false);
      resetState();
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setParsedData([]);
    setErrors([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Clients from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {fileName ? (
              <p className="text-sm font-medium text-foreground">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click to upload CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required: company_name. Optional: contact_person_name, email, phone, street_address, city, state_province, postal_code, country, notes
                </p>
              </>
            )}
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {parsedData.length > 0 && errors.length === 0 && (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  {parsedData.length} client(s) ready to import
                </AlertDescription>
              </Alert>

              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.company_name || '—'}</TableCell>
                        <TableCell>{row.contact_person_name || '—'}</TableCell>
                        <TableCell>{row.email || '—'}</TableCell>
                        <TableCell>{row.phone || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing 10 of {parsedData.length} rows
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={importing || parsedData.length === 0 || errors.length > 0}
          >
            {importing ? 'Importing...' : `Import ${parsedData.length} Client(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
