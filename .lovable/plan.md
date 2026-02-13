

# Daily Timecard Report - Three Refinements

## 1. Cost Code Column - Show Task Type Number

Currently the "Cost Code" column is empty because it relies on `task_activities` which may not always have entries. The cost codes map directly to the five task categories:

- Material Handling = 8010
- Processing Cutting = 8020
- Fabrication Fitup Welding = 8030
- Finishes = 8040
- Other = 8050

For rows built from `timecard_allocations`, the cost code should be determined by whichever category has hours allocated (or the primary one). For rows without allocations, it stays empty or uses the task_activities fallback.

The fix will also fetch `task_types` for the company so codes are pulled from the database (not hardcoded), mapping each allocation category to its corresponding task type code.

## 2. Hours Format - Show as Hours and Minutes (e.g., 1h21m)

Currently hours display as a decimal (e.g., 1.4). All three outputs (CSV, PDF, HTML popup) and the inline UI component will be updated to format hours as `Xh Ym` instead.

A helper function `formatHoursMinutes(decimalHours)` will convert, e.g., 1.35 hours to "1h21m".

## 3. Add "Injured" Column

The `time_entries` table already has an `injury_reported` boolean column. This will be passed through to each row and displayed as "Y" or "N".

The data fetch already queries `time_entries` -- we just need to include `injury_reported` in the select and carry it into each row.

## Files Modified

**`src/pages/Reports.tsx`**:
- Add `injury_reported` to the time entries query select (line 936)
- Fetch `task_types` for the company to build a category-to-code map
- Update the `DailyRow` interface to include `injured: string`
- Update `makeRow` to accept and pass through the injured value
- Update all four output functions to include the new column and hours format:
  - `exportDailyTimecardAsCSV` (line 174)
  - `exportDailyTimecardAsPDF` (line 250)
  - `buildDailyTimecardHTML` (line 431)
  - Row-building logic (line 1078)

**`src/components/reports/DailyTimecardReport.tsx`**:
- Add `injured` field to `TimecardRow` interface
- Include `injury_reported` in the time entries query
- Pass injury value through to rows
- Add "Injured" column to the table
- Format hours as `Xh Ym` in the table cells

## Technical Details

- Cost code derivation: For each allocation row, determine the dominant category (the one with the most hours) and look up its code from the `task_types` table. If multiple categories have equal hours, use the first non-zero one.
- Hours formatting: `Math.floor(hours)` for the hour part, `Math.round((hours % 1) * 60)` for the minutes part, displayed as `{h}h{m}m`.
- Injured: Read `entry.injury_reported` (boolean or null), map to "Y" if true, "N" otherwise.
