
# Fix: Employee Filter for Timeclock-Only Employees

## Problem
When selecting an employee like "Adan Encinias" (who has no `user_id`) on the Time Tracking page, the filter returns zero results even though time entries exist. This affects approximately 69 employees who clock in via PIN without an authentication account.

## Technical Cause
The employee dropdown uses `profile_id` for timeclock-only employees, but the filter only checks `entry.user_id`, ignoring `entry.profile_id`.

## Solution
Update the filtering logic in `src/pages/AdminTimeTracking.tsx` to check both `user_id` AND `profile_id` when filtering time entries by employee.

## Changes

### File: `src/pages/AdminTimeTracking.tsx`

**Update the filter logic (around line 228-231):**

Current code:
```typescript
const filteredEntries = useMemo(() => {
  if (selectedEmployee === "all") return timeEntries;
  return timeEntries.filter(entry => entry.user_id === selectedEmployee);
}, [timeEntries, selectedEmployee]);
```

Updated code:
```typescript
const filteredEntries = useMemo(() => {
  if (selectedEmployee === "all") return timeEntries;
  return timeEntries.filter(entry => 
    entry.user_id === selectedEmployee || 
    entry.profile_id === selectedEmployee
  );
}, [timeEntries, selectedEmployee]);
```

## Verification
After the fix, selecting "Adan Encinias" for dates 2/2/26 or 2/3/26 will correctly display their time entries.
