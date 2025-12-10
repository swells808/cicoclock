import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export const CompanyForm = () => {
  const { company, companyFeatures, refetchCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
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
  });

  const [features, setFeatures] = useState({
    photo_capture: true,
    geolocation: true,
    employee_pin: false,
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
      });
    }
    if (companyFeatures) {
      setFeatures({
        photo_capture: companyFeatures.photo_capture,
        geolocation: companyFeatures.geolocation,
        employee_pin: companyFeatures.employee_pin,
      });
    }
  }, [company, companyFeatures]);

  const handleSaveCompany = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company settings updated successfully',
      });
      refetchCompany();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company settings',
        variant: 'destructive',
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Update your company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Address</h3>
            <div>
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                value={formData.street_address}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state_province">State/Province</Label>
                <Input
                  id="state_province"
                  value={formData.state_province}
                  onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveCompany} disabled={loading}>
            {loading ? 'Saving...' : 'Save Company Info'}
          </Button>
        </CardFooter>
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
