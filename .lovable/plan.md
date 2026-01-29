
# Fix: Employee Hours Report Shows Blank + Add Filtering Options

## Problem Summary
The "Employee Hours" report generates blank results because the system queries time entries using `user_id`, but most time entries only have `profile_id` set (employees clocking in via PIN don't have auth accounts).

## Root Cause

**Current Query Logic (broken):**
```
time_entries.user_id → profiles.user_id (lookup)
```

**What the data actually has:**
- Time entries: `profile_id` is populated, `user_id` is NULL
- Profiles: `user_id` is often NULL (employees without login accounts)

The report tries to match `time_entries.user_id` to `profiles.user_id`, but since most time entries have NULL `user_id`, no matches are found.

## Solution Overview

### Part 1: Fix the Report Query (Critical)
Update the report generation to use `profile_id` instead of `user_id` for employee lookup.

### Part 2: Add Employee/Department Filtering (Feature Request)
Add dropdown filters to select:
- All Employees (default)
- Specific Employee
- Specific Department

---

## Technical Changes

### File: `src/pages/Reports.tsx`

**Change 1:** Fetch `profile_id` in the time entries query (line ~113)
```typescript
// Before
.select(`duration_minutes, start_time, end_time, user_id, projects(...)`)

// After  
.select(`duration_minutes, start_time, end_time, user_id, profile_id, projects(...)`)
```

**Change 2:** Build profile lookup map using profile `id` as key (line ~134-137)
```typescript
// Before
const userProfiles = profiles?.reduce((acc, profile) => {
  acc[profile.user_id] = profile;
  return acc;
}, {} as Record<string, any>) || {};

// After
const userProfiles = profiles?.reduce((acc, profile) => {
  acc[profile.id] = profile;  // Use profile.id as key
  if (profile.user_id) {
    acc[profile.user_id] = profile;  // Also index by user_id for backwards compatibility
  }
  return acc;
}, {} as Record<string, any>) || {};
```

**Change 3:** Look up profile by `profile_id` first, fall back to `user_id` (line ~143-149)
```typescript
// Before
const profile = userProfiles[entry.user_id];

// After
const profile = entry.profile_id 
  ? userProfiles[entry.profile_id] 
  : userProfiles[entry.user_id];
```

**Change 4:** Use `profile_id` or `user_id` as grouping key
```typescript
// Before
const userId = entry.user_id;
if (!acc[userId]) { ... }

// After
const entryKey = entry.profile_id || entry.user_id || 'unknown';
if (!acc[entryKey]) { ... }
```

---

### File: `src/components/reports/ReportFilters.tsx`

**Add new filter controls for Employee and Department:**

1. Add state variables for `selectedEmployeeId` and `selectedDepartmentId`
2. Add hooks to fetch employees and departments lists
3. Add two new Select dropdowns in the filter grid
4. Update `ReportFiltersValues` interface to include these new fields
5. Pass values in `handleApply`

**New interface fields:**
```typescript
export interface ReportFiltersValues {
  reportType: 'employee' | 'project' | 'daily' | 'timecard';
  startDate?: Date;
  endDate?: Date;
  departmentId?: string;   // Already exists
  employeeId?: string;     // Already exists
}
```

**New UI elements:**
- "Employee" dropdown: Options = "All Employees" + list of employees from profiles
- "Department" dropdown: Options = "All Departments" + list from departments table

---

### File: `src/pages/Reports.tsx` (continued)

**Apply filters to the generated report:**

When `filters.employeeId` is set:
- Filter `reportData` to only include that employee

When `filters.departmentId` is set:
- Filter `reportData` to only include employees in that department

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Fix profile lookup to use `profile_id`; apply employee/department filters |
| `src/components/reports/ReportFilters.tsx` | Add Employee and Department dropdown filters |
| `src/hooks/useReports.ts` | Update to use `profile_id` for employee grouping |

## Expected Outcome
1. Employee Hours report will correctly show all employee hours, including those who clocked in via PIN
2. Users can filter by specific employee or department before generating reports
