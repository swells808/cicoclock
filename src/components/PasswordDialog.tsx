import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PasswordDialogProps = {
  open: boolean;
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
};

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  open,
  onSubmit,
  onCancel,
  loading,
  error,
}) => {
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPassword("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(password);
  }

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogOverlay />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter your password to close</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2">
          <Input
            ref={inputRef}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            required
            className="mb-3"
          />
          {error && (
            <div className="text-red-600 text-sm mb-2">{error}</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#008000] text-white" disabled={loading || !password}>
              {loading ? "Verifying..." : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
