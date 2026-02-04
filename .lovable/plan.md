
# Plan: Add Regular & Overtime Hours to Daily Timecard Report

## Overview
Enhance the Daily Timecard report to display **regular hours**, **overtime hours**, and **total hours** for each employee, aggregated by employee for the selected date.

## Current Behavior
- Displays individual time entries as separate rows
- Shows: Employee, Project, Clock In, Clock Out, Duration
- No distinction between regular and overtime hours

## New Behavior
- Aggregates all time entries per employee for the selected date
- Shows three distinct hour columns:
  - **Regular Hours**: Time worked within the employee's scheduled hours
  - **Overtime Hours**: Time worked beyond the employee's scheduled hours
  - **Total Hours**: Sum of regular + overtime
- Uses employee's schedule (or department schedule, or default 8-hour workday) to determine the threshold

## Overtime Calculation Logic

```text
For each employee on the selected date:

1. Get the employee's schedule for that day of week
   - Check employee_schedules table first
   - Fall back to department_schedules if no custom schedule
   - Fall back to default (8 hours/day) if no department schedule

2. Calculate scheduled hours for the day
   - If start_time and end_time exist: (end_time - start_time)
   - Default: 8 hours (480 minutes)

3. Sum all time entries for the employee that day

4. Regular Hours = min(total_worked, scheduled_hours)
5. Overtime Hours = max(0, total_worked - scheduled_hours)
```

## UI Changes

### Before (Individual Entries)
| Employee | Project | Clock In | Clock Out | Duration |
|----------|---------|----------|-----------|----------|
| John Doe | Site A  | 8:00 AM  | 12:00 PM  | 4h 0m    |
| John Doe | Site A  | 1:00 PM  | 6:00 PM   | 5h 0m    |
| Jane Doe | Site B  | 9:00 AM  | 5:00 PM   | 8h 0m    |

### After (Aggregated with Hours Breakdown)
| Employee | Regular Hours | Overtime Hours | Total Hours |
|----------|---------------|----------------|-------------|
| John Doe | 8h 0m         | 1h 0m          | 9h 0m       |
| Jane Doe | 8h 0m         | 0h 0m          | 8h 0m       |

## Technical Implementation

### Step 1: Fetch Schedules for Affected Employees
Query `employee_schedules` and `department_schedules` tables to determine each employee's scheduled hours for the selected day of week.

### Step 2: Aggregate Time Entries by Employee
Group all time entries by employee (using `profile_id` or `user_id`), summing their `duration_minutes`.

### Step 3: Calculate Regular vs Overtime
For each employee:
- Look up their scheduled hours for the day
- Apply the calculation logic above

### Step 4: Update Table Display
Replace the individual entry view with an aggregated employee summary showing the three hour columns.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reports/DailyTimecardReport.tsx` | Add schedule fetching, aggregate entries by employee, calculate regular/overtime hours, update table structure |

## Edge Cases Handled
- **No schedule defined**: Falls back to 8-hour workday
- **Day off in schedule**: All hours count as overtime
- **Active/incomplete entries**: Calculate duration from start_time to now
- **Multiple entries per employee**: Sum all durations before splitting regular/overtime

## Data Flow

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  time_entries   │────▶│ Group by employee    │────▶│ Per-employee    │
│  (for the day)  │     │ Sum duration_minutes │     │ total minutes   │
└─────────────────┘     └──────────────────────┘     └────────┬────────┘
                                                              │
┌─────────────────┐     ┌──────────────────────┐              │
│employee_schedules│───▶│ Scheduled hours for  │◀─────────────┘
│dept_schedules   │     │ day of week          │
└─────────────────┘     └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │ Calculate:           │
                        │ • Regular = min(     │
                        │     total, scheduled)│
                        │ • Overtime = max(0,  │
                        │     total - scheduled)│
                        └──────────────────────┘
```
