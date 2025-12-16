import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, X, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoCaptureProps {
  open: boolean;
  onCapture: (photoBlob: Blob) => void;
  onCancel: () => void;
  onSkip?: () => void;
  title?: string;
  description?: string;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  open,
  onCapture,
  onCancel,
  onSkip,
  title = "Take Photo",
  description = "Please take a photo for verification"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('PhotoCapture useEffect - open:', open, 'isStreaming:', isStreaming);
    if (open && !isStreaming) {
      console.log('Starting camera...');
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    console.log('=== START CAMERA ===');
    try {
      setError(null);
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      console.log('Camera stream obtained:', stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        console.log('Camera streaming started');
      } else {
        console.error('videoRef.current is null');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const capturePhoto = () => {
    console.log('=== CAPTURE PHOTO ===');
    if (!videoRef.current || !canvasRef.current) {
      console.error('capturePhoto: videoRef or canvasRef is null');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error('capturePhoto: Could not get canvas context');
      return;
    }

    console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    console.log('Drawing to canvas and converting to blob...');
    canvas.toBlob((blob) => {
      console.log('toBlob callback - blob:', blob);
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
        console.log('Photo captured successfully, size:', blob.size);
      } else {
        console.error('toBlob returned null');
      }
    }, "image/jpeg", 0.85);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    console.log('=== CONFIRM PHOTO ===');
    if (!canvasRef.current) {
      console.error('confirmPhoto: canvasRef is null');
      return;
    }

    console.log('Converting canvas to blob for confirmation...');
    canvasRef.current.toBlob((blob) => {
      console.log('confirmPhoto toBlob callback - blob:', blob);
      if (blob) {
        console.log('Calling onCapture with blob size:', blob.size);
        onCapture(blob);
        setCapturedImage(null);
      } else {
        console.error('confirmPhoto: toBlob returned null');
      }
    }, "image/jpeg", 0.85);
  };

  const handleCancel = () => {
    stopCamera();
    setCapturedImage(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[600px]">
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
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex flex-col gap-3">
            <div className="flex justify-center gap-3">
              {!capturedImage ? (
                <>
                  <Button
                    onClick={capturePhoto}
                    disabled={!isStreaming}
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Capture Photo
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="lg">
                    <X className="mr-2 h-5 w-5" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={confirmPhoto} size="lg" className="bg-green-600 hover:bg-green-700">
                    Confirm & Continue
                  </Button>
                  <Button onClick={retakePhoto} variant="outline" size="lg">
                    <RotateCw className="mr-2 h-5 w-5" />
                    Retake
                  </Button>
                </>
              )}
            </div>
            {/* Skip photo button for debugging/bypass */}
            {onSkip && (
              <Button 
                onClick={onSkip} 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground"
              >
                Skip Photo (Debug)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
