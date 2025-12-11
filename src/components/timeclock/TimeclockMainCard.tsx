import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, Coffee, QrCode } from "lucide-react";
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
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={employeesLoading ? "Loading employees..." : t("timeclock.selectEmployeeDropdown")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
              {employeesLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : employees.length === 0 ? (
                  <SelectItem value="no-employees" disabled>No employees found</SelectItem>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.display_name}
                    </SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button
          disabled={!isActionEnabled || clockStatus === 'in'}
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={onClockIn}
        >
          <Play className="w-4 h-4 mr-2" />
          {t("timeclock.clockIn")}
        </Button>
        <Button
          disabled={!isActionEnabled || clockStatus === 'out'}
          variant="destructive"
          onClick={onClockOut}
        >
          <Square className="w-4 h-4 mr-2" />
          {t("timeclock.clockOut")}
        </Button>
      </div>

      <Button
        disabled={!isActionEnabled}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-6"
        onClick={onBreak}
      >
        <Coffee className="w-4 h-4 mr-2" />
        {t("timeclock.break")}
      </Button>
    </Card>
  </section>
);
