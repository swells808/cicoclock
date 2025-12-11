import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';

interface Certification {
  id: string;
  cert_name: string;
  cert_code: string;
  cert_number: string | null;
  certifier_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
}

interface PublicCertificationsProps {
  certifications: Certification[];
}

export const PublicCertifications: React.FC<PublicCertificationsProps> = ({ certifications }) => {

  const getCertificationStatus = (expiry_date: string | null) => {
    if (!expiry_date) return 'valid';

    const expiryDate = new Date(expiry_date);
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(expiryDate, today)) {
      return 'expired';
    } else if (isBefore(expiryDate, thirtyDaysFromNow)) {
      return 'expiring';
    } else {
      return 'valid';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expiring':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'valid':
        return 'default';
      case 'expiring':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (certifications.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No certifications available for this employee.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Certifications ({certifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {certifications.map((cert) => {
            const status = getCertificationStatus(cert.expiry_date);

            return (
              <div key={cert.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-card">
                <div className="mt-1">
                  {getStatusIcon(status)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{cert.cert_name}</h3>
                    <Badge variant={getStatusVariant(status) as "default" | "secondary" | "destructive" | "outline"}>
                      {status === 'valid' ? 'Valid' : status === 'expiring' ? 'Expiring Soon' : 'Expired'}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Code: {cert.cert_code}</p>
                    {cert.cert_number && <p>Number: {cert.cert_number}</p>}
                    {cert.certifier_name && <p>Issuer: {cert.certifier_name}</p>}

                    <div className="flex items-center gap-4">
                      {cert.issue_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {format(new Date(cert.issue_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {cert.expiry_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {format(new Date(cert.expiry_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
