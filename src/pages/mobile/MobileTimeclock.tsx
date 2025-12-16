import React, { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "./MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, LogIn, LogOut, Coffee, User, CheckCircle, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";
import { QRScanner } from "@/components/task-checkin/QRScanner";

const MobileTimeclock = () => {
  const { t } = useLanguage();
  const { company, companyFeatures } = useCompany();
  const { employees, loading: employeesLoading } = useEmployees();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<any>(null);
  const [showBadgeScanner, setShowBadgeScanner] = useState(false);
  const [scanningBadge, setScanningBadge] = useState(false);
  const [activeTimeEntry, setActiveTimeEntry] = useState<any>(null);
  const [clockStatus, setClockStatus] = useState<'out' | 'in'>('out');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoAction, setPhotoAction] = useState<'clock_in' | 'clock_out' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkActiveTimeEntry = async () => {
      if (!authenticatedEmployee || !company) return;
      
      // Use edge function to check status (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('check-clock-status', {
        body: { 
          profile_id: authenticatedEmployee.id,
          company_id: company.id 
        }
      });
      
      if (data?.clocked_in && data?.time_entry) {
        setActiveTimeEntry(data.time_entry);
        setClockStatus('in');
      } else {
        setActiveTimeEntry(null);
        setClockStatus('out');
      }
    };
    checkActiveTimeEntry();
  }, [authenticatedEmployee, company]);

  const handleBadgeScan = async (scannedValue: string) => {
    setScanningBadge(true);
    try {
      // Extract profile_id from badge URL (format: .../badge/{profile_id})
      const profileId = scannedValue.includes('/badge/') 
        ? scannedValue.split('/badge/')[1].split('?')[0] 
        : scannedValue;

      const { data, error } = await supabase.functions.invoke('verify-badge', {
        body: { profile_id: profileId, company_id: company?.id }
      });

      if (error || !data?.valid) {
        toast({ 
          title: "Invalid Badge", 
          description: data?.error || "Badge verification failed", 
          variant: "destructive" 
        });
        return;
      }

      // Find matching employee and authenticate directly
      const employee = employees.find(emp => emp.id === profileId);
      if (employee) {
        setAuthenticatedEmployee(employee);
        setShowBadgeScanner(false);
        toast({ title: "Badge Verified", description: `Welcome, ${data.employee.name}!` });
      } else {
        toast({ title: "Employee Not Found", description: "Please try again", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Scan Error", description: "Failed to verify badge", variant: "destructive" });
    } finally {
      setScanningBadge(false);
    }
  };

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string | null> => {
    if (!company || !authenticatedEmployee) return null;
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const identifier = authenticatedEmployee.user_id || authenticatedEmployee.id;
      const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
      const filePath = `${company.id}/${actionPath}/${timestamp}_${identifier}.jpg`;
      const { error } = await supabase.storage
        .from('timeclock-photos')
        .upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      return filePath;
    } catch (err) {
      console.error('Photo upload error:', err);
      return null;
    }
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    const photoUrl = await uploadPhoto(photoBlob, photoAction!);
    setShowPhotoCapture(false);
    if (photoAction === 'clock_in') await performClockIn(photoUrl || undefined);
    else if (photoAction === 'clock_out') await performClockOut(photoUrl || undefined);
    setPhotoAction(null);
  };

  const performClockIn = async (photoUrl?: string) => {
    if (!authenticatedEmployee || !company) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clock-in-out', {
        body: {
          action: 'clock_in',
          profile_id: authenticatedEmployee.id,
          company_id: company.id,
          photo_url: photoUrl
        }
      });

      if (error || !data?.success) {
        console.error('Clock in error:', error || data?.error);
        toast({ 
          title: "Clock In Failed", 
          description: data?.error || "Please try again.", 
          variant: "destructive" 
        });
        return;
      }

      setActiveTimeEntry(data.data);
      setClockStatus('in');
      toast({ title: "Clocked In", description: "You have successfully clocked in." });
      // Auto-reset to badge scan after delay
      setTimeout(() => handleSignOut(), 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockIn = async () => {
    if (companyFeatures?.photo_capture) {
      setPhotoAction('clock_in');
      setShowPhotoCapture(true);
    } else {
      await performClockIn();
    }
  };

  const performClockOut = async (photoUrl?: string) => {
    if (!authenticatedEmployee || !company) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clock-in-out', {
        body: {
          action: 'clock_out',
          profile_id: authenticatedEmployee.id,
          company_id: company.id,
          photo_url: photoUrl,
          time_entry_id: activeTimeEntry?.id
        }
      });

      if (error || !data?.success) {
        console.error('Clock out error:', error || data?.error);
        toast({ 
          title: "Clock Out Failed", 
          description: data?.error || "Please try again.", 
          variant: "destructive" 
        });
        return;
      }

      setActiveTimeEntry(null);
      setClockStatus('out');
      toast({ title: "Clocked Out", description: "You have successfully clocked out." });
      // Auto-reset to badge scan after delay
      setTimeout(() => handleSignOut(), 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    if (companyFeatures?.photo_capture) {
      setPhotoAction('clock_out');
      setShowPhotoCapture(true);
    } else {
      await performClockOut();
    }
  };

  const handleBreak = async () => {
    if (!authenticatedEmployee || !company) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clock-in-out', {
        body: {
          action: 'break',
          profile_id: authenticatedEmployee.id,
          company_id: company.id
        }
      });

      if (error || !data?.success) {
        toast({ title: "Break Failed", description: data?.error || "Please try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Break Started", description: "Break time recorded." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    setAuthenticatedEmployee(null);
    setActiveTimeEntry(null);
    setClockStatus('out');
    setShowBadgeScanner(false);
  };

  return (
    <MobileLayout title="Time Clock" currentTime={currentTime}>
      <div className="p-4 space-y-4">
        {/* Employee Selection / Status */}
        {!authenticatedEmployee ? (
          <div className="space-y-4">
            {showBadgeScanner ? (
              <>
                <QRScanner
                  title="Scan Your Badge"
                  description="Point camera at your employee badge QR code"
                  onScan={handleBadgeScan}
                  isLoading={scanningBadge}
                  placeholder="Enter badge ID manually"
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowBadgeScanner(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowBadgeScanner(true)}
                className="w-full h-20 text-xl"
                variant="outline"
                disabled={employeesLoading}
              >
                <QrCode className="h-8 w-8 mr-3" />
                Scan Badge to Clock In
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Authenticated Employee Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {authenticatedEmployee.display_name || 
                       `${authenticatedEmployee.first_name} ${authenticatedEmployee.last_name}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-sm",
                        clockStatus === 'in' ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {clockStatus === 'in' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Clocked In
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4" />
                            Clocked Out
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Change
                </Button>
              </div>
            </Card>

            {/* Clock Duration */}
            {clockStatus === 'in' && activeTimeEntry && (
              <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <div className="text-center">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-1">Working Since</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {new Date(activeTimeEntry.start_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {clockStatus === 'out' ? (
                <Button
                  onClick={handleClockIn}
                  disabled={isProcessing}
                  className="w-full h-20 text-xl bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="h-8 w-8 mr-3" />
                  Clock In
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleClockOut}
                    disabled={isProcessing}
                    className="w-full h-20 text-xl bg-red-600 hover:bg-red-700"
                  >
                    <LogOut className="h-8 w-8 mr-3" />
                    Clock Out
                  </Button>
                  <Button
                    onClick={handleBreak}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full h-14 text-lg"
                  >
                    <Coffee className="h-6 w-6 mr-2" />
                    Start Break
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Photo Capture Modal */}
      <PhotoCapture
        open={showPhotoCapture}
        onCapture={handlePhotoCapture}
        onCancel={() => { setShowPhotoCapture(false); setPhotoAction(null); }}
        title={photoAction === 'clock_in' ? "Clock In Photo" : "Clock Out Photo"}
        description={photoAction === 'clock_in' 
          ? "Please take a photo to verify your clock in" 
          : "Please take a photo to verify your clock out"}
      />
    </MobileLayout>
  );
};

export default MobileTimeclock;
