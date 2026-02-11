

## Fix Scheduled Reports Timezone Matching

**The Problem:** The `process-scheduled-reports` edge function compares the current UTC hour against `schedule_time`, which is stored in the user's local time. A report scheduled for 12:05 AM Pacific fires at 12:00 AM UTC (which is 4:00 PM or 5:00 PM Pacific, depending on DST).

**The Fix:** Remove the UTC-based time window filter from the database query. Instead, fetch all active reports and filter them in code by converting the current time to each company's timezone before comparing.

### Technical Details

**File:** `supabase/functions/process-scheduled-reports/index.ts`

**Changes at lines ~1400-1441:**

1. Remove the UTC hour-based `gte`/`lte` filter on `schedule_time` from the database query. Instead, fetch all active reports joined with their company timezone.

2. For each report, determine the current time **in the company's timezone** and check:
   - Does the current local hour match the report's `schedule_time` hour?
   - Does the current local day-of-week / day-of-month match for weekly/monthly reports?

The revised logic:

```text
1. Query: SELECT all active scheduled_reports joined with companies(timezone)
2. For each report:
   a. Get company timezone (e.g., "America/Los_Angeles")
   b. Convert "now" to that timezone to get local hour, day-of-week, day-of-month
   c. Parse the report's schedule_time (e.g., "00:05") to get the scheduled hour
   d. If current local hour != scheduled hour, skip
   e. If weekly and current local day-of-week != schedule_day_of_week, skip
   f. If monthly and current local day-of-month != schedule_day_of_month, skip
   g. Otherwise, process and send the report
```

This ensures a report scheduled for 12:05 AM Pacific only fires when it is actually midnight in Pacific time, regardless of the server's UTC clock.

No database changes are needed.

