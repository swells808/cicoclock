
# Restrict Report Filters Based on User Role

## Problem
Currently, any authenticated user can generate reports for any employee or department. Employees should only be able to run reports for themselves, while Admins and Supervisors should have full access to all employees and departments.

## Solution Overview
Modify the `ReportFilters` component to check the user's role and restrict the available options accordingly:

- **Admin/Supervisor**: Full access to all filters (employee, department dropdowns visible)
- **Employee only**: Filters are hidden, report is automatically scoped to their own profile

---

## Technical Changes

### File: `src/components/reports/ReportFilters.tsx`

**Change 1: Import role and profile hooks** (lines 1-12)

Add imports for `useUserRole` and `useProfile`:
```typescript
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
```

**Change 2: Get current user role and profile** (inside component, after line 39)

```typescript
const { isAdmin, isSupervisor, isLoading: rolesLoading } = useUserRole();
const { data: currentUserProfile, isLoading: profileLoading } = useProfile();

// Determine if user can view all employees or just themselves
const canViewAllEmployees = isAdmin || isSupervisor;
```

**Change 3: Auto-set employee filter for regular employees** (update useEffect, lines 51-76)

For employees without admin/supervisor roles:
- Skip fetching all employees list
- Auto-set the employee filter to their own profile ID

```typescript
useEffect(() => {
  const fetchData = async () => {
    if (!company?.id) return;

    // Only fetch all employees if user has permission
    if (canViewAllEmployees) {
      const [employeesRes, departmentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .order('first_name'),
        supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('name')
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (departmentsRes.data) setDepartments(departmentsRes.data);
    }
  };

  fetchData();
}, [company?.id, canViewAllEmployees]);

// Auto-set employee filter for regular employees
useEffect(() => {
  if (!canViewAllEmployees && currentUserProfile?.id) {
    setSelectedEmployeeId(currentUserProfile.id);
  }
}, [canViewAllEmployees, currentUserProfile?.id]);
```

**Change 4: Conditionally render filters** (lines 171-207)

Only show Employee and Department dropdowns if user has permission:

```typescript
{showDepartmentFilter && canViewAllEmployees && (
  <div className="space-y-2">
    <Label>Department</Label>
    {/* existing department select */}
  </div>
)}

{showEmployeeFilter && canViewAllEmployees && (
  <div className="space-y-2">
    <Label>Employee</Label>
    {/* existing employee select */}
  </div>
)}
```

**Change 5: Update handleApply to enforce restriction** (lines 78-86)

```typescript
const handleApply = () => {
  onApply({
    reportType,
    startDate,
    endDate,
    // For non-privileged users, always use their own profile ID
    employeeId: canViewAllEmployees 
      ? (selectedEmployeeId === 'all' ? undefined : selectedEmployeeId)
      : currentUserProfile?.id,
    departmentId: canViewAllEmployees
      ? (selectedDepartmentId === 'all' ? undefined : selectedDepartmentId)
      : undefined,
  });
};
```

**Change 6: Show loading state while checking roles** (before return statement)

```typescript
if (rolesLoading || profileLoading) {
  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">Loading filters...</span>
      </div>
    </div>
  );
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/reports/ReportFilters.tsx` | Add role checks; hide employee/department filters for regular employees; auto-scope reports to their own profile |

## Expected Behavior

| Role | Employee Filter | Department Filter | Report Scope |
|------|-----------------|-------------------|--------------|
| Admin | Visible (All + list) | Visible (All + list) | Any employee/department |
| Supervisor | Visible (All + list) | Visible (All + list) | Any employee/department |
| Employee | Hidden | Hidden | Own data only |
| Foreman | Hidden | Hidden | Own data only |

## Security Note
This is a UI-level restriction. The underlying database queries via Supabase RLS already restrict data visibility based on company membership, so a malicious employee cannot access data from other companies. However, this change ensures regular employees have a clear, role-appropriate experience when using the reports feature.
