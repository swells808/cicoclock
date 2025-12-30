import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { PasswordDialog } from "@/components/PasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { TimeclockHeader } from "@/components/timeclock/TimeclockHeader";
import { TimeclockMainCard } from "@/components/timeclock/TimeclockMainCard";
import { TimeclockFooter } from "@/components/timeclock/TimeclockFooter";
import { PinInput } from "@/components/timeclock/PinInput";
import { QRScanner } from "@/components/task-checkin/QRScanner";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";

const Timeclock = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { company, companyFeatures } = useCompany();
  const { employees, loading: employeesLoading, authenticatePin } = useEmployees();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showBadgeScanner, setShowBadgeScanner] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [scanningBadge, setScanningBadge] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState<any>(null);
  const [clockStatus, setClockStatus] = useState<'out' | 'in'>('out');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoAction, setPhotoAction] = useState<'clock_in' | 'clock_out' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track if we've already triggered auto-clock for this authenticated employee
  const autoClockTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check active time entry and auto-trigger clock action after badge scan
  useEffect(() => {
    const checkAndAutoTrigger = async () => {
      if (!authenticatedEmployee) {
        autoClockTriggeredRef.current = null;
        return;
      }
      
      // Check active time entry
      // Query by profile_id to support employees without auth accounts
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('profile_id', authenticatedEmployee.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const hasActiveEntry = data && !error;
      setActiveTimeEntry(hasActiveEntry ? data : null);
      setClockStatus(hasActiveEntry ? 'in' : 'out');
      
      // Auto-trigger clock action if not already triggered for this employee
      if (autoClockTriggeredRef.current !== authenticatedEmployee.id) {
        autoClockTriggeredRef.current = authenticatedEmployee.id;
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          if (hasActiveEntry) {
            // Employee is clocked in, trigger clock out
            handleClockOut();
          } else {
            // Employee is clocked out, trigger clock in
            handleClockIn();
          }
        }, 100);
      }
    };
    
    checkAndAutoTrigger();
  }, [authenticatedEmployee]);

  const isActionEnabled = authenticatedEmployee !== null;
  const isPinRequired = companyFeatures?.employee_pin;

  // Reset screen for next user
  const resetForNextUser = () => {
    setSelectedEmployee("");
    setAuthenticatedEmployee(null);
    setActiveTimeEntry(null);
    setClockStatus('out');
    setShowPhotoCapture(false);
    setPhotoAction(null);
    setIsProcessing(false);
    autoClockTriggeredRef.current = null;
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setAuthenticatedEmployee(null);
    setPinError(null);
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && employee.pin && isPinRequired) { setShowPinInput(true); } else { setAuthenticatedEmployee(employee); }
  };

  const handlePinEntered = async (pin: string): Promise<boolean> => {
    if (!selectedEmployee) return false;
    setCheckingPin(true);
    setPinError(null);
    try {
      const success = await authenticatePin(selectedEmployee, pin);
      if (success) { const employee = employees.find(emp => emp.id === selectedEmployee); setAuthenticatedEmployee(employee); setShowPinInput(false); return true; }
      else { setPinError("Invalid PIN. Please try again."); return false; }
    } catch (error) { setPinError("Authentication failed. Please try again."); return false; }
    finally { setCheckingPin(false); }
  };

  const handlePinCancel = () => { setShowPinInput(false); setSelectedEmployee(""); setPinError(null); };

  const handleBadgeScan = async (scannedValue: string) => {
    console.log('[Timeclock] handleBadgeScan called with:', scannedValue);
    
    // Guard: ensure company is loaded
    if (!company?.id) {
      console.log('[Timeclock] Company not loaded yet');
      toast({ title: "Loading", description: "Please wait for company data to load", variant: "destructive" });
      return;
    }

    setScanningBadge(true);
    try {
      // Extract profileId from badge URL or use raw value
      const profileId = scannedValue.includes('/badge/') 
        ? scannedValue.split('/badge/')[1].split('?')[0].trim()
        : scannedValue.trim();

      console.log('[Timeclock] Extracted profileId:', profileId);
      console.log('[Timeclock] Company ID:', company.id);

      if (!profileId) {
        toast({ title: "Invalid Badge", description: "Could not read badge ID", variant: "destructive" });
        return;
      }

      console.log('[Timeclock] Calling verify-badge with:', { profile_id: profileId, company_id: company.id });
      
      const { data, error } = await supabase.functions.invoke('verify-badge', { 
        body: { profile_id: profileId, company_id: company.id } 
      });
      
      console.log('[Timeclock] verify-badge response:', { data, error });

      if (error || !data?.valid) { 
        console.log('[Timeclock] Badge validation failed:', { error, valid: data?.valid, dataError: data?.error });
        toast({ title: "Invalid Badge", description: data?.error || "Badge not found or inactive", variant: "destructive" }); 
        return; 
      }

      console.log('[Timeclock] Badge verified, looking for employee with id:', profileId);
      console.log('[Timeclock] Available employees:', employees.map(e => ({ id: e.id, name: e.display_name })));
      
      const employee = employees.find(emp => emp.id === profileId);
      if (!employee) { 
        console.log('[Timeclock] Employee not found in local list');
        toast({ title: "Employee Not Found", description: "This badge is not associated with an active employee", variant: "destructive" }); 
        return; 
      }

      console.log('[Timeclock] Found employee:', employee);
      setSelectedEmployee(employee.id); 
      setShowBadgeScanner(false);
      toast({ title: "Badge Verified", description: `Welcome, ${employee.display_name}!` });
      if (employee.pin && isPinRequired) { 
        setShowPinInput(true); 
      } else { 
        setAuthenticatedEmployee(employee); 
      }
    } catch (error) { 
      console.error('[Timeclock] Badge scan error:', error);
      toast({ title: "Scan Error", description: "Failed to verify badge. Please try again.", variant: "destructive" }); 
    } finally { 
      setScanningBadge(false); 
    }
  };

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string> => {
    if (!company || !authenticatedEmployee) throw new Error('Company or employee not found');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    // Use profile id (always available) instead of user_id (may be null)
    const identifier = (authenticatedEmployee.id || authenticatedEmployee.user_id || 'unknown').toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${company.id}/${actionPath}/${timestamp}_${identifier}.jpg`;
    const { error } = await supabase.storage.from('timeclock-photos').upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return filePath;
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      const photoUrl = await uploadPhoto(photoBlob, photoAction!);
      setShowPhotoCapture(false);
      if (photoAction === 'clock_in') await performClockIn(photoUrl); else if (photoAction === 'clock_out') await performClockOut(photoUrl);
    } catch (error) {
      toast({ title: "Photo Upload Failed", description: "Continuing without photo.", variant: "destructive" });
      if (photoAction === 'clock_in') await performClockIn(); else if (photoAction === 'clock_out') await performClockOut();
    }
    setPhotoAction(null);
  };

  // Get current geolocation
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; address: string | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation || !companyFeatures?.geolocation) {
        resolve({ latitude: 0, longitude: 0, address: null });
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let address: string | null = null;
          
          // Try reverse geocoding with Nominatim (free, no API key required)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'User-Agent': 'TimeclockApp/1.0' } }
            );
            if (response.ok) {
              const data = await response.json();
              address = data.display_name || null;
            }
          } catch (e) {
            console.log('Reverse geocoding failed:', e);
          }
          
          resolve({ latitude, longitude, address });
        },
        (error) => {
          console.log('Geolocation error:', error);
          resolve({ latitude: 0, longitude: 0, address: null });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const performClockIn = async (photoUrl?: string) => {
    if (!authenticatedEmployee || !company) return;
    setIsProcessing(true);
    
    const location = await getCurrentLocation();
    
    const { data, error } = await supabase.functions.invoke('clock-in-out', {
      body: {
        action: 'clock_in',
        profile_id: authenticatedEmployee.id,
        company_id: company.id,
        photo_url: photoUrl,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        address: location.address
      }
    });
    
    if (error || !data?.success) { 
      console.error('[Timeclock] Clock in failed:', error || data?.error);
      toast({ title: "Clock In Failed", description: data?.error || "Please try again.", variant: "destructive" }); 
      setIsProcessing(false);
      return; 
    }
    
    const employeeName = authenticatedEmployee.display_name || authenticatedEmployee.first_name || "Employee";
    toast({ title: "Clocked In!", description: `Welcome, ${employeeName}!` });
    
    setTimeout(() => {
      resetForNextUser();
    }, 2500);
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
    if (!activeTimeEntry || !authenticatedEmployee || !company) return;
    setIsProcessing(true);
    
    const location = await getCurrentLocation();
    
    const { data, error } = await supabase.functions.invoke('clock-in-out', {
      body: {
        action: 'clock_out',
        profile_id: authenticatedEmployee.id,
        company_id: company.id,
        time_entry_id: activeTimeEntry.id,
        photo_url: photoUrl,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        address: location.address
      }
    });
    
    if (error || !data?.success) { 
      console.error('[Timeclock] Clock out failed:', error || data?.error);
      toast({ title: "Clock Out Failed", description: data?.error || "Please try again.", variant: "destructive" }); 
      setIsProcessing(false);
      return; 
    }
    
    const employeeName = authenticatedEmployee.display_name || authenticatedEmployee.first_name || "Employee";
    toast({ title: "Clocked Out!", description: `Goodbye, ${employeeName}!` });
    
    setTimeout(() => {
      resetForNextUser();
    }, 2500);
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
    
    const { data, error } = await supabase.functions.invoke('clock-in-out', {
      body: {
        action: 'break',
        profile_id: authenticatedEmployee.id,
        company_id: company.id
      }
    });
    
    if (error || !data?.success) {
      console.error('[Timeclock] Break failed:', error || data?.error);
      toast({ title: "Break Failed", description: data?.error || "Please try again.", variant: "destructive" });
    }
  };

  const handleClosePage = () => { setShowPasswordDialog(true); setPasswordError(null); };

  async function handlePasswordSubmit(password: string) {
    setCheckingPassword(true); setPasswordError(null);
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { setCheckingPassword(false); setPasswordError("No user session."); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.user.email ?? "", password });
    setCheckingPassword(false);
    if (signInError) { setPasswordError("Incorrect password. Please try again."); return; }
    setShowPasswordDialog(false); setTimeout(() => navigate("/dashboard"), 200);
  }

  return (
    <div className="min-h-screen bg-background">
      <TimeclockHeader currentTime={currentTime} language={language} setLanguage={setLanguage} t={t} />
      <main>
        {showBadgeScanner ? (
          <section className="max-w-md mx-auto">
            <QRScanner title="Scan Employee Badge" description="Scan your badge QR code or enter badge ID" onScan={handleBadgeScan} isLoading={scanningBadge} placeholder="Enter Badge ID or scan QR code" preferredCamera="user" />
            <div className="text-center mt-4"><Button variant="ghost" onClick={() => setShowBadgeScanner(false)}>Use Dropdown Instead</Button></div>
          </section>
        ) : showPinInput ? (
          <section className="max-w-md mx-auto"><PinInput onPinEntered={handlePinEntered} employeeName={employees.find(emp => emp.id === selectedEmployee)?.display_name || "Employee"} loading={checkingPin} error={pinError} onCancel={handlePinCancel} /></section>
        ) : (
          <TimeclockMainCard selectedEmployee={selectedEmployee} setSelectedEmployee={handleEmployeeSelect} isActionEnabled={isActionEnabled} employees={employees} employeesLoading={employeesLoading} authenticatedEmployee={authenticatedEmployee} clockStatus={clockStatus} onClockIn={handleClockIn} onClockOut={handleClockOut} onBreak={handleBreak} onScanBadge={() => setShowBadgeScanner(true)} t={t} />
        )}
      </main>
      <TimeclockFooter onClosePage={handleClosePage} closeDisabled={false} t={t} />
      <PasswordDialog open={showPasswordDialog} onSubmit={handlePasswordSubmit} onCancel={() => setShowPasswordDialog(false)} loading={checkingPassword} error={passwordError} />
      <PhotoCapture 
        open={showPhotoCapture} 
        onCapture={handlePhotoCapture} 
        onCancel={() => { setShowPhotoCapture(false); setPhotoAction(null); resetForNextUser(); }} 
        onSkip={() => { 
          setShowPhotoCapture(false); 
          if (photoAction === 'clock_in') performClockIn(); 
          else if (photoAction === 'clock_out') performClockOut(); 
          setPhotoAction(null); 
        }}
        title={photoAction === 'clock_in' ? "Clock In Photo" : "Clock Out Photo"} 
        description={photoAction === 'clock_in' ? "Please take a photo to verify your clock in" : "Please take a photo to verify your clock out"} 
        autoCapture={true}
        autoCaptureDelay={3}
      />
    </div>
  );
};

export default Timeclock;
