import { QRScanner } from "./QRScanner";

interface TaskCheckinScannerProps {
  onScan: (code: string) => void;
  isLoading?: boolean;
}

export const TaskCheckinScanner = ({ onScan, isLoading }: TaskCheckinScannerProps) => {
  return (
    <QRScanner
      title="Scan Task QR Code"
      description="Scan a task QR code or enter the task code manually"
      onScan={onScan}
      isLoading={isLoading}
      placeholder="Enter task code"
    />
  );
};
