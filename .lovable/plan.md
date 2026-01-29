
# Update Employee Hours Report to Show Selected Date Range Hours

## Problem
The current report always displays "Week" and "Month" columns regardless of what date range the user selects. When the user picks a specific date (e.g., 01/28/26), they expect to see hours for **that date only** — not unrelated "last 7 days" and "month" buckets.

## Solution Overview
Modify the report to show a single "Hours" column that reflects **only** the hours worked within the selected date range. Also display the date range in the report title/header so it's clear what period the data covers.

---

## Technical Changes

### File: `src/pages/Reports.tsx`

**Change 1: Simplify data structure** (lines ~154-186)

Replace the "week/month" accumulation with a single "hours" field:

```typescript
// Before
acc[entryKey] = {
  name,
  week: 0,
  month: 0,
  odId: entryKey,
  departmentId: profile?.department_id
};
acc[entryKey].month += hours;
// plus week calculation logic

// After
acc[entryKey] = {
  name,
  hours: 0,
  odId: entryKey,
  departmentId: profile?.department_id
};
acc[entryKey].hours += hours;
// Remove the week logic entirely
```

**Change 2: Update data mapping** (lines ~188-194)

```typescript
// Before
.map((data: any) => ({
  name: data.name,
  week: Math.round(data.week),
  month: Math.round(data.month),
  ...
}))

// After
.map((data: any) => ({
  name: data.name,
  hours: Math.round(data.hours * 10) / 10,  // One decimal for precision
  ...
}))
```

**Change 3: Apply same changes for project reports** (lines ~209-245)

Same pattern: replace week/month with single "hours" field.

**Change 4: Update title to include date range** (lines ~249-252)

```typescript
// Before
const title = filters.reportType === "employee"
  ? "Work Hours Per Employee"
  : "Project Time Distribution";

// After  
const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateRangeStr = start.toDateString() === end.toDateString()
  ? formatDate(start)
  : `${formatDate(start)} - ${formatDate(end)}`;
  
const title = filters.reportType === "employee"
  ? `Work Hours Per Employee — ${dateRangeStr}`
  : `Project Time Distribution — ${dateRangeStr}`;
```

---

### File: `src/utils/reportUtils.ts`

**Change 1: Update `buildRealTableHTML` to accept dynamic columns** (lines ~43-115)

```typescript
// Before
const columns = ["Name", "Week", "Month"];

// After - accept columns as parameter
export function buildRealTableHTML(
  type: "employee" | "project",
  data: any[],
  columns: string[] = ["Name", "Hours"],  // New default
  title?: string,
  dateRange?: { start: Date; end: Date }
) {
```

**Change 2: Update the totals row** (lines ~99-104)

```typescript
// Before - hardcoded week/month totals
<td style='padding:8px;'>${totalWeek.toFixed(1)}</td>
<td style='padding:8px;'>${totalMonth.toFixed(1)}</td>

// After - dynamic based on columns
```

**Change 3: Update `ReportEmployeeData` and `ReportProjectData` interfaces** (lines ~24-34)

```typescript
// Before
export interface ReportEmployeeData {
  name: string;
  week: number;
  month: number;
}

// After
export interface ReportEmployeeData {
  name: string;
  hours: number;  // Just the selected period hours
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Replace week/month with single "hours" field; add date range to title |
| `src/utils/reportUtils.ts` | Update table builder to use "Name" + "Hours" columns; update interfaces |

## Expected Outcome
When selecting a date range like `01/28/26` to `01/28/26`:
- Report title: **"Work Hours Per Employee — Jan 28, 2026"**
- Columns: **Name** | **Hours**
- Data: Shows only hours worked on that specific day

When selecting a range like `01/20/26` to `01/28/26`:
- Report title: **"Work Hours Per Employee — Jan 20, 2026 - Jan 28, 2026"**
- Columns: **Name** | **Hours**
- Data: Shows total hours worked across that entire range
