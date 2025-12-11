import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicCertifications } from '@/components/badge/PublicCertifications';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Building, Hash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BadgeProfile {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  employee_id: string | null;
  department: {
    name: string;
  } | null;
  company: {
    id: string;
    company_name: string;
    company_logo_url: string | null;
    website: string | null;
    phone: string;
  } | null;
}

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

const PublicBadge: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<BadgeProfile | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [badgeTemplate, setBadgeTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchBadgeData = async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    console.log('[PUBLIC_BADGE] Starting fetch for profileId:', profileId);

    if (!profileId) {
      console.error('[PUBLIC_BADGE] No profile ID provided');
      setError('Profile ID not provided');
      setLoading(false);
      return;
    }

    try {
      console.log('[PUBLIC_BADGE] Calling generate-badge function...');
      const { data, error: fetchError } = await supabase.functions.invoke('generate-badge', {
        body: { profileId }
      });

      console.log('[PUBLIC_BADGE] Function response:', {
        success: data?.success,
        hasProfile: !!data?.profile,
        hasCertifications: !!data?.certifications,
        hasTemplate: !!data?.badgeTemplate,
        error: fetchError
      });

      if (fetchError) {
        console.error('[PUBLIC_BADGE] Function error:', fetchError);
        throw fetchError;
      }

      if (!data.success || !data.profile) {
        console.error('[PUBLIC_BADGE] Invalid response data:', data);
        throw new Error('Profile not found');
      }

      console.log('[PUBLIC_BADGE] Setting state with data...');
      setProfile(data.profile);
      setCertifications(data.certifications || []);
      setBadgeTemplate(data.badgeTemplate);
      setRetryCount(0);

      console.log('[PUBLIC_BADGE] State set successfully');
    } catch (err: any) {
      console.error('[PUBLIC_BADGE] Error fetching badge data:', err);

      // Auto-retry on network errors (up to 3 times)
      if (retryCount < 3 && (err.message?.includes('network') || err.message?.includes('timeout'))) {
        console.log(`[PUBLIC_BADGE] Retrying... (${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchBadgeData(true), 2000);
        return;
      }

      setError('Badge not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadgeData();
  }, [profileId]);

  const handleRetry = () => {
    setRetryCount(0);
    fetchBadgeData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Badge Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The requested employee badge could not be found or is not available.
          </p>
          <Button onClick={handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  const displayName = profile.display_name || `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Employee Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Header with Avatar and Name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={profile.avatar_url || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {displayName
                    .split(' ')
                    .map(name => name.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">{displayName}</h2>
                {profile.department && (
                  <p className="text-lg text-muted-foreground">{profile.department.name}</p>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4 pt-2 border-t">
              {profile.company && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{profile.company.company_name}</p>
                  </div>
                </div>
              )}

              {profile.employee_id && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{profile.employee_id}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <PublicCertifications certifications={certifications} />
      </div>
    </div>
  );
};

export default PublicBadge;
