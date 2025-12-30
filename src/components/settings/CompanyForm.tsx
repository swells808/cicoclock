import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export const CompanyForm: React.FC = () => {
  const { company, companyFeatures, refetchCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    website: '',
    phone: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    company_logo_url: ''
  });

  const [features, setFeatures] = useState({
    photo_capture: true,
    geolocation: true,
    employee_pin: false,
    mapbox_public_token: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || '',
        industry: company.industry || '',
        website: company.website || '',
        phone: company.phone || '',
        street_address: company.street_address || '',
        city: company.city || '',
        state_province: company.state_province || '',
        postal_code: company.postal_code || '',
        country: company.country || '',
        company_logo_url: company.company_logo_url || ''
      });
    }
    if (companyFeatures) {
      setFeatures({
        photo_capture: companyFeatures.photo_capture,
        geolocation: companyFeatures.geolocation,
        employee_pin: companyFeatures.employee_pin,
        mapbox_public_token: companyFeatures.mapbox_public_token || '',
      });
    }
  }, [company, companyFeatures]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;

    setLogoUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, company_logo_url: data.publicUrl }));

      toast({
        title: "Logo Uploaded",
        description: "Company logo has been uploaded successfully."
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the logo.",
        variant: "destructive"
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', company.id);

      if (error) throw error;

      await refetchCompany();

      toast({
        title: "Settings Saved",
        description: "Company information has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "There was an error updating the company information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_features')
        .upsert({
          company_id: company.id,
          ...features,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feature settings updated successfully',
      });
      refetchCompany();
    } catch (error) {
      console.error('Error updating features:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading company information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Update your company details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center space-x-4">
                {formData.company_logo_url && (
                  <img
                    src={formData.company_logo_url}
                    alt="Company Logo"
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                )}
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={logoUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Address</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input
                    id="street_address"
                    value={formData.street_address}
                    onChange={(e) => handleInputChange('street_address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state_province">State/Province</Label>
                    <Input
                      id="state_province"
                      value={formData.state_province}
                      onChange={(e) => handleInputChange('state_province', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Company Information'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeclock Features</CardTitle>
          <CardDescription>Configure which features are enabled for your timeclock</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Photo Capture</Label>
              <p className="text-sm text-muted-foreground">Require photo on clock in/out</p>
            </div>
            <Switch
              checked={features.photo_capture}
              onCheckedChange={(checked) => setFeatures({ ...features, photo_capture: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Geolocation</Label>
              <p className="text-sm text-muted-foreground">Track location on clock in/out</p>
            </div>
            <Switch
              checked={features.geolocation}
              onCheckedChange={(checked) => setFeatures({ ...features, geolocation: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Employee PIN</Label>
              <p className="text-sm text-muted-foreground">Require PIN for timeclock access</p>
            </div>
            <Switch
              checked={features.employee_pin}
              onCheckedChange={(checked) => setFeatures({ ...features, employee_pin: checked })}
            />
          </div>
          
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="mapbox_token">Mapbox Public Token</Label>
            <p className="text-sm text-muted-foreground">Required for location maps on time entries</p>
            <Input
              id="mapbox_token"
              type="text"
              value={features.mapbox_public_token}
              onChange={(e) => setFeatures({ ...features, mapbox_public_token: e.target.value })}
              placeholder="pk.eyJ1IjoieW91..."
            />
            <p className="text-xs text-muted-foreground">
              Get your public token from <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveFeatures} disabled={loading}>
            {loading ? 'Saving...' : 'Save Features'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
