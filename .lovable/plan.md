

# Fix Role Saving and Improve "Enable Login" Discoverability

## Issues Identified

### Issue 1: Role Cannot Be Saved for Timeclock-Only Users

**Root Cause**: The `user_roles` table has a `user_id NOT NULL` constraint with a foreign key to `auth.users(id)`. This means:
- Roles can ONLY be saved for employees who have an auth account
- Timeclock-only employees (created via CSV import or without login) cannot have roles assigned

**Current Code Problem** (lines 156-181 in EmployeeEditDialog.tsx):
```typescript
if (role !== employee.role) {
  const userId = employee.user_id;  // NULL for timeclock-only users!
  if (userId) {
    // Only runs if user has auth account - skipped for timeclock-only!
  }
}
```

### Issue 2: "Enable Login" Button Location

The "Enable Login Access" button exists in the code but is located in the **Access tab** of the edit dialog. Users may not realize they need to:
1. Click the "..." menu in the employee header
2. Select "Edit Employee"  
3. Navigate to the "Access" tab

## Solution

### Database Change Required

Modify the `user_roles` table to allow `user_id` to be nullable when `profile_id` is provided:

```sql
ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;
```

This allows roles to be stored for timeclock-only users using just their `profile_id`.

### Code Changes

**File: `src/components/employee/EmployeeEditDialog.tsx`**

Fix the role saving logic to use `profile_id` as the primary lookup:

```typescript
// Updated role saving logic
if (role !== employee.role) {
  // Look up existing role by profile_id (always present)
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("profile_id", employee.id)
    .maybeSingle();

  if (existingRole) {
    // Update existing role
    await supabase
      .from("user_roles")
      .update({ role: role as "admin" | "supervisor" | "employee" | "foreman" })
      .eq("id", existingRole.id);
  } else {
    // Insert new role - user_id can now be null
    await supabase
      .from("user_roles")
      .insert({
        user_id: employee.user_id || null,  // NULL for timeclock-only
        profile_id: employee.id,
        role: role as "admin" | "supervisor" | "employee" | "foreman",
      });
  }
}
```

**File: `src/hooks/useEmployeeDetail.ts`**

Update the role fetch query to prioritize `profile_id` lookup:

```typescript
// Fetch user role - prioritize profile_id for timeclock-only users
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("profile_id", profile.id)
  .maybeSingle();
```

**File: `src/hooks/useUsers.ts`**

Update the roles lookup to include profile-only roles:

```typescript
// Create user roles lookup - prioritize profile_id for CSV users
const rolesLookup = (userRoles || []).reduce((acc: Record<string, string>, r: any) => {
  if (r.profile_id) acc[r.profile_id] = r.role;  // Profile-based (for timeclock-only)
  if (r.user_id) acc[r.user_id] = r.role;        // User-based (for auth users)
  return acc;
}, {});
```

### UI Improvement: Add Prominent "Edit" Buttons

Add direct edit buttons to the read-only info cards that open the dialog to the relevant tab.

**File: `src/components/employee/tabs/PersonalInfoTab.tsx`**

Add edit button to each card header:

```typescript
interface PersonalInfoTabProps {
  employee: EmployeeProfile;
  onEdit?: (tab: string) => void;  // New prop
}

// In card headers:
<div className="flex justify-between items-center">
  <h3>Personal Information</h3>
  {onEdit && (
    <Button variant="ghost" size="sm" onClick={() => onEdit("personal")}>
      <Edit className="h-4 w-4 mr-1" /> Edit
    </Button>
  )}
</div>
```

**File: `src/components/employee/EmployeeEditDialog.tsx`**

Add support for opening to a specific tab:

```typescript
interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeProfile;
  onSave: () => void;
  initialTab?: string;  // New prop
}

// In useEffect:
setActiveTab(initialTab || "personal");
```

**File: `src/components/employee/EmployeeTabs.tsx`**

Pass the edit handler through to child tabs.

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Make `user_id` nullable in `user_roles` table |
| `src/components/employee/EmployeeEditDialog.tsx` | Fix role save logic, add `initialTab` prop |
| `src/hooks/useEmployeeDetail.ts` | Fix role fetch to use `profile_id` |
| `src/hooks/useUsers.ts` | Fix roles lookup to prioritize `profile_id` |
| `src/pages/EmployeeDetail.tsx` | Add `initialTab` state for edit dialog |
| `src/components/employee/EmployeeTabs.tsx` | Pass `onEdit` callback to child tabs |
| `src/components/employee/tabs/PersonalInfoTab.tsx` | Add Edit buttons to cards |
| `src/components/employee/tabs/WorkDetailsTab.tsx` | Add Edit button to Access card (where "Enable Login" is) |

## Expected Outcome

After these changes:

1. **Role changes will save** for all employees, including timeclock-only users
2. **Clear "Edit" buttons** will appear on each information card
3. **Easy access to "Enable Login"**: Clicking Edit on the Access & Security section opens directly to the Access tab where the "Enable Login Access" button is located
4. Users won't need to hunt through menus to find editing options

