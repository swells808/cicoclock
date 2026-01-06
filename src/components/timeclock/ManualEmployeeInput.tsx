import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft } from 'lucide-react';

interface ManualEmployeeInputProps {
  onLookup: (identifier: string) => Promise<void>;
  loading: boolean;
  error?: string | null;
  onCancel: () => void;
}

export const ManualEmployeeInput: React.FC<ManualEmployeeInputProps> = ({
  onLookup,
  loading,
  error,
  onCancel,
}) => {
  const [identifier, setIdentifier] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim()) {
      await onLookup(identifier.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Enter Employee ID or Phone</CardTitle>
        <p className="text-center text-muted-foreground text-sm">
          Enter your employee number or phone number to clock in/out
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Employee ID or Phone Number</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., EMP001 or 555-123-4567"
              disabled={loading}
              autoFocus
              className="text-center text-lg"
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
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={!identifier.trim() || loading}
              className="flex-1"
            >
              {loading ? (
                'Looking up...'
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Me
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
