

# Fix Dashboard: "No Project" and Empty Task Activities

## Problem 1: "No Project" on All Entries

All today's time entries have `project_id = NULL` in the `time_entries` table. The actual project assignments are stored in the `timecard_allocations` table (the modern approach used by the timeclock). The Dashboard only checks `time_entries.project_id`, so everything shows "No Project."

**Fix**: After fetching time entries, also fetch `timecard_allocations` for those entries and merge the project names in. If a time entry has no `project_id` but has an allocation with a project, use that project name instead.

### Changes in `src/pages/Dashboard.tsx`:
- After `timeEntries` loads, query `timecard_allocations` joined with `projects` for today's entry IDs
- Build a map of `time_entry_id` to project name
- Use that map as a fallback when displaying project names in both "Today's Activity" and "Timesheet History"

### Changes in `src/hooks/useTimeEntries.ts`:
- Enhance the query to also fetch `timecard_allocations` project data, or add a secondary query
- Alternatively, handle this at the Dashboard level to avoid changing the shared hook

## Problem 2: Task Activities Not Being Recorded

Two bugs prevent task activities from being saved:

1. **Key name mismatch**: The Dashboard sends camelCase keys (`userId`, `profileId`, `taskId`, etc.) but the edge function `record-task-activity` expects snake_case keys (`user_id`, `profile_id`, `task_id`, etc.). Every call silently fails with a 400 "All fields are required" error.

2. **Null project_id rejected**: The edge function requires `project_id` to be non-null, but the Dashboard passes `null` when no project is selected. This causes a validation failure even if the keys matched.

3. **Timeclock doesn't record task activities**: The main Timeclock page (where most employees clock in via PIN) never calls `record-task-activity`, so no task activities are created for those shifts.

**Fix**:

### Changes in `src/pages/Dashboard.tsx`:
- Fix the key names from camelCase to snake_case in both `record-task-activity` calls (lines 156-167 and 175-186):
  - `userId` to `user_id`
  - `profileId` to `profile_id`
  - `taskId` to `task_id`
  - `taskTypeId` to `task_type_id`
  - `actionType` to `action_type`
  - `timeEntryId` to `time_entry_id`
  - `projectId` to `project_id`
  - `companyId` to `company_id`

### Changes in `supabase/functions/record-task-activity/index.ts`:
- Make `project_id` optional (allow null) since employees may clock in without selecting a project
- Update the validation to only require the truly mandatory fields

### Changes in `src/pages/Timeclock.tsx` (optional/future):
- Consider adding task activity recording to the timeclock flow so PIN-clocked entries also generate task activities

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Fix camelCase to snake_case in edge function calls; add `timecard_allocations` lookup for project names |
| `supabase/functions/record-task-activity/index.ts` | Make `project_id` optional |
| `src/components/dashboard/RecentTaskActivity.tsx` | No changes needed (it reads correctly) |

