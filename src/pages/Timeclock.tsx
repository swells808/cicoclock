import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkActiveTimeEntry = async () => {
      if (!authenticatedEmployee) return;
      const { data, error } = await supabase.from('time_entries').select('*').eq('user_id', authenticatedEmployee.user_id).is('end_time', null).order('start_time', { ascending: false }).limit(1).single();
      if (data && !error) { setActiveTimeEntry(data); setClockStatus('in'); } else { setActiveTimeEntry(null); setClockStatus('out'); }
    };
    checkActiveTimeEntry();
  }, [authenticatedEmployee]);

  const isActionEnabled = authenticatedEmployee !== null;
  const isPinRequired = companyFeatures?.employee_pin;

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
    // Guard: ensure company is loaded
    if (!company?.id) {
      toast({ title: "Loading", description: "Please wait for company data to load", variant: "destructive" });
      return;
    }

    setScanningBadge(true);
    try {
      const profileId = scannedValue.includes('/badge/') 
        ? scannedValue.split('/badge/')[1].split('?')[0] 
        : scannedValue;

      if (!profileId) {
        toast({ title: "Invalid Badge", description: "Could not read badge ID", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-badge', { 
        body: { profile_id: profileId, company_id: company.id } 
      });

      if (error || !data?.valid) { 
        toast({ title: "Invalid Badge", description: data?.error || "Badge not found or inactive", variant: "destructive" }); 
        return; 
      }

      const employee = employees.find(emp => emp.id === profileId);
      if (!employee) { 
        toast({ title: "Employee Not Found", description: "This badge is not associated with an active employee", variant: "destructive" }); 
        return; 
      }

      setSelectedEmployee(employee.id); 
      setShowBadgeScanner(false);
      toast({ title: "Badge Verified", description: `Welcome, ${employee.display_name}!` });
      if (employee.pin && isPinRequired) { 
        setShowPinInput(true); 
      } else { 
        setAuthenticatedEmployee(employee); 
      }
    } catch (error) { 
      toast({ title: "Scan Error", description: "Failed to verify badge. Please try again.", variant: "destructive" }); 
    } finally { 
      setScanningBadge(false); 
    }
  };

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string> => {
    if (!company || !authenticatedEmployee) throw new Error('Company or employee not found');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const userId = authenticatedEmployee.user_id.toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${company.id}/${actionPath}/${timestamp}_${userId}.jpg`;
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

  const performClockIn = async (photoUrl?: string) => {
    if (!authenticatedEmployee || !company) return;
    const { data, error } = await supabase.from('time_entries').insert({ user_id: authenticatedEmployee.user_id, company_id: company.id, start_time: new Date().toISOString(), clock_in_photo_url: photoUrl }).select().single();
    if (error) { toast({ title: "Clock In Failed", description: "Please try again.", variant: "destructive" }); return; }
    setActiveTimeEntry(data); setClockStatus('in'); toast({ title: "Clocked In", description: "You have successfully clocked in." });
  };

  const handleClockIn = async () => { if (companyFeatures?.photo_capture) { setPhotoAction('clock_in'); setShowPhotoCapture(true); } else { await performClockIn(); } };

  const performClockOut = async (photoUrl?: string) => {
    if (!activeTimeEntry) return;
    const endTime = new Date(); const startTime = new Date(activeTimeEntry.start_time); const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    const { error } = await supabase.from('time_entries').update({ end_time: endTime.toISOString(), duration_minutes: durationMinutes, clock_out_photo_url: photoUrl }).eq('id', activeTimeEntry.id);
    if (error) { toast({ title: "Clock Out Failed", description: "Please try again.", variant: "destructive" }); return; }
    setActiveTimeEntry(null); setClockStatus('out'); toast({ title: "Clocked Out", description: "You have successfully clocked out." });
  };

  const handleClockOut = async () => { if (companyFeatures?.photo_capture) { setPhotoAction('clock_out'); setShowPhotoCapture(true); } else { await performClockOut(); } };

  const handleBreak = async () => {
    if (!authenticatedEmployee || !company) return;
    const now = new Date().toISOString();
    await supabase.from('time_entries').insert({ user_id: authenticatedEmployee.user_id, company_id: company.id, start_time: now, end_time: now, duration_minutes: 0, is_break: true });
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
            <QRScanner title="Scan Employee Badge" description="Scan your badge QR code or enter badge ID" onScan={handleBadgeScan} isLoading={scanningBadge} placeholder="Enter Badge ID or scan QR code" />
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
      <PhotoCapture open={showPhotoCapture} onCapture={handlePhotoCapture} onCancel={() => { setShowPhotoCapture(false); setPhotoAction(null); }} title={photoAction === 'clock_in' ? "Clock In Photo" : "Clock Out Photo"} description={photoAction === 'clock_in' ? "Please take a photo to verify your clock in" : "Please take a photo to verify your clock out"} />
    </div>
  );
};

export default Timeclock;
