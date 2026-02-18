
# Fix: "Access Denied" for Supervisor on Tracking Page

## Diagnosis

After thorough investigation, there are **two separate issues** causing this problem:

### Issue 1: Missing "read own role" RLS policy on `user_roles`

The current SELECT policies on `user_roles` require a complex join through the `profiles` table to verify company membership. This works in theory, but creates an unnecessary dependency on `profiles` RLS being evaluated correctly. There is **no simple policy** that lets a user read their own role row directly (`auth.uid() = user_id`).

A simpler, more reliable policy is needed: **"Users can always read their own role."**

### Issue 2: `isFetching` causes spurious loading states on every window focus

The current fix (`isLoading || isFetching`) is too aggressive. React Query's `isFetching` becomes `true` during every background refetch (including window focus events). This means:
- User is on the Tracking page viewing data
- They click away and come back
- `isFetching = true` → spinner briefly shows → Access Denied briefly appears

The correct approach is to only block rendering if there is **no data yet** — i.e., combine `isLoading` (first fetch) with `isFetching && !roles` (fetching and no data cached yet).

## Fix Plan

### Change 1: Add a direct RLS policy to `user_roles` (database migration)

Add a simple `SELECT` policy:
```sql
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
```

This guarantees that regardless of any company/profile join logic, a user can always read their own role rows directly. This is the most reliable fix.

### Change 2: Fix `useUserRole` loading state logic

Update `src/hooks/useUserRole.ts` to only report loading when there is no data cached yet:

```typescript
const { data: roles, isLoading, isFetching } = useQuery({ ... });

return {
  // ...
  // isLoading: first fetch with no data
  // isFetching && !roles: re-enabled query (e.g., user.id just became available) with no cached data
  isLoading: isLoading || (isFetching && !roles),
};
```

This prevents the loading state from firing on every background refetch while still covering the initial load race condition.

## Files Changed

| Type | Target | Change |
|------|--------|--------|
| Database migration | `user_roles` table | Add `SELECT` policy: `auth.uid() = user_id` |
| Code | `src/hooks/useUserRole.ts` | Use `isLoading \|\| (isFetching && !roles)` |
