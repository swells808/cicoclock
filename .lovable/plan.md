

# Shift Summary & Time Card -- Clock-Out Pop-up

## Overview
When an employee clocks out on the Timeclock page, a modal dialog will appear asking them to allocate their shift hours across jobs and task categories before the clock-out is finalized. This matches the provided visual reference.

## What You Will See
- After an employee triggers clock-out (and photo capture if enabled), a "Shift Summary & Time Card" dialog appears
- The dialog shows **Total Shift Hours** (calculated from clock-in to now)
- A table where the employee selects jobs from a dropdown and enters hours per task category: Material Handling, Processing & Cutting, Fabrication Fitup/Weld, Finishes, Other
- An "Add Another Job" button to add rows
- A "Safety Check" section with Yes/No radio buttons for injury reporting
- An "Unallocated Time" counter that shows remaining hours (green = 0, red = over, black = under)
- Cancel and Submit buttons

## Flow Change
Currently: Employee authenticates -> Clock Out -> (optional photo) -> clock-out completes -> success overlay

New flow: Employee authenticates -> Clock Out -> (optional photo) -> **Time Card dialog appears** -> Employee fills out allocations -> Submit -> clock-out completes -> success overlay

If the employee clicks Cancel, the clock-out is abandoned (no time entry is closed).

---

## Technical Details

### 1. New Component: `ShiftTimecardDialog`
**File:** `src/components/timeclock/ShiftTimecardDialog.tsx`

- A Dialog component using the existing Radix UI Dialog
- Props: `open`, `onSubmit`, `onCancel`, `totalShiftHours`, `projects` (list of active projects for the job dropdown), `companyId`, `profileId`
- Local state for job allocation rows: `Array<{ projectId: string, materialHandling: number, processCut: number, fitupWeld: number, finishes: number, other: number }>`
- Local state for `injuredDuringShift: boolean | null`
- Computed: `allocatedHours` = sum of all entered hours across all rows
- Computed: `unallocatedHours` = totalShiftHours - allocatedHours
- Color logic: unallocatedHours === 0 -> green, > 0 -> black (under-allocated), < 0 -> red (over-allocated)
- Submit is disabled until unallocatedHours === 0 and injury question is answered

### 2. New Database Table: `timecard_allocations`
A new migration to store the time card data:

```text
timecard_allocations
- id (uuid, PK)
- time_entry_id (uuid, FK to time_entries)
- project_id (uuid, FK to projects, nullable)
- company_id (uuid)
- profile_id (uuid)
- material_handling (numeric, default 0)
- processing_cutting (numeric, default 0)
- fabrication_fitup_weld (numeric, default 0)
- finishes (numeric, default 0)
- other (numeric, default 0)
- created_at (timestamptz)
```

And a column on `time_entries`:
- `injury_reported` (boolean, nullable)

RLS policies:
- Users can insert allocations for their company
- Users can view allocations in their company
- Admins can manage all allocations in their company

### 3. Modify `Timeclock.tsx` -- Clock-Out Flow
- Add state: `showTimecardDialog: boolean`, `pendingClockOutData` (to hold photoUrl/photoBlob while dialog is open)
- Fetch active projects using the existing `useActiveProjects` hook
- In `performClockOut`: instead of immediately calling the edge function, show the timecard dialog first
- On timecard submit: call the clock-out edge function, then insert `timecard_allocations` rows, then show success overlay
- On timecard cancel: abort clock-out, reset state

### 4. Update `clock-in-out` Edge Function
- Accept optional `injury_reported` boolean in the clock-out payload
- Write it to `time_entries.injury_reported` during the update

### 5. Files Changed
| File | Action |
|------|--------|
| `src/components/timeclock/ShiftTimecardDialog.tsx` | New component |
| `src/pages/Timeclock.tsx` | Integrate dialog into clock-out flow |
| `supabase/migrations/[new].sql` | Create `timecard_allocations` table, add `injury_reported` column to `time_entries`, RLS policies |
| `supabase/functions/clock-in-out/index.ts` | Accept and store `injury_reported` |

