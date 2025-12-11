import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ entryId: string; error: string }>;
}

export const PhotoMigrationPanel = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMigration = async () => {
    setIsRunning(true);
    setError(null);
    setStats(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'migrate-timeclock-photos',
        {
          method: 'POST',
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStats(data.stats);

      toast({
        title: 'Migration Complete',
        description: data.message,
      });

    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Failed to run migration');
      toast({
        title: 'Migration Failed',
        description: err.message || 'An error occurred during migration',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Photo Migration
        </CardTitle>
        <CardDescription>
          Migrate timeclock photos from old URL format to new storage path format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This utility will scan all time entries with photo URLs and convert them to the new 
          storage path format. Photos are stored in the pattern: 
          <code className="mx-1 px-1 bg-muted rounded">company_id/action/timestamp_user_id.jpg</code>
        </p>

        <Button 
          onClick={startMigration} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Start Photo Migration
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Migration Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stats && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Migration Complete</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1 text-sm">
                <p>Total entries processed: {stats.total}</p>
                <p>Successfully migrated: {stats.migrated}</p>
                <p>Skipped (already migrated): {stats.skipped}</p>
                {stats.failed > 0 && (
                  <p className="text-destructive">Failed: {stats.failed}</p>
                )}
              </div>
              {stats.errors && stats.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc list-inside text-xs">
                    {stats.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err.entryId}: {err.error}</li>
                    ))}
                    {stats.errors.length > 5 && (
                      <li>...and {stats.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
