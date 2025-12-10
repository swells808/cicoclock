import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useClients, Client } from '@/hooks/useClients';

interface ClientDialogProps {
  client?: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientDialog = ({ client, open, onOpenChange }: ClientDialogProps) => {
  const { createClient, updateClient } = useClients();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person_name: '',
    contact_person_title: '',
    phone: '',
    email: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (client) {
      setFormData({
        company_name: client.company_name || '',
        contact_person_name: client.contact_person_name || '',
        contact_person_title: client.contact_person_title || '',
        phone: client.phone || '',
        email: client.email || '',
        street_address: client.street_address || '',
        city: client.city || '',
        state_province: client.state_province || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        notes: client.notes || '',
        is_active: client.is_active,
      });
    } else {
      setFormData({
        company_name: '',
        contact_person_name: '',
        contact_person_title: '',
        phone: '',
        email: '',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: '',
        notes: '',
        is_active: true,
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) return;

    setLoading(true);
    try {
      if (client) {
        await updateClient(client.id, formData);
      } else {
        await createClient(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update client information' : 'Enter the details for the new client'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Enter company name"
                required
              />
            </div>

            <div>
              <Label htmlFor="contact_person_name">Contact Person</Label>
              <Input
                id="contact_person_name"
                value={formData.contact_person_name}
                onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <Label htmlFor="contact_person_title">Title</Label>
              <Input
                id="contact_person_title"
                value={formData.contact_person_title}
                onChange={(e) => setFormData({ ...formData, contact_person_title: e.target.value })}
                placeholder="Enter title"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="street_address">Street Address</Label>
              <Input
                id="street_address"
                value={formData.street_address}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                placeholder="Enter street address"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>

            <div>
              <Label htmlFor="state_province">State/Province</Label>
              <Input
                id="state_province"
                value={formData.state_province}
                onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                placeholder="Enter state/province"
              />
            </div>

            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="Enter postal code"
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Enter country"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any notes about this client"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.company_name.trim()}>
              {loading ? 'Saving...' : client ? 'Update Client' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
