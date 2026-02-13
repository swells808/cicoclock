import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { PasswordDialog } from "@/components/PasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { TimeclockHeader } from "@/components/timeclock/TimeclockHeader";
import { TimeclockMainCard } from "@/components/timeclock/TimeclockMainCard";
import { TimeclockFooter } from "@/components/timeclock/TimeclockFooter";
import { PinInput } from "@/components/timeclock/PinInput";
import { QRScanner } from "@/components/task-checkin/QRScanner";
import { ManualEmployeeInput } from "@/components/timeclock/ManualEmployeeInput";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";
import { useUserRole } from "@/hooks/useUserRole";
import { ClockStatusOverlay, ClockStatusType } from "@/components/timeclock/ClockStatusOverlay";
import { verifyFace, formatEmbeddingForPgvector } from "@/lib/faceVerification";
import { ShiftTimecardDialog } from "@/components/timeclock/ShiftTimecardDialog";

const Timeclock = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { company, companyFeatures } = useCompany();
  const { employees, loading: employeesLoading, authenticatePin } = useEmployees();
  const { toast } = useToast();
  const { isForeman } = useUserRole();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [authenticatedEmployee, _setAuthenticatedEmployee] = useState<any>(null);
  const authenticatedEmployeeRef = useRef<any>(null);
  const companyRef = useRef<any>(company);
  companyRef.current = company;
  const companyFeaturesRef = useRef(companyFeatures);
  companyFeaturesRef.current = companyFeatures;
  const setAuthenticatedEmployee = (emp: any) => {
    authenticatedEmployeeRef.current = emp;
    _setAuthenticatedEmployee(emp);
  };
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showBadgeScanner, setShowBadgeScanner] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [scanningBadge, setScanningBadge] = useState(false);
  const [lookingUpEmployee, setLookingUpEmployee] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [activeTimeEntry, _setActiveTimeEntry] = useState<any>(null);
  const activeTimeEntryRef = useRef<any>(null);
  const setActiveTimeEntry = (entry: any) => {
    activeTimeEntryRef.current = entry;
    _setActiveTimeEntry(entry);
  };
  const [clockStatus, setClockStatus] = useState<'out' | 'in'>('out');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [photoAction, _setPhotoAction] = useState<'clock_in' | 'clock_out' | null>(null);
  const photoActionRef = useRef<'clock_in' | 'clock_out' | null>(null);
  const setPhotoAction = (action: 'clock_in' | 'clock_out' | null) => {
    photoActionRef.current = action;
    _setPhotoAction(action);
  };
  const [pendingPhotoBlob, setPendingPhotoBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualLookupEmployee, setManualLookupEmployee] = useState<any>(null);
  const [clockStatusOverlay, setClockStatusOverlay] = useState<ClockStatusType>(null);
  const [clockStatusMessage, setClockStatusMessage] = useState<string>("");
  const [clockStatusName, setClockStatusName] = useState<string>("");
  const [showTimecardDialog, setShowTimecardDialog] = useState(false);
  const [snapshotShiftHours, setSnapshotShiftHours] = useState(0);
  const [pendingClockOutPhotoUrl, setPendingClockOutPhotoUrl] = useState<string | undefined>();
  const [pendingClockOutPhotoBlob, setPendingClockOutPhotoBlob] = useState<Blob | undefined>();
  const [companyProjects, setCompanyProjects] = useState<{ id: string; name: string; project_number?: string | null }[]>([]);
  
  // Track if we've already triggered auto-clock for this authenticated employee
  const autoClockTriggeredRef = useRef<string | null>(null);

  // Fetch active projects for timecard dialog
  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { if (data) setCompanyProjects(data); });
  }, [company?.id]);

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

  // Show status overlay with auto-dismiss
  const showStatusOverlay = useCallback((type: ClockStatusType, name: string, message?: string) => {
    setClockStatusName(name);
    setClockStatusMessage(message || "");
    setClockStatusOverlay(type);
  }, []);

  const handleStatusDismiss = useCallback(() => {
    setClockStatusOverlay(null);
    setClockStatusMessage("");
    setClockStatusName("");
    resetForNextUser();
  }, []);

  // Reset screen for next user
  const resetForNextUser = () => {
    setSelectedEmployee("");
    setAuthenticatedEmployee(null);
    setActiveTimeEntry(null);
    setClockStatus('out');
    setShowPhotoCapture(false);
    setPhotoAction(null);
    setPendingPhotoBlob(null);
    setIsProcessing(false);
    setManualLookupEmployee(null);
    setShowManualInput(false);
    setLookupError(null);
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
      if (success) { 
        // If we came from manual lookup, use that employee data
        if (manualLookupEmployee) {
          setAuthenticatedEmployee(manualLookupEmployee);
        } else {
          const employee = employees.find(emp => emp.id === selectedEmployee); 
          setAuthenticatedEmployee(employee);
        }
        setShowPinInput(false); 
        return true; 
      }
      else { setPinError("Invalid PIN. Please try again."); return false; }
    } catch (error) { setPinError("Authentication failed. Please try again."); return false; }
    finally { setCheckingPin(false); }
  };

  const handlePinCancel = () => { 
    setShowPinInput(false); 
    setSelectedEmployee(""); 
    setPinError(null); 
    setManualLookupEmployee(null);
    setShowManualInput(false);
  };

  // Handle manual employee lookup by ID or phone
  const handleManualLookup = async (identifier: string) => {
    if (!company?.id) {
      setLookupError("Company not loaded");
      return;
    }

    setLookingUpEmployee(true);
    setLookupError(null);

    try {
      console.log('[Timeclock] Looking up employee by identifier:', identifier);
      
      const { data, error } = await supabase.functions.invoke('lookup-employee', {
        body: { company_id: company.id, identifier }
      });

      if (error) {
        console.error('[Timeclock] Lookup error:', error);
        setLookupError("Lookup failed. Please try again.");
        return;
      }

      if (!data?.found) {
        setLookupError("Employee not found. Check your ID or phone number.");
        return;
      }

      console.log('[Timeclock] Found employee:', data.employee);
      
      // Store the looked up employee for PIN verification
      // NOTE: has_pin is no longer returned from the backend for security reasons
      // We always require PIN for manual entry if PIN feature is enabled
      const lookupResult = {
        id: data.employee.id,
        user_id: data.employee.user_id,
        display_name: data.employee.display_name,
        first_name: data.employee.first_name,
        last_name: data.employee.last_name,
        has_pin: true, // Always assume PIN is required for manual entry (security hardening)
        pin: 'exists' // Mark that PIN verification is required
      };
      
      setManualLookupEmployee(lookupResult);
      setSelectedEmployee(lookupResult.id);
      setShowManualInput(false);
      
      // Always require PIN for manual entry
      setShowPinInput(true);
      toast({ title: "Employee Found", description: `Please enter your PIN, ${lookupResult.display_name}` });

    } catch (err) {
      console.error('[Timeclock] Manual lookup error:', err);
      setLookupError("An error occurred. Please try again.");
    } finally {
      setLookingUpEmployee(false);
    }
  };

  const handleManualCancel = () => {
    setShowManualInput(false);
    setLookupError(null);
  };

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

      // Use employee data from verify-badge response (edge function bypasses RLS)
      // This is more reliable than local lookup which may fail for non-admin users
      const employee = {
        id: profileId,
        user_id: data.employee.user_id,
        display_name: data.employee.display_name,
        first_name: data.employee.first_name,
        last_name: data.employee.last_name,
        avatar_url: data.employee.avatar_url,
        pin: data.employee.has_pin ? 'exists' : null // Mark PIN exists without exposing it
      };

      console.log('[Timeclock] Using employee from badge response:', employee);
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
    const comp = companyRef.current;
    const emp = authenticatedEmployeeRef.current;
    if (!comp || !emp) throw new Error('Company or employee not found');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const identifier = (emp.id || emp.user_id || 'unknown').toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${comp.id}/${actionPath}/${timestamp}_${identifier}.jpg`;
    const { error } = await supabase.storage.from('timeclock-photos').upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return filePath;
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    const action = photoActionRef.current;
    console.log('[Timeclock] handlePhotoCapture called, action:', action);
    try {
      setPendingPhotoBlob(photoBlob);
      const photoUrl = await uploadPhoto(photoBlob, action!);
      // CRITICAL: Close the photo dialog FIRST and wait for it to fully unmount
      // before opening the timecard dialog. Two Radix Dialogs transitioning
      // simultaneously causes the second one to fail on iPad Safari.
      setShowPhotoCapture(false);
      setPhotoAction(null);
      setPendingPhotoBlob(null);
      await new Promise(resolve => setTimeout(resolve, 400));
      if (action === 'clock_in') {
        await performClockIn(photoUrl, photoBlob);
      } else if (action === 'clock_out') {
        console.log('[Timeclock] calling performClockOut after photo');
        await performClockOut(photoUrl, photoBlob);
      }
    } catch (error) {
      console.error('[Timeclock] handlePhotoCapture error:', error);
      toast({ title: "Photo Upload Failed", description: "Continuing without photo.", variant: "destructive" });
      setShowPhotoCapture(false);
      setPhotoAction(null);
      setPendingPhotoBlob(null);
      await new Promise(resolve => setTimeout(resolve, 400));
      if (action === 'clock_in') await performClockIn(); else if (action === 'clock_out') await performClockOut();
    }
  };

  // Get current geolocation with Mapbox reverse geocoding for better accuracy
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
          
          // Try Mapbox reverse geocoding first (more accurate)
          const mapboxToken = companyFeatures?.mapbox_public_token || localStorage.getItem("mapbox_public_token");
          
          if (mapboxToken) {
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address,poi&limit=1`
              );
              if (response.ok) {
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                  address = data.features[0].place_name || null;
                }
              }
            } catch (e) {
              console.log('Mapbox reverse geocoding failed:', e);
            }
          }
          
          // Fallback to Nominatim if Mapbox fails or no token
          if (!address) {
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
              console.log('Nominatim reverse geocoding failed:', e);
            }
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

  // Client-side face verification helper
  const runFaceVerification = async (
    timeEntryId: string,
    photoBlob: Blob,
    photoUrl: string
  ) => {
    if (!companyFeatures?.face_verification || !authenticatedEmployee?.avatar_url) {
      console.log('[FaceVerify] Skipped:', { 
        face_verification: companyFeatures?.face_verification, 
        avatar_url: !!authenticatedEmployee?.avatar_url 
      });
      return;
    }

    // Check if employee has face embedding enrolled
    const { data: profileData } = await supabase
      .from('profiles')
      .select('face_embedding, face_enrollment_status')
      .eq('id', authenticatedEmployee.id)
      .single();

    if (!profileData?.face_embedding || profileData.face_enrollment_status !== 'enrolled') {
      console.log('[FaceVerify] Employee not enrolled, logging skipped status');
      Promise.resolve(supabase.from('face_verifications').insert({
        time_entry_id: timeEntryId,
        profile_id: authenticatedEmployee.id,
        company_id: company!.id,
        clock_photo_url: photoUrl,
        profile_photo_url: authenticatedEmployee.avatar_url,
        status: 'skipped',
        match_reason: 'enrollment_missing',
        verification_version: 'faceapi-v1',
      })).catch(() => {});
      return;
    }

    try {
      // Parse the embedding from pgvector format
      const embeddingStr = profileData.face_embedding as string;
      const embedding = JSON.parse(embeddingStr.replace(/^\[|\]$/g, (m) => m)) as number[];

      console.log('[FaceVerify] Running client-side verification');
      const result = await verifyFace(photoBlob, embedding);

      // Log verification result
      Promise.resolve(supabase.from('face_verifications').insert({
        time_entry_id: timeEntryId,
        profile_id: authenticatedEmployee.id,
        company_id: company!.id,
        clock_photo_url: photoUrl,
        profile_photo_url: authenticatedEmployee.avatar_url,
        captured_face_embedding: result.embedding ? formatEmbeddingForPgvector(result.embedding) : null,
        match_distance: result.distance ?? null,
        match_threshold: 0.60,
        is_match: result.pass ?? null,
        match_reason: result.reason,
        status: result.ok ? (result.pass ? 'verified' : 'no_match') : 'error',
        confidence_score: result.distance != null ? Math.max(0, 1 - result.distance) : null,
        verified_at: new Date().toISOString(),
        verification_version: 'faceapi-v1',
      })).catch(console.error);

      console.log('[FaceVerify] Result:', result);
    } catch (error) {
      console.error('[FaceVerify] Error:', error);
      // Log error but don't block clock action
      Promise.resolve(supabase.from('face_verifications').insert({
        time_entry_id: timeEntryId,
        profile_id: authenticatedEmployee.id,
        company_id: company!.id,
        clock_photo_url: photoUrl,
        profile_photo_url: authenticatedEmployee.avatar_url,
        status: 'error',
        match_reason: 'model_load_failed',
        verification_version: 'faceapi-v1',
      })).catch(() => {});
    }
  };

  const performClockIn = async (photoUrl?: string, photoBlob?: Blob) => {
    const emp = authenticatedEmployeeRef.current;
    const comp = companyRef.current;
    if (!emp || !comp) return;
    setIsProcessing(true);
    
    const location = await getCurrentLocation();
    
    const { data, error } = await supabase.functions.invoke('clock-in-out', {
      body: {
        action: 'clock_in',
        profile_id: emp.id,
        company_id: comp.id,
        photo_url: photoUrl,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        address: location.address
      }
    });
    
    if (error || !data?.success) { 
      console.error('[Timeclock] Clock in failed:', error || data?.error);
      const employeeName = emp.display_name || emp.first_name || "Employee";
      showStatusOverlay("error", employeeName, data?.error || "Clock in failed. Please try again.");
      setIsProcessing(false);
      return; 
    }
    
    // Fire-and-forget face verification (client-side)
    if (photoUrl && photoBlob && data.data?.id) {
      runFaceVerification(data.data.id, photoBlob, photoUrl).catch(console.error);
    }

    // Fire-and-forget: record default "Other" task activity for this shift
    if (data.data?.id) {
      supabase.functions.invoke('record-task-activity', {
        body: {
          user_id: emp.user_id || emp.id,
          profile_id: emp.id,
          task_id: 'auto-other',
          task_type_id: 'auto-other',
          action_type: 'start',
          time_entry_id: data.data.id,
          project_id: null,
          company_id: comp.id,
        }
      }).catch(err => console.error('[Timeclock] Auto task activity error:', err));
    }

    const employeeName = emp.display_name || emp.first_name || "Employee";
    showStatusOverlay("clock_in", employeeName);
    setIsProcessing(false);
  };

  const handleClockIn = async () => { 
    if (companyFeaturesRef.current?.photo_capture) { 
      setPhotoAction('clock_in'); 
      setShowPhotoCapture(true); 
    } else { 
      await performClockIn(); 
    } 
  };

  const performClockOut = async (photoUrl?: string, photoBlob?: Blob) => {
    let currentEntry = activeTimeEntryRef.current;
    const emp = authenticatedEmployeeRef.current;
    const comp = companyRef.current;
    console.log('[Timeclock] performClockOut called', {
      hasEntry: !!currentEntry,
      hasEmp: !!emp,
      hasComp: !!comp,
      entryId: currentEntry?.id,
    });

    // Defensive: if activeTimeEntry ref was lost (e.g. due to async timing),
    // re-query the active entry directly
    if (!currentEntry && emp && comp) {
      console.warn('[Timeclock] activeTimeEntryRef was null, re-querying...');
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('profile_id', emp.id)
        .eq('company_id', comp.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        currentEntry = data;
        setActiveTimeEntry(data);
        console.log('[Timeclock] Re-queried active entry:', data.id);
      }
    }

    if (!currentEntry || !emp || !comp) {
      console.error('[Timeclock] performClockOut ABORTED - missing ref data', {
        hasEntry: !!currentEntry,
        hasEmp: !!emp,
        hasComp: !!comp,
      });
      const employeeName = emp?.display_name || emp?.first_name || "Employee";
      showStatusOverlay("error", employeeName, "No active shift found. Please try again.");
      setIsProcessing(false);
      return;
    }
    // Show the timecard dialog instead of clocking out immediately
    setPendingClockOutPhotoUrl(photoUrl);
    setPendingClockOutPhotoBlob(photoBlob);
    const hours = currentEntry.start_time
      ? +((Date.now() - new Date(currentEntry.start_time).getTime()) / 3600000).toFixed(2)
      : 0;
    setSnapshotShiftHours(hours);
    console.log('[Timeclock] Opening timecard dialog, hours:', hours);
    setShowTimecardDialog(true);
  };

  // Actually finalize the clock-out after timecard submission
  const finalizeClockOut = async (
    allocations: { projectId: string; materialHandling: number; processCut: number; fitupWeld: number; finishes: number; other: number }[],
    injuryReported: boolean
  ) => {
    const currentEntry = activeTimeEntryRef.current;
    const emp = authenticatedEmployeeRef.current;
    const comp = companyRef.current;
    if (!currentEntry || !emp || !comp) {
      console.error('[Timeclock] finalizeClockOut ABORTED - missing data');
      return;
    }
    setShowTimecardDialog(false);
    setIsProcessing(true);
    
    const location = await getCurrentLocation();
    
    const { data, error } = await supabase.functions.invoke('clock-in-out', {
      body: {
        action: 'clock_out',
        profile_id: emp.id,
        company_id: comp.id,
        time_entry_id: currentEntry.id,
        photo_url: pendingClockOutPhotoUrl,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        address: location.address,
        injury_reported: injuryReported,
      }
    });
    
    if (error || !data?.success) { 
      console.error('[Timeclock] Clock out failed:', error || data?.error);
      const employeeName = emp.display_name || emp.first_name || "Employee";
      showStatusOverlay("error", employeeName, data?.error || "Clock out failed. Please try again.");
      setIsProcessing(false);
      return; 
    }
    
    // Insert timecard allocations
    const timeEntryId = data.data?.id || currentEntry.id;
    const allocationRows = allocations.map((a) => ({
      time_entry_id: timeEntryId,
      project_id: a.projectId || null,
      company_id: comp.id,
      profile_id: emp.id,
      material_handling: a.materialHandling,
      processing_cutting: a.processCut,
      fabrication_fitup_weld: a.fitupWeld,
      finishes: a.finishes,
      other: a.other,
    }));

    const { error: allocError } = await supabase.from('timecard_allocations').insert(allocationRows);
    if (allocError) console.error('[Timeclock] Allocation insert error:', allocError);

    // Fire-and-forget face verification (client-side)
    if (pendingClockOutPhotoUrl && pendingClockOutPhotoBlob && timeEntryId) {
      runFaceVerification(timeEntryId, pendingClockOutPhotoBlob, pendingClockOutPhotoUrl).catch(console.error);
    }

    const employeeName = emp.display_name || emp.first_name || "Employee";
    showStatusOverlay("clock_out", employeeName);
    setIsProcessing(false);
    setPendingClockOutPhotoUrl(undefined);
    setPendingClockOutPhotoBlob(undefined);
  };

  const handleTimecardCancel = () => {
    setShowTimecardDialog(false);
    setPendingClockOutPhotoUrl(undefined);
    setPendingClockOutPhotoBlob(undefined);
    setIsProcessing(false);
  };

  const handleClockOut = async () => { 
    if (companyFeaturesRef.current?.photo_capture) { 
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
      setTimeout(() => { resetForNextUser(); }, 2500);
      return;
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
    setShowPasswordDialog(false);
    // Foremen go to time-tracking/admin (read-only), others go to dashboard
    const destination = isForeman ? "/time-tracking/admin" : "/dashboard";
    setTimeout(() => navigate(destination), 200);
  }

  return (
    <div className="min-h-screen bg-background">
      <TimeclockHeader currentTime={currentTime} language={language} setLanguage={setLanguage} t={t} />
      <main>
        {showBadgeScanner ? (
          <section className="max-w-md mx-auto">
            <QRScanner title="Scan Employee Badge" description="Scan your badge QR code or enter badge ID" onScan={handleBadgeScan} isLoading={scanningBadge} placeholder="Enter Badge ID or scan QR code" preferredCamera="user" />
            <div className="text-center mt-4"><Button variant="ghost" onClick={() => setShowBadgeScanner(false)}>Back</Button></div>
          </section>
        ) : showManualInput ? (
          <ManualEmployeeInput 
            onLookup={handleManualLookup} 
            loading={lookingUpEmployee} 
            error={lookupError} 
            onCancel={handleManualCancel} 
          />
        ) : showPinInput ? (
          <section className="max-w-md mx-auto">
            <PinInput 
              onPinEntered={handlePinEntered} 
              employeeName={manualLookupEmployee?.display_name || employees.find(emp => emp.id === selectedEmployee)?.display_name || "Employee"} 
              loading={checkingPin} 
              error={pinError} 
              onCancel={handlePinCancel} 
            />
          </section>
        ) : (
          <TimeclockMainCard 
            selectedEmployee={selectedEmployee} 
            setSelectedEmployee={handleEmployeeSelect} 
            isActionEnabled={isActionEnabled} 
            employees={employees} 
            employeesLoading={employeesLoading} 
            authenticatedEmployee={authenticatedEmployee} 
            clockStatus={clockStatus} 
            onClockIn={handleClockIn} 
            onClockOut={handleClockOut} 
            onBreak={handleBreak} 
            onScanBadge={() => setShowBadgeScanner(true)} 
            onManualEntry={() => setShowManualInput(true)}
            t={t} 
          />
        )}
      </main>
      <TimeclockFooter onClosePage={handleClosePage} closeDisabled={false} t={t} />
      <PasswordDialog open={showPasswordDialog} onSubmit={handlePasswordSubmit} onCancel={() => setShowPasswordDialog(false)} loading={checkingPassword} error={passwordError} />
      <PhotoCapture 
        open={showPhotoCapture} 
        onCapture={handlePhotoCapture} 
        onCancel={() => { setShowPhotoCapture(false); setPhotoAction(null); resetForNextUser(); }} 
        onSkip={async () => { 
          const action = photoActionRef.current;
          setShowPhotoCapture(false);
          setPhotoAction(null);
          // Wait for PhotoCapture dialog to fully unmount before opening next dialog
          await new Promise(resolve => setTimeout(resolve, 400));
          if (action === 'clock_in') performClockIn(); 
          else if (action === 'clock_out') performClockOut(); 
        }}
        title={photoAction === 'clock_in' ? "Clock In Photo" : "Clock Out Photo"} 
        description={photoAction === 'clock_in' ? "Please take a photo to verify your clock in" : "Please take a photo to verify your clock out"} 
        autoCapture={true}
        autoCaptureDelay={3}
      />
      <ClockStatusOverlay
        status={clockStatusOverlay}
        employeeName={clockStatusName}
        message={clockStatusMessage}
        onDismiss={handleStatusDismiss}
        autoDismissMs={2500}
      />
      <ShiftTimecardDialog
        open={showTimecardDialog}
        onSubmit={finalizeClockOut}
        onCancel={handleTimecardCancel}
        totalShiftHours={snapshotShiftHours}
        projects={companyProjects}
      />
    </div>
  );
};

export default Timeclock;
