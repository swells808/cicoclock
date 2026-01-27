import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { FaceVerification } from "@/hooks/useFaceVerifications";

interface FaceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verification: FaceVerification | null;
  employeeName?: string;
  onSuccess: () => void;
}

export const FaceReviewDialog: React.FC<FaceReviewDialogProps> = ({
  open,
  onOpenChange,
  verification,
  employeeName,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [profileSignedUrl, setProfileSignedUrl] = useState<string | null>(null);
  const [clockSignedUrl, setClockSignedUrl] = useState<string | null>(null);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Fetch signed URLs when dialog opens
  useEffect(() => {
    if (!open || !verification) {
      setProfileSignedUrl(null);
      setClockSignedUrl(null);
      return;
    }

    const fetchUrls = async () => {
      setLoadingUrls(true);

      const [profileResult, clockResult] = await Promise.all([
        verification.profile_photo_url
          ? supabase.storage
              .from("timeclock-photos")
              .createSignedUrl(verification.profile_photo_url, 3600)
          : Promise.resolve({ data: null, error: null }),
        verification.clock_photo_url
          ? supabase.storage
              .from("timeclock-photos")
              .createSignedUrl(verification.clock_photo_url, 3600)
          : Promise.resolve({ data: null, error: null }),
      ]);

      setProfileSignedUrl(profileResult.data?.signedUrl || null);
      setClockSignedUrl(clockResult.data?.signedUrl || null);
      setLoadingUrls(false);
    };

    fetchUrls();
  }, [open, verification]);

  if (!verification) return null;

  const handleReview = async (decision: "approved" | "rejected") => {
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("face_verifications")
      .update({
        review_decision: decision,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", verification.id);
    setSubmitting(false);
    if (!error) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const confidencePercent = verification.confidence_score
    ? (verification.confidence_score * 100).toFixed(1)
    : null;

  const confidenceColor =
    verification.confidence_score == null
      ? "text-muted-foreground"
      : verification.confidence_score < 0.5
        ? "text-red-600"
        : verification.confidence_score < 0.8
          ? "text-orange-500"
          : "text-green-600";

  const PhotoPlaceholder = ({ label }: { label: string }) => (
    <div className="w-full aspect-square rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
      <span className="text-sm text-muted-foreground">No {label}</span>
    </div>
  );

  const PhotoSkeleton = () => (
    <div className="w-full aspect-square rounded-lg border bg-muted animate-pulse" />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Face Verification Review
          </DialogTitle>
          <DialogDescription>
            {employeeName
              ? `Review face verification for ${employeeName}`
              : "Compare profile photo against clock photo"}
          </DialogDescription>
        </DialogHeader>

        {/* Photo comparison grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Profile Photo</p>
            {loadingUrls ? (
              <PhotoSkeleton />
            ) : profileSignedUrl ? (
              <img
                src={profileSignedUrl}
                alt="Profile photo"
                className="w-full aspect-square object-cover rounded-lg border"
              />
            ) : (
              <PhotoPlaceholder label="profile photo" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Clock Photo</p>
            {loadingUrls ? (
              <PhotoSkeleton />
            ) : clockSignedUrl ? (
              <img
                src={clockSignedUrl}
                alt="Clock photo"
                className="w-full aspect-square object-cover rounded-lg border"
              />
            ) : (
              <PhotoPlaceholder label="clock photo" />
            )}
          </div>
        </div>

        {/* Confidence score */}
        {confidencePercent != null && (
          <p className={`text-center text-sm font-medium ${confidenceColor}`}>
            Confidence: {confidencePercent}%
          </p>
        )}

        {/* Match status */}
        <p className="text-center text-sm">
          Match:{" "}
          <span
            className={
              verification.is_match ? "text-green-600 font-medium" : "text-red-600 font-medium"
            }
          >
            {verification.is_match ? "Yes" : "No"}
          </span>
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleReview("approved")}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Approve (Dismiss Flag)"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview("rejected")}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Reject (Confirm Fraud)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
