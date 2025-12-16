import React, { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "./MobileLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, LogIn, LogOut, Coffee, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoCapture } from "@/components/timeclock/PhotoCapture";
import { PinInput } from "@/components/timeclock/PinInput";

const MobileTimeclock = () => {
  const { t } = useLanguage();
  const { company, companyFeatures } = useCompany();
  const { employees, loading: employeesLoading, authenticatePin } = useEmployees();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<any>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
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
      if (!authenticatedEmployee) return;
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', authenticatedEmployee.user_id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setActiveTimeEntry(data);
        setClockStatus('in');
      } else {
        setActiveTimeEntry(null);
        setClockStatus('out');
      }
    };
    checkActiveTimeEntry();
  }, [authenticatedEmployee]);

  const isPinRequired = companyFeatures?.employee_pin;

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setAuthenticatedEmployee(null);
    setPinError(null);
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && employee.pin && isPinRequired) {
      setShowPinInput(true);
    } else {
      setAuthenticatedEmployee(employee);
    }
  };

  const handlePinEntered = async (pin: string): Promise<boolean> => {
    if (!selectedEmployee) return false;
    setCheckingPin(true);
    setPinError(null);
    try {
      const success = await authenticatePin(selectedEmployee, pin);
      if (success) {
        const employee = employees.find(emp => emp.id === selectedEmployee);
        setAuthenticatedEmployee(employee);
        setShowPinInput(false);
        return true;
      } else {
        setPinError("Invalid PIN. Please try again.");
        return false;
      }
    } catch {
      setPinError("Authentication failed. Please try again.");
      return false;
    } finally {
      setCheckingPin(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinInput(false);
    setSelectedEmployee("");
    setPinError(null);
  };

  const uploadPhoto = async (photoBlob: Blob, action: 'clock_in' | 'clock_out'): Promise<string> => {
    if (!company || !authenticatedEmployee) throw new Error('Company or employee not found');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const userId = authenticatedEmployee.user_id.toUpperCase();
    const actionPath = action === 'clock_in' ? 'clock-in' : 'clock-out';
    const filePath = `${company.id}/${actionPath}/${timestamp}_${userId}.jpg`;
    const { error } = await supabase.storage
      .from('timeclock-photos')
      .upload(filePath, photoBlob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return filePath;
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      const photoUrl = await uploadPhoto(photoBlob, photoAction!);
      setShowPhotoCapture(false);
      if (photoAction === 'clock_in') await performClockIn(photoUrl);
      else if (photoAction === 'clock_out') await performClockOut(photoUrl);
    } catch {
      toast({ title: "Photo Upload Failed", description: "Continuing without photo.", variant: "destructive" });
      if (photoAction === 'clock_in') await performClockIn();
      else if (photoAction === 'clock_out') await performClockOut();
    }
    setPhotoAction(null);
  };

  const performClockIn = async (photoUrl?: string) => {
    if (!authenticatedEmployee || !company) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: authenticatedEmployee.user_id,
          company_id: company.id,
          start_time: new Date().toISOString(),
          clock_in_photo_url: photoUrl
        })
        .select()
        .single();
      
      if (error) {
        toast({ title: "Clock In Failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      setActiveTimeEntry(data);
      setClockStatus('in');
      toast({ title: "Clocked In", description: "You have successfully clocked in." });
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
    if (!activeTimeEntry) return;
    setIsProcessing(true);
    try {
      const endTime = new Date();
      const startTime = new Date(activeTimeEntry.start_time);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          clock_out_photo_url: photoUrl
        })
        .eq('id', activeTimeEntry.id);
      
      if (error) {
        toast({ title: "Clock Out Failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      setActiveTimeEntry(null);
      setClockStatus('out');
      toast({ title: "Clocked Out", description: "You have successfully clocked out." });
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
      const now = new Date().toISOString();
      await supabase.from('time_entries').insert({
        user_id: authenticatedEmployee.user_id,
        company_id: company.id,
        start_time: now,
        end_time: now,
        duration_minutes: 0,
        is_break: true
      });
      toast({ title: "Break Started", description: "Break time recorded." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    setAuthenticatedEmployee(null);
    setSelectedEmployee("");
    setActiveTimeEntry(null);
    setClockStatus('out');
  };

  // PIN Input View
  if (showPinInput) {
    return (
      <MobileLayout title="Enter PIN" currentTime={currentTime} showBottomNav={false}>
        <div className="p-4">
          <PinInput
            onPinEntered={handlePinEntered}
            employeeName={employees.find(emp => emp.id === selectedEmployee)?.display_name || "Employee"}
            loading={checkingPin}
            error={pinError}
            onCancel={handlePinCancel}
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Time Clock" currentTime={currentTime}>
      <div className="p-4 space-y-4">
        {/* Employee Selection / Status */}
        {!authenticatedEmployee ? (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Select Employee</span>
            </div>
            <Select
              value={selectedEmployee}
              onValueChange={handleEmployeeSelect}
              disabled={employeesLoading}
            >
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Choose your name..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="py-3">
                    {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
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
