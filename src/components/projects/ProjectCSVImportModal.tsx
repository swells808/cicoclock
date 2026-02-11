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

interface ProjectCSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CSVRow {
  name?: string;
  project_number?: string;
  address?: string;
  description?: string;
  [key: string]: string | undefined;
}

export const ProjectCSVImportModal: React.FC<ProjectCSVImportModalProps> = ({
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
          if (!row.name?.trim()) {
            validationErrors.push(`Row ${index + 2}: Missing name`);
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
          .from('projects')
          .insert({
            company_id: company.id,
            name: row.name || '',
            project_number: row.project_number || null,
            address: row.address || null,
            description: row.description || null,
          });

        if (error) {
          errorCount++;
          console.error('Import error:', error);
        } else {
          successCount++;
        }
      }

      toast.success(`Imported ${successCount} job(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
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
            Import Jobs from CSV
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
                  Upload a .csv file with job/project data
                </p>
              </>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium text-foreground">CSV Format Instructions</p>
            <p className="text-muted-foreground">Your CSV file must include a header row. The following columns are supported:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-xs">
              <li><span className="font-semibold text-foreground">name</span> — <span className="text-destructive">required</span> (job/project name)</li>
              <li><span className="font-semibold text-foreground">project_number</span> — optional</li>
              <li><span className="font-semibold text-foreground">address</span> — optional</li>
              <li><span className="font-semibold text-foreground">description</span> — optional</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">Example: <code className="bg-muted px-1 py-0.5 rounded text-foreground">name,project_number,address</code></p>
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
                  {parsedData.length} job(s) ready to import
                </AlertDescription>
              </Alert>

              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Job #</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.name || '—'}</TableCell>
                        <TableCell>{row.project_number || '—'}</TableCell>
                        <TableCell>{row.address || '—'}</TableCell>
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
            {importing ? 'Importing...' : `Import ${parsedData.length} Job(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
