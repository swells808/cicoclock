import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, X, Camera } from 'lucide-react';

interface QRScannerProps {
  title: string;
  description: string;
  onScan: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  autoStart?: boolean; // Auto-start camera scanning
  preferredCamera?: 'environment' | 'user'; // 'environment' = back, 'user' = front
}

export const QRScanner = ({
  title,
  description,
  onScan,
  isLoading = false,
  placeholder = "Enter ID or scan QR code",
  autoStart = false,
  preferredCamera = 'environment'
}: QRScannerProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<any>(null);
  const hasAutoStarted = useRef(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setScanError(null);
      const QrScanner = (await import('qr-scanner')).default;
      
      const qrScanner = new QrScanner(
        videoRef.current,
        (result: any) => {
          onScan(result.data);
          stopScanning();
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: preferredCamera,
        }
      );

      qrScannerRef.current = qrScanner;
      await qrScanner.start();
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      setScanError('Camera access denied or not available. Please use manual input.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    const scanner = qrScannerRef.current;
    if (scanner) {
      try {
        scanner.stop();
        scanner.destroy();
      } catch (e) {
        console.warn('Error stopping QR scanner:', e);
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setScanError(null);
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      setIsScanning(true);
    }
  };

  // Cleanup on unmount - use ref directly to avoid closure issues
  useEffect(() => {
    const scannerRef = qrScannerRef;
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          scanner.stop();
          scanner.destroy();
        } catch (e) {
          console.warn('Error cleaning up QR scanner on unmount:', e);
        }
        scannerRef.current = null;
      }
    };
  }, []);

  // Auto-start scanning on mount if enabled
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current && !isScanning) {
      hasAutoStarted.current = true;
      setIsScanning(true);
    }
  }, [autoStart]);

  // Start scanning when isScanning becomes true
  useEffect(() => {
    if (isScanning && videoRef.current && !qrScannerRef.current) {
      startScanning();
    }
  }, [isScanning]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show video first when scanning for better UX */}
        {isScanning && (
          <div className="relative">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-primary/50 rounded-lg shadow-lg">
                  <div className="w-full h-full border border-white/30 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Point camera at QR code</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopScanning}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {scanError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive text-center">{scanError}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="qr-input">ID or QR Code</Label>
          <Input
            id="qr-input"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="text-center"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Submit'}
          </Button>

          {!isScanning && (
            <Button
              variant="outline"
              onClick={toggleScanning}
              disabled={isLoading}
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR Code
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
