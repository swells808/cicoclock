
# Add Employee and Department Filtering to Daily Timecard and Time Entry Details Reports

## Problem
The "Daily Timecard" and "Time Entry Details" reports currently:
1. Don't show the Employee/Department filter dropdowns in the UI (filters are only enabled for "Employee Hours" report type)
2. Components don't accept employee/department filter props
3. Components are rendered with hardcoded dates, not connected to the filter system

## Solution Overview
1. Extend the filter visibility logic to include `daily` and `timecard` report types
2. Update both report components to accept and apply `employeeId` and `departmentId` filters
3. Connect the reports to the filter state in the Reports page
4. Maintain role-based access control (regular employees can only filter to themselves)

---

## Technical Changes

### File 1: `src/components/reports/ReportFilters.tsx`

**Change: Update filter visibility logic** (lines 116-117)

```typescript
// Before
const showEmployeeFilter = reportType === 'employee';
const showDepartmentFilter = reportType === 'employee';

// After - show filters for all report types that need employee/department filtering
const showEmployeeFilter = ['employee', 'daily', 'timecard'].includes(reportType);
const showDepartmentFilter = ['employee', 'daily', 'timecard'].includes(reportType);
```

---

### File 2: `src/components/reports/DailyTimecardReport.tsx`

**Change 1: Update props interface** (lines 26-28)

```typescript
interface DailyTimecardReportProps {
  date?: Date;
  employeeId?: string;
  departmentId?: string;
}
```

**Change 2: Accept new props and fetch department_id in profiles** (lines 30-35)

```typescript
export const DailyTimecardReport: React.FC<DailyTimecardReportProps> = ({ 
  date: propDate,
  employeeId,
  departmentId
}) => {
```

**Change 3: Update profile query to include department_id** (lines 74-77)

```typescript
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, user_id, first_name, last_name, display_name, department_id')
  .in('user_id', userIds);
```

**Change 4: Update profile map and TimeEntry interface** (lines 10-24, 81-84)

Add `profile_id` to query and interface, include `department_id` in profile map:

```typescript
interface TimeEntry {
  id: string;
  user_id: string;
  profile_id: string | null;
  // ... existing fields
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
  };
}
```

**Change 5: Add filtering logic after fetching entries** (after line 89)

```typescript
// Filter by employee if specified
let filteredEntries = data.map(entry => ({
  ...entry,
  profile: profileMap[entry.user_id]
}));

if (employeeId) {
  filteredEntries = filteredEntries.filter(entry => 
    entry.profile?.id === employeeId || entry.profile_id === employeeId
  );
}

if (departmentId) {
  filteredEntries = filteredEntries.filter(entry => 
    entry.profile?.department_id === departmentId
  );
}

setEntries(filteredEntries);
```

**Change 6: Update useEffect dependency array** (line 98)

```typescript
}, [company?.id, dateStr, employeeId, departmentId]);
```

---

### File 3: `src/components/reports/TimeEntryDetailsReport.tsx`

**Change 1: Update props interface** (lines 37-40)

```typescript
interface TimeEntryDetailsReportProps {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  departmentId?: string;
}
```

**Change 2: Accept new props** (lines 42-47)

```typescript
export const TimeEntryDetailsReport: React.FC<TimeEntryDetailsReportProps> = ({ 
  startDate: propStartDate,
  endDate: propEndDate,
  employeeId,
  departmentId
}) => {
```

**Change 3: Update profile query to include id and department_id** (lines 101-104)

```typescript
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, user_id, first_name, last_name, display_name, department_id')
  .in('user_id', userIds);
```

**Change 4: Update TimeEntryDetail interface and profile type** (lines 11-35)

```typescript
interface TimeEntryDetail {
  id: string;
  user_id: string;
  profile_id: string | null;
  // ... existing fields
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
  };
}
```

**Change 5: Add filtering logic** (after line 116)

```typescript
let filteredEntries = data.map(entry => ({
  ...entry,
  profile: profileMap[entry.user_id]
}));

if (employeeId) {
  filteredEntries = filteredEntries.filter(entry => 
    entry.profile?.id === employeeId || entry.profile_id === employeeId
  );
}

if (departmentId) {
  filteredEntries = filteredEntries.filter(entry => 
    entry.profile?.department_id === departmentId
  );
}

setEntries(filteredEntries);
```

**Change 6: Update time_entries query to include profile_id** (lines 71-95)

Add `profile_id` to the select statement.

**Change 7: Update useEffect dependency array** (line 125)

```typescript
}, [company?.id, startDateStr, endDateStr, employeeId, departmentId]);
```

---

### File 4: `src/pages/Reports.tsx`

**Change 1: Add state to track applied filters** (after line 81)

```typescript
const [appliedFilters, setAppliedFilters] = useState<ReportFiltersValues | null>(null);
```

**Change 2: Update handleGenerateReport to store filters** (inside the function)

```typescript
const handleGenerateReport = async (filters: ReportFiltersValues) => {
  // Store applied filters for daily/timecard reports
  setAppliedFilters(filters);
  
  // For daily and timecard, we just update the state - no popup needed
  if (filters.reportType === 'daily' || filters.reportType === 'timecard') {
    setSelectedStartDate(filters.startDate);
    setSelectedEndDate(filters.endDate);
    return;
  }
  
  // ... existing popup logic for employee/project reports
};
```

**Change 3: Pass filters to report components** (lines 357-360)

```typescript
{/* Daily Timecard Report */}
<DailyTimecardReport 
  date={appliedFilters?.reportType === 'daily' ? appliedFilters.startDate : new Date()}
  employeeId={appliedFilters?.employeeId}
  departmentId={appliedFilters?.departmentId}
/>

{/* Time Entry Details Report */}
<TimeEntryDetailsReport 
  startDate={appliedFilters?.reportType === 'timecard' ? appliedFilters.startDate : new Date()} 
  endDate={appliedFilters?.reportType === 'timecard' ? appliedFilters.endDate : new Date()}
  employeeId={appliedFilters?.employeeId}
  departmentId={appliedFilters?.departmentId}
/>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/reports/ReportFilters.tsx` | Show Employee/Department filters for `daily` and `timecard` report types |
| `src/components/reports/DailyTimecardReport.tsx` | Accept `employeeId` and `departmentId` props; filter entries accordingly |
| `src/components/reports/TimeEntryDetailsReport.tsx` | Accept `employeeId` and `departmentId` props; filter entries accordingly |
| `src/pages/Reports.tsx` | Store applied filters in state; pass filters to report components |

## Expected Behavior

| Report Type | Employee Filter | Department Filter | Behavior |
|-------------|-----------------|-------------------|----------|
| Employee Hours | Visible (for Admin/Supervisor) | Visible (for Admin/Supervisor) | Opens popup with filtered data |
| Project Hours | Hidden | Hidden | Opens popup with project data |
| Daily Timecard | Visible (for Admin/Supervisor) | Visible (for Admin/Supervisor) | Updates inline report with filter |
| Time Entry Details | Visible (for Admin/Supervisor) | Visible (for Admin/Supervisor) | Updates inline report with filter |

## Role-Based Access Control (Maintained)
- **Admin/Supervisor**: Can filter by any employee or department
- **Regular Employee**: Employee/Department dropdowns remain hidden; reports auto-filter to their own data
