

# Fix CSV Column Shift + Restructure Daily Timecard Report

## Bug Fix: CSV Column Data Shifted

The Time Entry Details CSV export has an unquoted date field containing a comma (e.g., "Feb 13, 2026"). This causes the comma to be treated as a column separator, shifting all subsequent data one column to the right. Every value after the date lands in the wrong column.

**Fix**: Quote all unquoted fields in the CSV row (`date`, `clockIn`, `clockOut`, `duration`) in `exportTimeEntryDetailsAsCSV` inside `src/pages/Reports.tsx` (lines 211-249).

## Restructure: Daily Timecard Report

The Daily Timecard report currently shows a simple aggregated summary (Employee, Regular Hours, Overtime Hours, Total Hours). The user wants it restructured to match the shift summary timecard format employees fill out at clock-out, with per-project task category breakdowns.

### New Daily Timecard Format

Columns for both UI table and CSV export:

| First Name | Last Name | Employee ID | Date | Project | Cost Code | Mat. Handling | Process/Cut | Fitup/Weld | Finishes | Other | Hours Type | Hours |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

This mirrors the Employee Hours report structure but adds the five task category columns from the timecard allocations table.

### Data Source

- Pull from `timecard_allocations` table (material_handling, processing_cutting, fabrication_fitup_weld, finishes, other) joined to `time_entries` and `profiles`
- Fall back to total entry duration when no allocations exist (legacy entries)
- Fetch `task_activities` for cost codes (same pattern as the Employee Hours report)
- Calculate regular vs overtime using the schedule hierarchy (employee schedule > department schedule > company threshold)

### Files Modified

**`src/pages/Reports.tsx`**:
1. Fix unquoted `date` field in `exportTimeEntryDetailsAsCSV` (line 216) -- add quotes around date, clockIn, clockOut, duration values
2. Rewrite `exportDailyTimecardAsCSV` with new columns matching the timecard format
3. Rewrite `exportDailyTimecardAsPDF` with matching columns
4. Rewrite `buildDailyTimecardHTML` popup table with new columns
5. Update the Daily Timecard data fetch (lines 916-982) to also query `timecard_allocations` task category values, `task_activities` for cost codes, employee/department schedules for overtime calculation, and `company_features` for overtime threshold

**`src/components/reports/DailyTimecardReport.tsx`**:
6. Update the inline report UI table to show per-entry rows with project, task categories, cost code, regular/overtime hours (matching the new CSV format)

### Technical Details

- The overtime calculation will follow the same pattern already implemented in the Employee Hours report (lines 1166-1400 of Reports.tsx): group by employee + date, compare against scheduled minutes from employee/department schedules, split into Regular and Overtime rows
- Task category values come from `timecard_allocations` columns: `material_handling`, `processing_cutting`, `fabrication_fitup_weld`, `finishes`, `other`
- Cost codes come from `task_activities.task_types.code` (same join pattern as Employee Hours report)
- For entries without timecard allocations (legacy), the total duration is placed in the Hours column with empty task category fields

