

# Fix Role Saving and Enable Login in UserDialog

## Root Cause Analysis

### Issue 1: Role Changes Not Saving

The role update logic in `UserDialog.tsx` (lines 151-172) has a bug:

```typescript
const roleKey = user.user_id || user.id;  // For null user_id, uses profile.id
const { data: existingRole } = await supabase
  .from('user_roles')
  .select('id')
  .or(`user_id.eq.${roleKey},profile_id.eq.${user.id}`)  // This query syntax can fail
  .maybeSingle();
```

**Problem**: The `.or()` query with string interpolation doesn't handle cases properly. It should query by `profile_id` first (which always exists), not by `user_id`.

### Issue 2: Enable Login Creates Duplicate Profile

The `create-auth-account` edge function creates an auth user, which triggers `handle_new_user()` database trigger. This trigger automatically creates a **new profile** for the auth user. Then the edge function tries to update the **original profile** with the new `user_id`, but fails because another profile already has that `user_id`.

**Evidence from logs**:
```
Error updating profile: duplicate key value violates unique constraint "profiles_user_id_key"
```

**Current database state for employee 1143**:
- Original profile: `85ed33ab-5536-4ed1-9522-96ae6016bde4` - has `user_id: NULL`
- Duplicate profile: `931c56f8-6e04-4a19-82cf-9e3c47dffccc` - has `user_id: b6a79525-...`
- Role record: points to correct profile_id but has the auth user_id

## Solution

### Fix 1: UserDialog Role Update Logic

Change role lookup to use `profile_id` only (which always exists):

```typescript
// Look up existing role by profile_id (always present)
const { data: existingRole } = await supabase
  .from('user_roles')
  .select('id')
  .eq('profile_id', user.id)
  .maybeSingle();

if (existingRole) {
  const { error: roleError } = await supabase
    .from('user_roles')
    .update({ role: formData.role })
    .eq('id', existingRole.id);
  if (roleError) throw roleError;
} else {
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.user_id || null,  // NULL is fine now
      profile_id: user.id,
      role: formData.role
    });
  if (roleError) throw roleError;
}
```

### Fix 2: Edge Function - Handle Duplicate Profiles

Update `create-auth-account` to:
1. Delete any auto-created profile from the trigger
2. Then update the original profile with the new `user_id`

```typescript
// After creating auth user, delete the auto-generated profile from trigger
const { error: deleteAutoProfile } = await supabase
  .from('profiles')
  .delete()
  .eq('user_id', authData.user?.id)
  .neq('id', profile_id);  // Don't delete the original profile

// Now safely update the original profile
const { error: updateError } = await supabase
  .from('profiles')
  .update({ 
    user_id: authData.user?.id,
    email 
  })
  .eq('id', profile_id);
```

### Fix 3: Update Existing User Roles Query

Also fix the edge function to check for existing roles before inserting (to avoid duplicates):

```typescript
if (role && authData.user) {
  // Check if role already exists for this profile
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('profile_id', profile_id)
    .maybeSingle();
    
  if (existingRole) {
    await supabase
      .from('user_roles')
      .update({ user_id: authData.user.id, role })
      .eq('id', existingRole.id);
  } else {
    await supabase
      .from('user_roles')
      .insert({ user_id: authData.user.id, profile_id, role });
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/users/UserDialog.tsx` | Fix role lookup to use `profile_id` only |
| `supabase/functions/create-auth-account/index.ts` | Handle duplicate profiles and existing roles |

## Database Cleanup Required

After the fix is deployed, clean up the duplicate profile:

```sql
-- Delete the auto-created duplicate profile
DELETE FROM profiles WHERE id = '931c56f8-6e04-4a19-82cf-9e3c47dffccc';

-- Update the original profile with the user_id
UPDATE profiles 
SET user_id = 'b6a79525-f048-46a8-b11a-e36a753a9d9b' 
WHERE id = '85ed33ab-5536-4ed1-9522-96ae6016bde4';
```

## Validation

After implementation:
1. Open employee 1143, change role, save - role should persist on re-open
2. For a different timeclock-only employee, click "Enable Login Access", create account - on re-open it should show "Account Information" instead of the warning

