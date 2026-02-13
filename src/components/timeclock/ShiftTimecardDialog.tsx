import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, ShieldCheck, CheckCircle, Send } from "lucide-react";

type JobAllocation = {
  projectId: string;
  materialHandling: number;
  processCut: number;
  fitupWeld: number;
  finishes: number;
  other: number;
};

type Project = {
  id: string;
  name: string;
  project_number?: string | null;
};

type ShiftTimecardDialogProps = {
  open: boolean;
  onSubmit: (allocations: JobAllocation[], injuryReported: boolean) => void;
  onCancel: () => void;
  totalShiftHours: number;
  projects: Project[];
};

const emptyRow = (): JobAllocation => ({
  projectId: "",
  materialHandling: 0,
  processCut: 0,
  fitupWeld: 0,
  finishes: 0,
  other: 0,
});

export const ShiftTimecardDialog: React.FC<ShiftTimecardDialogProps> = ({
  open,
  onSubmit,
  onCancel,
  totalShiftHours,
  projects,
}) => {
  const [rows, setRows] = useState<JobAllocation[]>([emptyRow()]);
  const [injuryReported, setInjuryReported] = useState<string | undefined>(undefined);

  const allocatedHours = useMemo(
    () =>
      rows.reduce(
        (sum, r) =>
          sum + r.materialHandling + r.processCut + r.fitupWeld + r.finishes + r.other,
        0
      ),
    [rows]
  );

  const unallocated = +(totalShiftHours - allocatedHours).toFixed(2);
  const statusColor =
    unallocated === 0
      ? "text-green-600"
      : unallocated < 0
      ? "text-destructive"
      : "text-foreground";

  const canSubmit =
    unallocated === 0 &&
    injuryReported !== undefined &&
    rows.every((r) => r.projectId !== "");

  const updateRow = (idx: number, field: keyof JobAllocation, value: string | number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleNumericChange = (
    idx: number,
    field: keyof Omit<JobAllocation, "projectId">,
    raw: string
  ) => {
    const val = raw === "" ? 0 : parseFloat(raw);
    if (!isNaN(val) && val >= 0) updateRow(idx, field, +val.toFixed(2));
  };

  const usedProjectIds = rows.map((r) => r.projectId).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent accidental dismissal on touch devices */ }}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto [&>button:last-child]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <DialogTitle>Shift Summary &amp; Time Card</DialogTitle>
          </div>
          <DialogDescription>
            Please allocate your hours to the appropriate jobs and tasks before
            clocking out.
          </DialogDescription>
        </DialogHeader>

        {/* Total Shift Hours badge */}
        <div className="flex justify-end">
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground block">Total Shift Hours</span>
            <span className="text-xl font-bold text-primary">
              {totalShiftHours.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Allocation table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 pr-2 font-medium">Job Name</th>
                <th className="text-center py-2 px-1 font-medium">Mat. Handling</th>
                <th className="text-center py-2 px-1 font-medium">Process &amp; Cut</th>
                <th className="text-center py-2 px-1 font-medium">Fitup/Weld</th>
                <th className="text-center py-2 px-1 font-medium">Finishes</th>
                <th className="text-center py-2 px-1 font-medium">Other</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 pr-2 min-w-[160px]">
                    <Select
                      value={row.projectId}
                      onValueChange={(v) => updateRow(idx, "projectId", v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select job…" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={
                              usedProjectIds.includes(p.id) && row.projectId !== p.id
                            }
                          >
                            {p.project_number ? `${p.project_number}: ${p.name}` : p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {(
                    [
                      "materialHandling",
                      "processCut",
                      "fitupWeld",
                      "finishes",
                      "other",
                    ] as const
                  ).map((field) => (
                    <td key={field} className="py-2 px-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.25}
                        className="h-9 w-20 text-center text-xs mx-auto"
                        value={row[field] || ""}
                        onChange={(e) => handleNumericChange(idx, field, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Another Job
        </Button>

        {/* Safety Check */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Safety Check
          </div>
          <p className="text-sm text-muted-foreground">
            Were you injured during this shift?
          </p>
          <RadioGroup
            value={injuryReported}
            onValueChange={setInjuryReported}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="injury-yes" />
              <Label htmlFor="injury-yes">Yes</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="injury-no" />
              <Label htmlFor="injury-no">No</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Unallocated Time */}
        <div className="border rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Unallocated Time
          </span>
          <div className="flex items-center gap-2">
            {unallocated === 0 && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <span className={`text-2xl font-bold ${statusColor}`}>
              {unallocated.toFixed(2)}
            </span>
          </div>
        </div>
        {unallocated === 0 && (
          <p className="text-xs text-green-600 text-right -mt-2">
            All hours accounted for
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <p className="text-xs text-muted-foreground hidden sm:block self-center">
            Confirm all entries are correct before submitting.
          </p>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onSubmit(rows, injuryReported === "yes")
            }
          >
            <Send className="h-4 w-4 mr-1" /> Submit Time Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
