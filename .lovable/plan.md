
# Fix: Supervisor "Phillip Chino" Sees "Access Denied" on Tracking Page

## Root Cause

The `useUserRole` hook queries the `user_roles` table with `.eq("user_id", user.id)`. While Phillip's role record exists with the correct `user_id`, the `AdminTimeTracking` page shows "Access Denied" when all role flags evaluate to `false`.

The specific problem is a **race condition / loading state bug**: The `AdminTimeTracking` page checks `roleLoading` first (line 323), but `roleLoading` refers only to the React Query `isLoading` state. React Query sets `isLoading = false` after the very first fetch attempt — but if `user.id` is not yet available when the hook first runs, the query returns `[]` immediately (line 12: `if (!user?.id) return []`), setting `isLoading = false` with empty roles. Then when `user.id` does arrive, a second fetch fires — but `isLoading` stays `false` (it only shows `true` on the first load with no cached data). This means the page briefly (or permanently if the second fetch is slow) shows "Access Denied" even for valid supervisors.

The secondary check is that `isLoading` from React Query only covers the **initial** load. Subsequent refetches use `isFetching`, not `isLoading`.

## Fix

Two changes are needed:

### 1. `src/hooks/useUserRole.ts` — Use `isFetching` for a more reliable loading state

Change the returned `isLoading` to be `isLoading || isFetching` so that any in-progress fetch (including when `user.id` becomes available) is treated as loading:

```typescript
const { data: roles, isLoading, isFetching } = useQuery({ ... });

return {
  // ...
  isLoading: isLoading || isFetching,
};
```

### 2. `src/pages/AdminTimeTracking.tsx` — Guard access check with the `roleLoading` flag

The access denied block (line 336) already sits after the `roleLoading` spinner check (line 323). However, because `isLoading` can be `false` while data is still being fetched (on re-fetch), the spinner exits too early.

With fix #1 applied, `roleLoading` will correctly stay `true` until Phillip's supervisor role is fully loaded — so the "Access Denied" block will never trigger for him.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useUserRole.ts` | Return `isLoading \|\| isFetching` instead of just `isLoading` |

That single change ensures the loading guard covers all fetch states, preventing the premature "Access Denied" render before roles are confirmed.
