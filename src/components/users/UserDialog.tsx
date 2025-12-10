import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDepartments } from '@/hooks/useDepartments';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Building2, Shield, IdCard, KeyRound } from 'lucide-react';
import type { User as UserType } from '@/hooks/useUsers';

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

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department_id: '',
        role: user.role === 'Admin' ? 'admin' : user.role === 'Manager' ? 'supervisor' : 'employee',
        status: user.status.toLowerCase(),
        employee_id: user.employeeId || '',
        pin: user.pin || '',
      });
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
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    setLoading(true);
    try {
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
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Update role if changed
        const roleKey = user.user_id || user.id;
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .or(`user_id.eq.${roleKey},profile_id.eq.${user.id}`)
          .maybeSingle();

        if (existingRole) {
          await supabase
            .from('user_roles')
            .update({ role: formData.role as 'admin' | 'supervisor' | 'employee' })
            .eq('id', existingRole.id);
        } else {
          await supabase
            .from('user_roles')
            .insert({
              user_id: user.user_id || user.id,
              profile_id: user.id,
              role: formData.role as 'admin' | 'supervisor' | 'employee',
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
              pin: formData.pin || null,
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="work">Work Details</TabsTrigger>
              <TabsTrigger value="access">Access & Security</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
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
            </TabsContent>
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
