
# Add PDF and CSV Attachments to Automated Email Reports

## Overview

The automated reports system (`process-scheduled-reports` edge function) currently sends only HTML emails. This enhancement will add both PDF and CSV file attachments to the emails, giving recipients downloadable files along with the inline HTML preview.

## Technical Approach

### Resend Attachment Format
The Resend API supports attachments with this structure:
```typescript
attachments: [
  { filename: 'report.csv', content: Buffer or base64 string },
  { filename: 'report.pdf', content: Buffer or base64 string }
]
```

### PDF Generation in Deno
Since this is a Deno edge function (no DOM/browser APIs), we cannot use `jsPDF` with `html2canvas` like the frontend. Instead, we'll use **`pdf-lib`** which works in Deno and creates PDFs programmatically:
```typescript
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@^1.11.1?dts';
```

The PDF will be a clean tabular report matching the HTML structure with:
- Report header with title, company name, date range
- Table with headers and data rows
- Footer with generation timestamp

---

## Changes to `supabase/functions/process-scheduled-reports/index.ts`

### 1. Add pdf-lib Import
```typescript
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@^1.11.1?dts';
```

### 2. Add CSV Generation Functions

Create a function for each report type that generates CSV content:

```typescript
function generateEmployeeTimecardCSV(entries: TimeEntry[]): string {
  // Header row with employee_id column
  let csv = 'Employee,Employee Number,Project,Date,Clock In,Clock Out,Break,Duration\n';
  
  for (const entry of entries) {
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.clock_in);
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const breakTime = formatDuration(entry.break_duration_minutes);
    const duration = formatDuration(entry.duration_minutes);
    
    csv += `"${name}","${employeeNumber}","${projectName}","${date}","${clockIn}","${clockOut}","${breakTime}","${duration}"\n`;
  }
  
  return csv;
}

function generateProjectTimecardCSV(entries: TimeEntry[]): string {
  let csv = 'Project,Employee,Employee Number,Date,Clock In,Clock Out,Break,Duration\n';
  
  for (const entry of entries) {
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.clock_in);
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const breakTime = formatDuration(entry.break_duration_minutes);
    const duration = formatDuration(entry.duration_minutes);
    
    csv += `"${projectName}","${name}","${employeeNumber}","${date}","${clockIn}","${clockOut}","${breakTime}","${duration}"\n`;
  }
  
  return csv;
}

function generateWeeklyPayrollCSV(entries: TimeEntry[]): string {
  // Group by employee first
  const byEmployee = new Map<string, { 
    name: string; 
    employeeNumber: string;
    totalMinutes: number; 
    breakMinutes: number; 
    days: Set<string> 
  }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    const employeeNumber = entry.profiles.employee_id || '';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, employeeNumber, totalMinutes: 0, breakMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.breakMinutes += entry.break_duration_minutes || 0;
    emp.days.add(entry.clock_in.split('T')[0]);
  }
  
  let csv = 'Employee,Employee Number,Days Worked,Regular Hours,Overtime,Breaks,Total Hours\n';
  
  for (const [, emp] of byEmployee) {
    const regularHours = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    csv += `"${emp.name}","${emp.employeeNumber}",${emp.days.size},"${formatDuration(regularHours)}","${formatDuration(overtimeMinutes)}","${formatDuration(emp.breakMinutes)}","${formatDuration(emp.totalMinutes)}"\n`;
  }
  
  return csv;
}
```

### 3. Add PDF Generation Functions

Create functions to generate PDF documents using pdf-lib:

```typescript
async function generateEmployeeTimecardPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  let yPosition = height - 50;
  
  // Title
  page.drawText(reportName || 'Employee Timecard Report', {
    x: 50,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.23, 0.51, 0.96),
  });
  yPosition -= 20;
  
  // Company name
  page.drawText(companyName, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 20;
  
  // Date range
  page.drawText(`Period: ${dateRange.start} - ${dateRange.end}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 30;
  
  // Table headers
  const headers = ['Employee', 'Project', 'Date', 'In', 'Out', 'Hours'];
  const colWidths = [120, 100, 80, 50, 50, 50];
  let xPos = 50;
  
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: xPos,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    xPos += colWidths[i];
  }
  yPosition -= 15;
  
  // Draw line under headers
  page.drawLine({
    start: { x: 50, y: yPosition + 5 },
    end: { x: width - 50, y: yPosition + 5 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  yPosition -= 5;
  
  // Table rows
  for (const entry of entries) {
    if (yPosition < 50) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }
    
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.clock_in).split(',')[0]; // Short date
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const duration = formatDuration(entry.duration_minutes);
    
    const rowData = [
      name.substring(0, 18), // Truncate long names
      projectName.substring(0, 15),
      date,
      clockIn,
      clockOut,
      duration
    ];
    
    xPos = 50;
    for (let i = 0; i < rowData.length; i++) {
      page.drawText(rowData[i], {
        x: xPos,
        y: yPosition,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      xPos += colWidths[i];
    }
    yPosition -= 14;
  }
  
  // Footer
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  lastPage.drawText(`Generated by CICO on ${new Date().toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  return await pdfDoc.save();
}
```

Similar functions for `generateProjectTimecardPDF` and `generateWeeklyPayrollPDF`.

### 4. Update TimeEntry Interface

Add `employee_id` to the interface to support the employee number column:

```typescript
interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  break_duration_minutes: number | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
    employee_id: string | null;  // Add this
  };
  projects: {
    id: string;
    name: string;
  } | null;
}
```

### 5. Update Data Query

Add `employee_id` to the profiles select:

```typescript
let query = supabase
  .from('time_entries')
  .select(`
    id,
    clock_in,
    clock_out,
    duration_minutes,
    break_duration_minutes,
    profiles!inner(
      id,
      first_name,
      last_name,
      display_name,
      department_id,
      employee_id
    ),
    projects(
      id,
      name
    )
  `)
```

### 6. Update Email Sending with Attachments

Modify the email sending logic to include attachments:

```typescript
// Generate CSV and PDF
let csvContent: string;
let pdfBytes: Uint8Array;
let attachmentPrefix: string;

switch (report.report_type) {
  case 'employee_timecard':
    csvContent = generateEmployeeTimecardCSV(typedEntries);
    pdfBytes = await generateEmployeeTimecardPDF(typedEntries, companyName, report.name, dateRange);
    attachmentPrefix = 'employee-timecard';
    break;
  case 'project_timecard':
    csvContent = generateProjectTimecardCSV(typedEntries);
    pdfBytes = await generateProjectTimecardPDF(typedEntries, companyName, report.name, dateRange);
    attachmentPrefix = 'project-timecard';
    break;
  case 'weekly_payroll':
  case 'monthly_project_billing':
    csvContent = generateWeeklyPayrollCSV(typedEntries);
    pdfBytes = await generateWeeklyPayrollPDF(typedEntries, companyName, report.name, dateRange);
    attachmentPrefix = 'payroll';
    break;
  default:
    csvContent = generateEmployeeTimecardCSV(typedEntries);
    pdfBytes = await generateEmployeeTimecardPDF(typedEntries, companyName, report.name, dateRange);
    attachmentPrefix = 'timecard';
}

// Convert PDF bytes to base64
const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

// Create filename with date
const dateStr = dateRange.start.replace(/[^a-zA-Z0-9]/g, '-');
const csvFilename = `${attachmentPrefix}-${dateStr}.csv`;
const pdfFilename = `${attachmentPrefix}-${dateStr}.pdf`;

// Send email with attachments
const emailResponse = await resend.emails.send({
  from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
  to: recipientEmails,
  subject,
  html,
  attachments: [
    {
      filename: csvFilename,
      content: csvContent,
    },
    {
      filename: pdfFilename,
      content: pdfBase64,
    }
  ],
});
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/process-scheduled-reports/index.ts` | Add pdf-lib import |
| `supabase/functions/process-scheduled-reports/index.ts` | Add `employee_id` to TimeEntry interface |
| `supabase/functions/process-scheduled-reports/index.ts` | Update query to include `employee_id` |
| `supabase/functions/process-scheduled-reports/index.ts` | Add `generateEmployeeTimecardCSV`, `generateProjectTimecardCSV`, `generateWeeklyPayrollCSV` functions |
| `supabase/functions/process-scheduled-reports/index.ts` | Add `generateEmployeeTimecardPDF`, `generateProjectTimecardPDF`, `generateWeeklyPayrollPDF` functions |
| `supabase/functions/process-scheduled-reports/index.ts` | Update email sending to include CSV and PDF attachments |

---

## Expected Behavior After Changes

| Current | After |
|---------|-------|
| Email contains only HTML body | Email contains HTML body + CSV attachment + PDF attachment |
| Recipients must copy/paste data | Recipients can download and open files directly |
| No employee number in reports | Employee number included in CSV column |

## Attachment Details

- **CSV**: Plain text, opens in Excel/Google Sheets, includes Employee Number column
- **PDF**: Formatted tabular report with headers, company branding, and timestamps
- **Filenames**: `employee-timecard-Jan-15-2026.csv`, `employee-timecard-Jan-15-2026.pdf`

## Notes

- PDF generation uses `pdf-lib` (no DOM required, works in Deno)
- CSV files include the Employee Number column matching the frontend export
- Both attachments are generated for every report type
- The HTML email body remains unchanged (preview in email client)
