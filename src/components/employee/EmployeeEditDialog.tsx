import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CertificationsList } from "@/components/users/CertificationsList";
import { useDepartments } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, User, MapPin, Briefcase, Shield, Award, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmployeeProfile } from "@/hooks/useEmployeeDetail";

interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeProfile;
  onSave: () => void;
}

export const EmployeeEditDialog = ({ open, onOpenChange, employee, onSave }: EmployeeEditDialogProps) => {
  const { departments } = useDepartments();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("active");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [tradeNumber, setTradeNumber] = useState("");
  const [dateOfHire, setDateOfHire] = useState<Date | undefined>(undefined);
  
  const [role, setRole] = useState("employee");
  
  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  // Initialize form with employee data
  useEffect(() => {
    if (employee && open) {
      setFirstName(employee.first_name || "");
      setLastName(employee.last_name || "");
      setDisplayName(employee.display_name || "");
      setStatus(employee.status || "active");
      
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setAddressStreet(employee.address_street || "");
      setAddressCity(employee.address_city || "");
      setAddressState(employee.address_state || "");
      setAddressZip(employee.address_zip || "");
      setAddressCountry(employee.address_country || "");
      
      setDepartmentId(employee.department_id || "");
      setEmployeeId(employee.employee_id || "");
      setTradeNumber(employee.trade_number || "");
      setDateOfHire(employee.date_of_hire ? new Date(employee.date_of_hire) : undefined);
      
      setRole(employee.role || "employee");
      setPin(employee.pin || "");
      
      // Avatar
      setAvatarPreview(employee.avatar_url || null);
      setAvatarFile(null);
    }
  }, [employee, open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload avatar if changed
      let avatarUrl = employee.avatar_url;
      if (avatarFile && employee.company_id) {
        const fileExtension = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${employee.company_id}/${Date.now()}-avatar.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (!uploadError) {
          avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
        } else {
          console.error("Avatar upload error:", uploadError);
        }
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: displayName || null,
          status,
          email: email || null,
          phone: phone || null,
          address_street: addressStreet || null,
          address_city: addressCity || null,
          address_state: addressState || null,
          address_zip: addressZip || null,
          address_country: addressCountry || null,
          department_id: departmentId || null,
          employee_id: employeeId || null,
          trade_number: tradeNumber || null,
          date_of_hire: dateOfHire ? format(dateOfHire, "yyyy-MM-dd") : null,
          pin: pin || null,
          avatar_url: avatarUrl || null,
        })
        .eq("id", employee.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (role !== employee.role) {
        const userId = employee.user_id;
        if (userId) {
          // Check if role record exists
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .or(`user_id.eq.${userId},profile_id.eq.${employee.id}`)
            .maybeSingle();

          if (existingRole) {
            await supabase
              .from("user_roles")
              .update({ role: role as "admin" | "supervisor" | "employee" | "foreman" })
              .eq("id", existingRole.id);
          } else {
            await supabase
              .from("user_roles")
              .insert({
                user_id: userId,
                profile_id: employee.id,
                role: role as "admin" | "supervisor" | "employee" | "foreman",
              });
          }
        }
      }

      toast.success("Employee updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1 hidden sm:inline" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs sm:text-sm">
              <MapPin className="h-4 w-4 mr-1 hidden sm:inline" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="work" className="text-xs sm:text-sm">
              <Briefcase className="h-4 w-4 mr-1 hidden sm:inline" />
              Work
            </TabsTrigger>
            <TabsTrigger value="access" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
              Access
            </TabsTrigger>
            <TabsTrigger value="certs" className="text-xs sm:text-sm">
              <Award className="h-4 w-4 mr-1 hidden sm:inline" />
              Certs
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Employee photo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="avatar-upload-edit"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload-edit')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Contact & Address Tab */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressStreet">Street Address</Label>
              <Input
                id="addressStreet"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressState">State / Province</Label>
                <Input
                  id="addressState"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="State or province"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressZip">ZIP / Postal Code</Label>
                <Input
                  id="addressZip"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="ZIP or postal code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </TabsContent>

          {/* Work Details Tab */}
          <TabsContent value="work" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={departmentId || "__none__"} onValueChange={(val) => setDepartmentId(val === "__none__" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Employee ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradeNumber">Trade Number</Label>
                <Input
                  id="tradeNumber"
                  value={tradeNumber}
                  onChange={(e) => setTradeNumber(e.target.value)}
                  placeholder="Trade number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date of Hire</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateOfHire && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfHire ? format(dateOfHire, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateOfHire}
                    onSelect={setDateOfHire}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </TabsContent>

          {/* Access & Security Tab */}
          <TabsContent value="access" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-6 digit PIN for time clock"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Used for clocking in/out at the time clock kiosk
              </p>
            </div>
            {employee.user_id && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Account Information</p>
                <p className="text-xs text-muted-foreground">
                  This employee has an associated user account and can log in to the system.
                </p>
              </div>
            )}
            {!employee.user_id && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Login Account</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This employee does not have a login account. They can only use the time clock with their PIN.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Certifications Tab */}
          <TabsContent value="certs" className="mt-4">
            <CertificationsList profileId={employee.id} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
