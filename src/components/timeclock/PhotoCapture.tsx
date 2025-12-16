import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

interface PhotoCaptureProps {
  open: boolean;
  onCapture: (photoBlob: Blob) => void;
  onCancel: () => void;
  onSkip?: () => void;
  title?: string;
  description?: string;
  autoCapture?: boolean;
  autoCaptureDelay?: number; // seconds before auto-capture
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  open,
  onCapture,
  onCancel,
  onSkip,
  title = "Take Photo",
  description = "Please take a photo for verification",
  autoCapture = false,
  autoCaptureDelay = 3
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (open && !isStreaming) {
      startCamera();
    }

    return () => {
      stopCamera();
      setCountdown(null);
    };
  }, [open]);

  // Auto-capture countdown effect
  useEffect(() => {
    if (!autoCapture || !isStreaming || countdown === null) return;

    if (countdown === 0) {
      captureAndConfirm();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, autoCapture, isStreaming]);

  // Start countdown when streaming begins in auto mode
  useEffect(() => {
    if (autoCapture && isStreaming && countdown === null) {
      setCountdown(autoCaptureDelay);
    }
  }, [autoCapture, isStreaming, autoCaptureDelay]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
      // If camera fails in auto mode, skip after delay
      if (autoCapture && onSkip) {
        setTimeout(() => onSkip(), 2000);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const captureAndConfirm = () => {
    if (!videoRef.current || !canvasRef.current) {
      // If refs not available, skip photo
      if (onSkip) onSkip();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      if (onSkip) onSkip();
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        stopCamera();
        onCapture(blob);
      } else if (onSkip) {
        onSkip();
      }
    }, "image/jpeg", 0.85);
  };

  const handleCancel = () => {
    stopCamera();
    setCountdown(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Countdown overlay */}
            {autoCapture && countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="text-center">
                  <div className="text-7xl font-bold text-white drop-shadow-lg animate-pulse">
                    {countdown}
                  </div>
                  <p className="text-white text-lg mt-2">Hold still...</p>
                </div>
              </div>
            )}
            
            {/* Camera icon when not streaming */}
            {!isStreaming && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-16 w-16 text-muted-foreground animate-pulse" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {autoCapture && (
            <p className="text-center text-muted-foreground text-sm">
              Photo will be captured automatically
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
