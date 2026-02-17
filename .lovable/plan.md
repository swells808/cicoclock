

# Fix: Employee Time Entries Not Showing for Timeclock-Only Users

## Problem
The Employee Detail page's "Attendance" tab (and related views) shows "No time entries found" because the `useEmployeeTimeEntries` hook only queries `time_entries` by `user_id`. However, employees who clock in via the kiosk (PIN/badge) have their time entries stored with only `profile_id` set and `user_id` as null. This means all kiosk-based clock events are invisible on the employee detail page.

## Root Cause
In `src/hooks/useEmployeeTimeEntries.ts`:
1. Line 64: If the profile has no `user_id`, it returns empty results immediately -- this breaks for timeclock-only users entirely.
2. Line 74: The query filters `.eq("user_id", profile.user_id)` which misses all entries that only have `profile_id`.

## Solution
Update the hook to query time entries using **both** `user_id` and `profile_id`, matching the pattern already used on the Admin Time Tracking page.

### Changes to `src/hooks/useEmployeeTimeEntries.ts`

1. **Remove the early return** when `user_id` is null (line 64-66). Instead, proceed with the query using whichever identifiers are available.

2. **Update the query filter** (line 74) to use an `.or()` filter that matches entries by either `profile_id` or `user_id`:
   - If the profile has a `user_id`: filter by `profile_id.eq.{profileId},user_id.eq.{userId}`
   - If no `user_id`: filter by `profile_id.eq.{profileId}` only

3. **Simplify the profile lookup** -- since we already receive the `profileId` as a parameter, we can query directly by `profile_id` without needing to first look up the `user_id`.

### Technical Detail

Replace the current flow:
```
lookup profile -> get user_id -> query by user_id
```

With:
```
query by profile_id OR user_id (if available)
```

The updated query will look like:
```typescript
let query = supabase
  .from("time_entries")
  .select(`*, projects(name)`)
  .eq("company_id", company.id)
  .gte("start_time", startOfDay(startDate).toISOString())
  .lte("start_time", endOfDay(endDate).toISOString())
  .order("start_time", { ascending: true });

if (profile?.user_id) {
  query = query.or(`profile_id.eq.${profileId},user_id.eq.${profile.user_id}`);
} else {
  query = query.eq("profile_id", profileId);
}
```

This is a single-file change with no database modifications required.

