
# Fix: Employee Hours Report Returns Empty for Single Day Selection

## Problem Identified
When a user selects a single date (e.g., `01/28/26`) for both start and end dates, the report returns no data even though there are 18+ time entries for that day.

## Root Cause
The date picker returns dates at midnight (`2026-01-28T00:00:00`). When used in the query:

```
start_time >= 2026-01-28T00:00:00Z
start_time <= 2026-01-28T00:00:00Z
```

This range only matches entries at exactly midnight, not the actual work hours (e.g., `13:07:23`).

**Database evidence:** Time entries for Jan 28, 2026 have `start_time` values like:
- `2026-01-28 13:07:23` (Anthony Giron Carias)
- `2026-01-28 13:06:15` (Felipe Salazar)
- `2026-01-28 12:58:59` (18 employees total)

All of these fall outside the midnight-to-midnight window because the end time isn't being adjusted.

## Solution
Adjust the end date to include the full day by setting it to `23:59:59.999` of the selected date.

### File: `src/pages/Reports.tsx`

**Change location:** Lines 96-97

**Current code:**
```typescript
const start = filters.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const end = filters.endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
```

**Problem:** The time adjustment only happens for the fallback (when no date is selected). When the user picks a date, it stays at midnight.

**Fixed code:**
```typescript
const start = filters.startDate 
  ? new Date(filters.startDate.getFullYear(), filters.startDate.getMonth(), filters.startDate.getDate(), 0, 0, 0)
  : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const end = filters.endDate 
  ? new Date(filters.endDate.getFullYear(), filters.endDate.getMonth(), filters.endDate.getDate(), 23, 59, 59, 999)
  : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
```

This ensures:
- Start date uses `00:00:00` (beginning of day)
- End date uses `23:59:59.999` (end of day)

## Summary

| Item | Details |
|------|---------|
| **Bug** | Single-day report returns empty because end time is midnight, not end-of-day |
| **Fix** | Adjust end date to `23:59:59.999` of selected day |
| **Files Changed** | `src/pages/Reports.tsx` (lines 96-97) |
| **Impact** | All report types (employee hours, project hours) will now work correctly for single-day and multi-day date ranges |
