import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, User, Building2, IdCard, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VerificationResult {
  valid: boolean;
  employee?: {
    name: string;
    employee_id: string;
    department: string | null;
    status: string;
  };
  company?: string;
  error?: string;
}

const BadgeVerification = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyBadge = async () => {
      if (!profileId || !companyId) {
        setError('Invalid badge verification link. Missing required parameters.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-badge', {
          body: { profile_id: profileId, company_id: companyId }
        });

        if (fnError) {
          setError('Failed to verify badge. Please try again.');
          console.error('Verification error:', fnError);
        } else {
          setResult(data);
        }
      } catch (err) {
        setError('An unexpected error occurred during verification.');
        console.error('Verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyBadge();
  }, [profileId, companyId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold">Badge Verification</CardTitle>
          <p className="text-muted-foreground text-sm">Employee Identity Verification</p>
        </CardHeader>
        
        <CardContent className="pt-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verifying badge...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-destructive mb-2">Verification Failed</h3>
              <p className="text-muted-foreground text-center text-sm">{error}</p>
            </div>
          )}

          {result && !loading && (
            <>
              {result.valid ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 mb-4">
                      <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                      Verified Employee
                    </h3>
                    <Badge variant="outline" className="mt-2 border-green-500 text-green-600">
                      {result.employee?.status?.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Employee Name</p>
                        <p className="font-medium">{result.employee?.name}</p>
                      </div>
                    </div>

                    {result.employee?.employee_id && (
                      <div className="flex items-center gap-3">
                        <IdCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Employee ID</p>
                          <p className="font-medium">{result.employee.employee_id}</p>
                        </div>
                      </div>
                    )}

                    {result.employee?.department && (
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{result.employee.department}</p>
                        </div>
                      </div>
                    )}

                    {result.company && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="font-medium">{result.company}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Verified at {new Date().toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-full bg-destructive/10 p-4 mb-4">
                    <XCircle className="h-12 w-12 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold text-destructive mb-2">Invalid Badge</h3>
                  <p className="text-muted-foreground text-center text-sm">
                    {result.error || 'This badge could not be verified. It may be expired or invalid.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BadgeVerification;
