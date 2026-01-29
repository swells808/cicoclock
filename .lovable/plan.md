
# Fix Test Email to Send Full Report with Attachments

## Problem

When you click "Test" on a scheduled report, it sends a simple placeholder email that just says "Test Report - This is a test email..." instead of the full formatted report with actual data, PDF, and CSV attachments.

The `send-test-report` edge function is completely separate from `process-scheduled-reports` and uses a hardcoded placeholder HTML instead of the actual report generation logic.

---

## Solution

Rewrite `send-test-report` to use the same report generation logic as `process-scheduled-reports`:

1. **Import pdf-lib** for PDF generation
2. **Copy all helper functions** from process-scheduled-reports:
   - CSV generators: `generateEmployeeTimecardCSV`, `generateProjectTimecardCSV`, `generateWeeklyPayrollCSV`
   - PDF generators: `generateEmployeeTimecardPDF`, `generateProjectTimecardPDF`, `generateWeeklyPayrollPDF`
   - HTML generators: `generateEmployeeTimecardHtml`, `generateProjectTimecardHtml`, `generateWeeklyPayrollHtml`
   - Utility functions: `formatDuration`, `formatTime`, `formatDate`, `getEmployeeName`, etc.
3. **Fetch actual time entry data** for the report's company and date range
4. **Generate full HTML, CSV, and PDF** based on report type
5. **Send email with attachments** just like the automated reports

---

## Changes to `supabase/functions/send-test-report/index.ts`

### Current (simplified placeholder)
```typescript
const reportHtml = `
  <h1>Test Report</h1>
  <p>This is a test email for your scheduled ${report.report_type} report.</p>
  ...
`;
```

### After (full report generation)
The function will:
1. Get the report configuration and company details
2. Calculate date range based on frequency (same as scheduled reports)
3. Query time entries for that date range
4. Generate HTML, CSV, and PDF using the same functions
5. Send email with all attachments

---

## Technical Details

The test email will use the **same date range logic** as automated reports:
- **Daily reports**: Show previous day's data
- **Weekly reports**: Show previous week's data (Sunday-Saturday)
- **Monthly reports**: Show previous month's data

This ensures the test email shows realistic data that matches what will be sent when the report runs automatically.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Complete rewrite to include all report generation logic, data fetching, and attachment generation |

---

## Expected Result

After implementation, clicking "Test" on a scheduled report will:
1. Send a **full formatted HTML email** with the report data table
2. Attach a **CSV file** with all the time entry data
3. Attach a **PDF file** with the formatted report
4. Show the same styling and layout as the automated reports
5. Include a "[TEST]" prefix in the subject line to distinguish it from real reports

The test email will be identical to the automated report email, just with "[TEST]" in the subject.
