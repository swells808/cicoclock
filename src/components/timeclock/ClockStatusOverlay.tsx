import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClockStatusType = "clock_in" | "clock_out" | "error" | null;

interface ClockStatusOverlayProps {
  status: ClockStatusType;
  employeeName?: string;
  message?: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const ClockStatusOverlay: React.FC<ClockStatusOverlayProps> = ({
  status,
  employeeName = "Employee",
  message,
  onDismiss,
  autoDismissMs = 2500,
}) => {
  useEffect(() => {
    if (status) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss, autoDismissMs]);

  if (!status) return null;

  const config = {
    clock_in: {
      bgClass: "bg-green-500",
      icon: CheckCircle,
      title: "Clocked In!",
      defaultMessage: `Welcome, ${employeeName}!`,
    },
    clock_out: {
      bgClass: "bg-red-500",
      icon: CheckCircle,
      title: "Clocked Out!",
      defaultMessage: `Goodbye, ${employeeName}!`,
    },
    error: {
      bgClass: "bg-yellow-500",
      icon: AlertTriangle,
      title: "Error",
      defaultMessage: message || "An error occurred. Please try again.",
    },
  };

  const { bgClass, icon: Icon, title, defaultMessage } = config[status];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        bgClass
      )}
      onClick={onDismiss}
    >
      <div className="flex flex-col items-center gap-6 text-white text-center px-8">
        <Icon className="h-32 w-32" strokeWidth={1.5} />
        <h1 className="text-5xl md:text-6xl font-bold">{title}</h1>
        <p className="text-2xl md:text-3xl opacity-90">
          {message || defaultMessage}
        </p>
      </div>
    </div>
  );
};
