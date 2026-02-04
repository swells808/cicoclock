import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useFaceEnrollment } from '@/hooks/useFaceEnrollment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserCheck, UserX, RefreshCw, Play } from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeWithPhoto {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  face_enrollment_status: string;
}

export const FaceEnrollmentPanel = () => {
  const { company } = useCompany();
  const { enrollFace, enrolling } = useFaceEnrollment();
  const [employees, setEmployees] = useState<EmployeeWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchEmployees = async () => {
    if (!company?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, avatar_url, face_enrollment_status')
      .eq('company_id', company.id)
      .not('avatar_url', 'is', null)
      .order('display_name');

    if (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [company?.id]);

  const handleEnrollSingle = async (employee: EmployeeWithPhoto) => {
    if (!employee.avatar_url) return;
    
    setProcessingId(employee.id);
    await enrollFace(employee.id, employee.avatar_url);
    await fetchEmployees();
    setProcessingId(null);
  };

  const handleEnrollAll = async () => {
    const pending = employees.filter(e => e.face_enrollment_status === 'not_enrolled' && e.avatar_url);
    if (pending.length === 0) {
      toast.info('No employees pending enrollment');
      return;
    }

    setBulkProcessing(true);
    let success = 0;
    let failed = 0;

    for (const employee of pending) {
      setProcessingId(employee.id);
      const result = await enrollFace(employee.id, employee.avatar_url!);
      if (result) success++;
      else failed++;
    }

    setProcessingId(null);
    setBulkProcessing(false);
    await fetchEmployees();
    
    toast.success(`Enrolled ${success} employees${failed > 0 ? `, ${failed} failed` : ''}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge variant="default" className="bg-green-500"><UserCheck className="w-3 h-3 mr-1" /> Enrolled</Badge>;
      case 'failed':
        return <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">Not Enrolled</Badge>;
    }
  };

  const pendingCount = employees.filter(e => e.face_enrollment_status === 'not_enrolled').length;
  const enrolledCount = employees.filter(e => e.face_enrollment_status === 'enrolled').length;
  const failedCount = employees.filter(e => e.face_enrollment_status === 'failed').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Face Enrollment</CardTitle>
            <CardDescription>
              Enroll employee profile photos for face verification. 
              {employees.length > 0 && (
                <span className="ml-2">
                  {enrolledCount} enrolled, {pendingCount} pending, {failedCount} failed
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchEmployees} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {pendingCount > 0 && (
              <Button 
                size="sm" 
                onClick={handleEnrollAll} 
                disabled={bulkProcessing || enrolling}
              >
                {bulkProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Enroll All ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No employees with profile photos found.
          </p>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={employee.avatar_url || undefined} />
                    <AvatarFallback>
                      {employee.first_name?.[0]}{employee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {employee.display_name || `${employee.first_name} ${employee.last_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(employee.face_enrollment_status)}
                  {employee.face_enrollment_status !== 'enrolled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnrollSingle(employee)}
                      disabled={processingId === employee.id || bulkProcessing}
                    >
                      {processingId === employee.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Enroll'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
