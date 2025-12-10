import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PinInputProps {
  onPinEntered: (pin: string) => Promise<boolean>;
  employeeName: string;
  loading: boolean;
  error?: string;
  onCancel: () => void;
}

export const PinInput: React.FC<PinInputProps> = ({
  onPinEntered,
  employeeName,
  loading,
  error,
  onCancel,
}) => {
  const [pin, setPin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      const success = await onPinEntered(pin);
      if (!success) {
        setPin('');
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPin(value);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Enter PIN</CardTitle>
        <p className="text-center text-muted-foreground">
          {employeeName}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter your PIN"
              maxLength={6}
              disabled={loading}
              autoFocus
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pin.length < 4 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
