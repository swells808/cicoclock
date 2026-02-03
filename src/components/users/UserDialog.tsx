import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDepartments } from '@/hooks/useDepartments';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Building2, Shield, IdCard, KeyRound, CalendarIcon, Camera, Send } from 'lucide-react';
import { PRODUCTION_BASE_URL } from '@/lib/constants';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { User as UserType } from '@/hooks/useUsers';
import { CertificationsList } from './CertificationsList';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserType | null;
  onSave: () => void;
}

export const UserDialog = ({ open, onOpenChange, user, onSave }: UserDialogProps) => {
  const { company } = useCompany();
  const { departments } = useDepartments();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    role: 'employee',
    status: 'active',
    employee_id: '',
    pin: '',
  });
  const [loading, setLoading] = useState(false);
  const [createAuthAccount, setCreateAuthAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [dateOfHire, setDateOfHire] = useState<Date | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  // Enable login state (for editing existing users without auth)
  const [enableLoginMode, setEnableLoginMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department_id: user.department_id || '',
        role: user.role === 'Admin' ? 'admin' : user.role === 'Manager' ? 'supervisor' : user.role === 'Foreman' ? 'foreman' : 'employee',
        status: user.status.toLowerCase(),
        employee_id: user.employeeId || '',
        pin: user.pin || '',
      });
      setDateOfHire(user.date_of_hire ? new Date(user.date_of_hire) : undefined);
      setAvatarPreview(user.avatar_url || null);
      setAvatarFile(null);
      // Reset enable login state
      setEnableLoginMode(false);
      setLoginEmail(user.email || '');
      setLoginPassword('');
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department_id: '',
        role: 'employee',
        status: 'active',
        employee_id: '',
        pin: '',
      });
      setPassword('');
      setCreateAuthAccount(false);
      setDateOfHire(undefined);
      setAvatarFile(null);
      setAvatarPreview(null);
      setEnableLoginMode(false);
      setLoginEmail('');
      setLoginPassword('');
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    setLoading(true);
    try {
      // Handle avatar upload if there's a new file
      let avatarUrl: string | undefined;
      if (avatarFile && company?.id) {
        const fileExtension = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${company.id}/${Date.now()}-avatar.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
      }

      if (isEditing) {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            display_name: `${formData.first_name} ${formData.last_name}`.trim(),
            email: formData.email,
            phone: formData.phone,
            department_id: formData.department_id || null,
            status: formData.status,
            employee_id: formData.employee_id || null,
            pin: formData.pin || null,
            date_of_hire: dateOfHire ? format(dateOfHire, 'yyyy-MM-dd') : null,
            ...(avatarUrl && { avatar_url: avatarUrl }),
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Update role if changed - always use profile_id for lookup (it always exists)
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (existingRole) {
          await supabase
            .from('user_roles')
            .update({ role: formData.role as 'admin' | 'supervisor' | 'employee' | 'foreman' })
            .eq('id', existingRole.id);
        } else {
          await supabase
            .from('user_roles')
            .insert({
              user_id: user.user_id || null,
              profile_id: user.id,
              role: formData.role as 'admin' | 'supervisor' | 'employee' | 'foreman',
            });
        }

        toast.success('User updated successfully');
      } else {
        // Create new user
        if (createAuthAccount) {
          // Create user with auth account via edge function
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email: formData.email,
              password: password,
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone,
              company_id: company.id,
              department_id: formData.department_id || null,
              role: formData.role,
              employee_id: formData.employee_id || null,
              pin: formData.pin || null,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);
        } else {
          // Auto-generate PIN if not provided
          let autoPin = formData.pin;
          if (!autoPin) {
            if (formData.phone) {
              const digitsOnly = formData.phone.replace(/\D/g, '');
              if (digitsOnly.length >= 4) {
                autoPin = digitsOnly.slice(-4);
              }
            }
            if (!autoPin && formData.employee_id) {
              autoPin = formData.employee_id.slice(-4);
            }
          }

          // Create profile without auth account (for timeclock-only employees)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              company_id: company.id,
              first_name: formData.first_name,
              last_name: formData.last_name,
              display_name: `${formData.first_name} ${formData.last_name}`.trim(),
              email: formData.email,
              phone: formData.phone,
              department_id: formData.department_id || null,
              status: formData.status,
              employee_id: formData.employee_id || null,
              pin: autoPin || null,
              date_of_hire: dateOfHire ? format(dateOfHire, 'yyyy-MM-dd') : null,
              avatar_url: avatarUrl || null,
            })
            .select()
            .single();

          if (profileError) throw profileError;

          // Create role for profile-only user
          await supabase
            .from('user_roles')
            .insert({
              user_id: profile.id,
              profile_id: profile.id,
              role: formData.role as 'admin' | 'supervisor' | 'employee',
            });
        }

        toast.success('User created successfully');
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className={`grid w-full ${isEditing ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="work">Work Details</TabsTrigger>
              <TabsTrigger value="access">Access & Security</TabsTrigger>
              {isEditing && <TabsTrigger value="certifications">Certifications</TabsTrigger>}
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24 rounded-full bg-muted overflow-hidden border-2 border-dashed border-muted-foreground/30">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </Button>
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="pl-9"
                      placeholder="First name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="pl-9"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-9"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-9"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="work" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                  >
                    <SelectTrigger className="pl-9">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="pl-9"
                      placeholder="EMP-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hire Date</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
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

            <TabsContent value="access" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="pl-9">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="foreman">Foreman</SelectItem>
                      <SelectItem value="supervisor">Manager / Supervisor</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code (for Timeclock)</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="pl-9"
                    placeholder="4-6 digit PIN"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional PIN for timeclock authentication
                </p>
              </div>

              {!isEditing && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="createAuthAccount"
                      checked={createAuthAccount}
                      onChange={(e) => setCreateAuthAccount(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="createAuthAccount" className="font-normal">
                      Create login account (allows dashboard access)
                    </Label>
                  </div>

                  {createAuthAccount && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Initial Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required={createAuthAccount}
                      />
                      <p className="text-xs text-muted-foreground">
                        User will be able to change this after first login
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Enable Login for existing employees without auth account */}
              {isEditing && user && user.user_id && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Account Information</p>
                    <p className="text-xs text-muted-foreground">
                      This employee has an associated login account and can access the dashboard.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const emailToUse = formData.email || user.email;
                      if (!emailToUse) {
                        toast.error("No email address available for this user");
                        return;
                      }
                      const redirectUrl = `${PRODUCTION_BASE_URL}/reset-password`;
                      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
                        redirectTo: redirectUrl,
                      });
                      if (error) {
                        toast.error(error.message);
                      } else {
                        toast.success("Password reset email sent successfully");
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Password Reset Email
                  </Button>
                </div>
              )}
              
              {isEditing && user && !user.user_id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Login Account</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      This employee does not have a login account. They can only use the time clock with their PIN.
                    </p>
                  </div>
                  
                  {!enableLoginMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEnableLoginMode(true)}
                      className="w-full"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Enable Login Access
                    </Button>
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <div className="space-y-2">
                        <Label htmlFor="loginEmail" className="text-amber-800 dark:text-amber-200">
                          Login Email
                        </Label>
                        <Input
                          id="loginEmail"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loginPassword" className="text-amber-800 dark:text-amber-200">
                          Password
                        </Label>
                        <Input
                          id="loginPassword"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEnableLoginMode(false);
                            setLoginPassword('');
                          }}
                          disabled={creatingLogin}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            if (!loginEmail || loginPassword.length < 6) {
                              toast.error('Please provide a valid email and password (min 6 characters)');
                              return;
                            }
                            setCreatingLogin(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('create-auth-account', {
                                body: {
                                  profile_id: user.id,
                                  email: loginEmail,
                                  password: loginPassword,
                                  role: formData.role
                                }
                              });
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              toast.success('Login account created successfully');
                              setEnableLoginMode(false);
                              setLoginPassword('');
                              onSave();
                            } catch (error) {
                              console.error('Error creating login account:', error);
                              toast.error(error instanceof Error ? error.message : 'Failed to create login account');
                            } finally {
                              setCreatingLogin(false);
                            }
                          }}
                          disabled={creatingLogin || !loginEmail || loginPassword.length < 6}
                          className="flex-1"
                        >
                          {creatingLogin ? 'Creating...' : 'Create Login Account'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {isEditing && user && (
              <TabsContent value="certifications" className="mt-4">
                <CertificationsList profileId={user.id} />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Employee' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
