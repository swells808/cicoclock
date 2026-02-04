
# Plan: Add Managers to Auto Clock-Out Email Alerts

## Overview
Modify the `auto-close-overtime-shifts` edge function to include managers in the email notification chain. Managers will only receive alerts for employees in their assigned department, while admins continue to receive all alerts company-wide.

## Current Behavior
- When an employee's shift exceeds 12 hours without clocking out, it's automatically closed at 11:59:59 PM
- Email alerts are sent to all users with the `admin` role in the company
- Managers are not notified

## New Behavior
- Admins receive alerts for **all** auto-closed entries (unchanged)
- Managers receive alerts **only for employees in their department**
- If a manager is also in the same department as an affected employee, they get notified
- Duplicate emails are prevented (if someone is both admin and manager)

## Data Model

```text
+------------------+       +------------------+       +------------------+
|   user_roles     |       |    profiles      |       |   departments    |
+------------------+       +------------------+       +------------------+
| user_id (FK)     |<----->| user_id          |       | id               |
| role (enum)      |       | department_id ---|------>| name             |
| profile_id (FK)  |       | company_id       |       | company_id       |
+------------------+       | email            |       +------------------+
                           +------------------+
```

## Implementation Steps

### Step 1: Enhance Time Entries Query
Modify the `overtimeEntries` query to include the employee's `department_id` from the profile.

**File:** `supabase/functions/auto-close-overtime-shifts/index.ts`

```typescript
profiles!time_entries_profile_id_fkey(
  id,
  first_name,
  last_name,
  display_name,
  employee_id,
  department_id  // Add this field
),
```

### Step 2: Extract Affected Department IDs
After grouping entries by company, collect unique department IDs from affected employees.

```typescript
const affectedDepartmentIds = [...new Set(
  entries
    .map(entry => (entry.profiles as any)?.department_id)
    .filter(Boolean)
)];
```

### Step 3: Fetch Manager Emails by Department
Query profiles that:
1. Are in the same company
2. Are in one of the affected departments
3. Have the `manager` role

```typescript
// Only fetch if there are affected departments
if (affectedDepartmentIds.length > 0) {
  // Get profiles in affected departments
  const { data: deptProfiles } = await supabase
    .from('profiles')
    .select('id, email, user_id, department_id')
    .eq('company_id', companyId)
    .in('department_id', affectedDepartmentIds)
    .not('email', 'is', null);

  // Filter to those with manager role
  for (const profile of deptProfiles || []) {
    if (profile.user_id) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .eq('role', 'manager')
        .maybeSingle();

      if (roleData && profile.email) {
        managerEmails.push(profile.email);
      }
    }
  }
}
```

### Step 4: Combine Recipients and Deduplicate
Merge admin and manager email lists, removing duplicates.

```typescript
const allRecipientEmails = [...new Set([...adminEmails, ...managerEmails])];
```

### Step 5: Update Email Sending Logic
Use the combined recipient list instead of just admin emails.

### Step 6: Add Department Column to Email (Enhancement)
Optionally add a "Department" column to the email table so managers can quickly identify their employees.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/auto-close-overtime-shifts/index.ts` | Add manager email fetching logic, include department_id in query |

## Testing Considerations
- Test with an employee who has no department assigned (should still work, just no manager notified)
- Test with a manager who is also an admin (should only receive one email)
- Test with multiple departments affected (each manager should be notified)
- Verify admins still receive all notifications regardless of department

## Technical Notes
- The `manager` role is part of the `app_role` enum (confirmed in `src/lib/constants.ts`)
- Manager-department association is via `profiles.department_id` - the manager must be assigned to the same department as the employee they manage
- No database schema changes required - all necessary fields already exist
