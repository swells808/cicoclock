
# Fix: Scheduled Reports List Not Updating After Create

## Problem Summary
When you create a new scheduled report, the report card doesn't appear until you refresh the page. This happens because the dialog and the list use **separate instances** of the `useScheduledReports` hook, each with their own local state.

## Root Cause
The flow currently works like this:

1. `ScheduledReportsManager` calls `useScheduledReports()` → gets `reports` list (Hook Instance A)
2. `ScheduledReportDialog` calls `useScheduledReports()` → gets `createReport` function (Hook Instance B)
3. When dialog calls `createReport()`, it triggers `fetchReports()` inside Hook Instance B
4. Hook Instance B's state updates, but Hook Instance A (the list) never gets notified

Since React hooks create independent state for each component that uses them, the manager's list doesn't see the new report until the page refreshes.

## Solution
Pass a callback from the Manager to the Dialog so the Manager can refetch its reports after a successful create/update.

## Changes Required

### File: `src/components/reports/ScheduledReportsManager.tsx`
- Destructure `refetch` from the `useScheduledReports()` hook
- Pass `refetch` as an `onSuccess` callback prop to `ScheduledReportDialog`

```typescript
// Line 24: Add refetch to destructured values
const { reports, loading, deleteReport, toggleReportStatus, sendTestEmail, refetch } = useScheduledReports();

// Line 219-222: Pass onSuccess callback to dialog
<ScheduledReportDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  report={editingReport}
  onSuccess={refetch}  // Add this prop
/>
```

### File: `src/components/reports/ScheduledReportDialog.tsx`
- Add `onSuccess` prop to the interface
- Call `onSuccess()` after successful create/update (after `onOpenChange(false)`)

```typescript
// Line 18-22: Update interface
interface ScheduledReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScheduledReport | null;
  onSuccess?: () => void;  // Add this
}

// Line 47: Accept the new prop
export const ScheduledReportDialog = ({ open, onOpenChange, report, onSuccess }: ScheduledReportDialogProps) => {

// Line 218-219: Call onSuccess after closing dialog
onOpenChange(false);
onSuccess?.();  // Add this line
```

## Technical Summary

| File | Change |
|------|--------|
| `src/components/reports/ScheduledReportsManager.tsx` | Extract `refetch` from hook, pass as `onSuccess` prop to dialog |
| `src/components/reports/ScheduledReportDialog.tsx` | Accept `onSuccess` prop, call it after successful save |

## Expected Outcome
After creating or editing a scheduled report, the list will immediately show the updated data without requiring a page refresh.
