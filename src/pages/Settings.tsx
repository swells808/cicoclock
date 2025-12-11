import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyForm } from "@/components/settings/CompanyForm";
import { DepartmentManagement } from "@/components/settings/DepartmentManagement";
import { BadgeTemplateDesigner } from "@/components/badge/BadgeTemplateDesigner";
import { PhotoMigrationPanel } from "@/components/admin/PhotoMigrationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: ""
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
          return;
        }

        if (profile) {
          setFirstName(profile.first_name || "");
          setLastName(profile.last_name || "");
          setEmail(profile.email || user.email || "");
          setPhoneNumber(profile.phone || "");
          setPinCode(profile.pin || "");
          setAvatarUrl(profile.avatar_url || "");
          setAddress({
            street: profile.address_street || "",
            city: profile.address_city || "",
            state: profile.address_state || "",
            zipCode: profile.address_zip || "",
            country: profile.address_country || ""
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handlePinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setPinCode(value);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('user_id', user.id);

        if (updateError) {
          toast({ title: "Error", description: "Failed to update avatar", variant: "destructive" });
          return;
        }

        setAvatarUrl(urlData.publicUrl);
        toast({ title: "Success", description: "Avatar updated successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload avatar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phoneNumber,
          address_street: address.street,
          address_city: address.city,
          address_state: address.state,
          address_zip: address.zipCode,
          address_country: address.country,
        })
        .eq('user_id', user.id);

      if (error) {
        toast({ title: "Error", description: "Failed to save profile changes", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save profile changes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!user) return;
    if (pinCode.length < 4) {
      toast({ title: "Error", description: "PIN must be at least 4 digits", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('profiles').update({ pin: pinCode }).eq('user_id', user.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update PIN", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "PIN updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update PIN", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all password fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({ title: "Error", description: error.message || "Failed to update password", variant: "destructive" });
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Success", description: "Password updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <StandardHeader />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">Settings</h1>

          <Tabs defaultValue="company" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="badges">Badge Templates</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <div className="space-y-6">
                <CompanyForm />
                <DepartmentManagement />
              </div>
            </TabsContent>

            <TabsContent value="profile">
              {/* Profile Settings */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarUrl} alt="Profile photo" />
                        <AvatarFallback>
                          <User className="h-10 w-10 text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center">
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                          disabled={loading}
                          className="flex items-center gap-2"
                        >
                          <ImagePlus className="h-4 w-4" />
                          Change Avatar
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" placeholder="John" />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" placeholder="Doe" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="john@example.com" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1" placeholder="+1 (555) 000-0000" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Mailing Address</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="street">Street Address</Label>
                          <Input id="street" type="text" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className="mt-1" placeholder="123 Main St" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="mt-1" placeholder="City" />
                          </div>
                          <div>
                            <Label htmlFor="state">State</Label>
                            <Input id="state" type="text" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className="mt-1" placeholder="State" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="zipCode">ZIP Code</Label>
                            <Input id="zipCode" type="text" value={address.zipCode} onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} className="mt-1" placeholder="ZIP Code" />
                          </div>
                          <div>
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" type="text" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className="mt-1" placeholder="Country" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveProfile} disabled={loading || profileLoading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>

              {/* PIN Code Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Time Clock PIN</CardTitle>
                  <CardDescription>Set a PIN code for time clock access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pinCode">PIN Code (4-10 digits)</Label>
                      <Input id="pinCode" type="text" value={pinCode} onChange={handlePinCodeChange} placeholder="Enter PIN code" maxLength={10} className="mt-1 font-mono tracking-wider" />
                      <p className="text-sm text-gray-500 mt-1">This PIN will be used for time clock access</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleUpdatePin} disabled={loading || pinCode.length < 4}>
                    {loading ? "Updating..." : "Update PIN"}
                  </Button>
                </CardFooter>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="mt-1" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button onClick={handleUpdatePassword} disabled={loading || !newPassword || !confirmPassword}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>Logout</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="badges">
              <Card>
                <CardHeader>
                  <CardTitle>Badge Template Designer</CardTitle>
                  <CardDescription>Design and customize employee badge layouts</CardDescription>
                </CardHeader>
                <CardContent>
                  <BadgeTemplateDesigner />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">System Administration</h2>
                <PhotoMigrationPanel />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4 text-sm text-gray-500">
              <Link to="/support" className="hover:text-gray-700">
                Support
              </Link>
              <Link to="/privacy" className="hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-gray-700">
                Terms
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              © 2025 CICO Timeclock
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
