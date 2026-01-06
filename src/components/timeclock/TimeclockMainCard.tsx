import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, User } from "lucide-react";
import { Employee } from "@/hooks/useEmployees";

type TimeclockMainCardProps = {
  selectedEmployee: string;
  setSelectedEmployee: (v: string) => void;
  isActionEnabled: boolean;
  employees: Employee[];
  employeesLoading: boolean;
  authenticatedEmployee: Employee | null;
  clockStatus: 'in' | 'out';
  onClockIn: () => void;
  onClockOut: () => void;
  onBreak: () => void;
  onScanBadge?: () => void;
  onManualEntry?: () => void;
  t: (key: string) => string;
};

export const TimeclockMainCard: React.FC<TimeclockMainCardProps> = ({
  selectedEmployee,
  setSelectedEmployee,
  isActionEnabled,
  employees,
  employeesLoading,
  authenticatedEmployee,
  clockStatus,
  onClockIn,
  onClockOut,
  onBreak,
  onScanBadge,
  onManualEntry,
  t,
}) => (
  <section className="max-w-md mx-auto">
    <Card className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2 text-foreground">{t("timeclock.selectEmployee")}</h2>
        {authenticatedEmployee ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-green-800 dark:text-green-200 font-medium">{authenticatedEmployee.display_name}</p>
            <p className="text-green-600 dark:text-green-400 text-sm">Authenticated</p>
            <p className="text-green-700 dark:text-green-300 text-xs mt-1 font-semibold">
              Status: {clockStatus === 'in' ? 'Clocked In' : 'Clocked Out'}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("timeclock.pleaseSelectAndPin")}</p>
        )}
      </div>

      {!authenticatedEmployee && (
        <div className="space-y-3 mb-4">
          {onScanBadge && (
            <Button
              variant="outline"
              onClick={onScanBadge}
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Badge
            </Button>
          )}

          {onManualEntry && (
            <Button
              variant="outline"
              onClick={onManualEntry}
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              Enter ID or Phone
            </Button>
          )}
        </div>
      )}

      {authenticatedEmployee && (
        <div className="mb-6 text-center">
          <Button
            variant="outline"
            onClick={() => setSelectedEmployee("")}
            size="sm"
          >
            Switch Employee
          </Button>
        </div>
      )}
    </Card>
  </section>
);
