
# Open Reports in New Window with PDF/CSV Export

## Problem
Currently, clicking "Generate Report" for "Daily Timecard" and "Time Entry Details" report types scrolls to inline report sections on the page. The user wants these reports to open in a new window (like the existing Employee/Project reports) with the ability to download as PDF or CSV.

## Solution Overview
1. Modify `handleGenerateReport` to open a popup window for all report types
2. Create HTML rendering functions for Daily Timecard and Time Entry Details reports
3. Add PDF and CSV export functions for the new report types
4. Fetch all necessary data (time entries, profiles, photos) and render in the popup

---

## Technical Changes

### File 1: `src/pages/Reports.tsx`

**Change 1: Add new export utility functions for Daily and Timecard reports**

Add functions to export daily timecard and time entry details as CSV:

```typescript
// Export Daily Timecard as CSV
function exportDailyTimecardAsCSV(entries: any[]) {
  const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
  let csv = columns.join(",") + "\n";
  csv += entries.map(entry => {
    const clockIn = entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-';
    const clockOut = entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active';
    const duration = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
      : '-';
    return [
      `"${entry.employeeName}"`,
      `"${entry.projectName || 'No Project'}"`,
      clockIn,
      clockOut,
      duration
    ].join(",");
  }).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-timecard-report.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// Export Time Entry Details as CSV
function exportTimeEntryDetailsAsCSV(entries: any[]) {
  const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration", "Clock In Address", "Clock Out Address"];
  let csv = columns.join(",") + "\n";
  csv += entries.map(entry => {
    const date = format(new Date(entry.start_time), 'MMM d, yyyy');
    const clockIn = format(new Date(entry.start_time), 'h:mm a');
    const clockOut = entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active';
    const duration = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
      : '-';
    return [
      `"${entry.employeeName}"`,
      date,
      `"${entry.projectName || 'No Project'}"`,
      clockIn,
      clockOut,
      duration,
      `"${entry.clock_in_address || ''}"`,
      `"${entry.clock_out_address || ''}"`
    ].join(",");
  }).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "time-entry-details-report.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
```

**Change 2: Add PDF export functions for new report types**

```typescript
// Export Daily Timecard as PDF
function exportDailyTimecardAsPDF(entries: any[], dateStr: string) {
  import("jspdf").then(jsPDFImport => {
    import("jspdf-autotable").then(() => {
      const { jsPDF } = jsPDFImport;
      const doc = new jsPDF();
      const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
      
      doc.setFontSize(16);
      doc.text(`Daily Timecard Report - ${dateStr}`, 14, 16);
      
      doc.autoTable({
        startY: 25,
        head: [columns],
        body: entries.map(entry => [
          entry.employeeName,
          entry.projectName || 'No Project',
          entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-',
          entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active',
          entry.duration_minutes 
            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
            : '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      doc.save(`daily-timecard-${dateStr}.pdf`);
    });
  });
}

// Export Time Entry Details as PDF
function exportTimeEntryDetailsAsPDF(entries: any[], dateRange: string) {
  import("jspdf").then(jsPDFImport => {
    import("jspdf-autotable").then(() => {
      const { jsPDF } = jsPDFImport;
      const doc = new jsPDF('landscape');
      const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration"];
      
      doc.setFontSize(16);
      doc.text(`Time Entry Details - ${dateRange}`, 14, 16);
      
      doc.autoTable({
        startY: 25,
        head: [columns],
        body: entries.map(entry => [
          entry.employeeName,
          format(new Date(entry.start_time), 'MMM d, yyyy'),
          entry.projectName || 'No Project',
          format(new Date(entry.start_time), 'h:mm a'),
          entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active',
          entry.duration_minutes 
            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
            : '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });
      
      doc.save(`time-entry-details-${dateRange}.pdf`);
    });
  });
}
```

**Change 3: Add HTML table builders for new report types**

```typescript
function buildDailyTimecardHTML(entries: any[]): string {
  const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
  let table = "<table border='1' style='border-collapse:collapse;width:100%;font-family:sans-serif;'>";
  table += "<thead><tr>" + columns.map(col => 
    `<th style='padding:10px;background:#F6F6F7;text-align:left;'>${col}</th>`
  ).join("") + "</tr></thead><tbody>";
  
  table += entries.map((entry, i) => {
    const bgColor = i % 2 === 0 ? '#fff' : '#fafafa';
    return `<tr style='background:${bgColor}'>
      <td style='padding:10px;'>${entry.employeeName}</td>
      <td style='padding:10px;'>${entry.projectName || 'No Project'}</td>
      <td style='padding:10px;'>${entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-'}</td>
      <td style='padding:10px;'>${entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}</td>
      <td style='padding:10px;'>${entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : '-'}</td>
    </tr>`;
  }).join("");
  
  table += "</tbody></table>";
  return table;
}

function buildTimeEntryDetailsHTML(entries: any[]): string {
  const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration", "Location"];
  let table = "<table border='1' style='border-collapse:collapse;width:100%;font-family:sans-serif;'>";
  table += "<thead><tr>" + columns.map(col => 
    `<th style='padding:10px;background:#F6F6F7;text-align:left;'>${col}</th>`
  ).join("") + "</tr></thead><tbody>";
  
  table += entries.map((entry, i) => {
    const bgColor = i % 2 === 0 ? '#fff' : '#fafafa';
    return `<tr style='background:${bgColor}'>
      <td style='padding:10px;'>${entry.employeeName}</td>
      <td style='padding:10px;'>${format(new Date(entry.start_time), 'MMM d, yyyy')}</td>
      <td style='padding:10px;'>${entry.projectName || 'No Project'}</td>
      <td style='padding:10px;'>${format(new Date(entry.start_time), 'h:mm a')}</td>
      <td style='padding:10px;'>${entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}</td>
      <td style='padding:10px;'>${entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : '-'}</td>
      <td style='padding:10px;'>${entry.clock_in_address || '-'}</td>
    </tr>`;
  }).join("");
  
  table += "</tbody></table>";
  return table;
}
```

**Change 4: Update handleGenerateReport for daily and timecard types**

Modify the handler to fetch data and open a popup window for daily and timecard reports:

```typescript
const handleGenerateReport = async (filters: ReportFiltersValues) => {
  setAppliedFilters(filters);
  setSelectedStartDate(filters.startDate);
  setSelectedEndDate(filters.endDate);

  const newWin = window.open("", "_blank", "width=900,height=700");
  if (!newWin) {
    alert("Please enable popups for this site.");
    return;
  }

  // Fetch company data
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, first_name, last_name, department_id, company_id');

  const companyId = profiles?.[0]?.company_id;
  if (!companyId) {
    newWin.close();
    alert("Unable to fetch company data");
    return;
  }

  // Handle Daily Timecard Report
  if (filters.reportType === 'daily') {
    const date = filters.startDate || new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select(`id, user_id, profile_id, start_time, end_time, duration_minutes, projects(name)`)
      .eq('company_id', companyId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: false });

    // Build profile map and filter entries
    const profileMap = buildProfileMap(profiles);
    let entries = mapAndFilterEntries(timeEntries, profileMap, filters.employeeId, filters.departmentId);

    const dateStr = format(date, 'MMMM d, yyyy');
    const title = `Daily Timecard Report — ${dateStr}`;
    const reportTable = buildDailyTimecardHTML(entries);
    
    renderReportPopup(newWin, title, reportTable, 'daily', dateStr, entries);
    return;
  }

  // Handle Time Entry Details Report
  if (filters.reportType === 'timecard') {
    const start = filters.startDate || new Date();
    const end = filters.endDate || new Date();
    // ... similar fetch and render logic
  }

  // ... existing employee/project report logic
};
```

**Change 5: Create a reusable popup renderer function**

```typescript
function renderReportPopup(
  newWin: Window, 
  title: string, 
  tableHtml: string, 
  reportType: string, 
  dateInfo: string,
  entries: any[]
) {
  const style = `
    <style>
      body { font-family: sans-serif; background: #F6F6F7; margin:0; padding:24px; }
      .download-btn {
        margin-top: 24px; margin-right: 16px;
        padding: 10px 16px; border: none; border-radius:6px;
        font-size: 15px; background: #4BA0F4; color: #fff; cursor: pointer;
      }
      h2 { margin-bottom: 18px; }
      .export-bar { margin-bottom: 20px; }
      table { background: #fff; border:1px solid #ececec; }
      .entry-count { color: #666; margin-bottom: 16px; }
    </style>
  `;

  const html = `
    <html>
      <head><title>${title}</title>${style}</head>
      <body>
        <h2>${title}</h2>
        <p class="entry-count">${entries.length} entries</p>
        <div class="export-bar">
          <button class="download-btn" id="btn-pdf">Save as PDF</button>
          <button class="download-btn" id="btn-csv">Save as CSV</button>
        </div>
        ${tableHtml}
        <script>
          // Export handlers will call back to opener window
          document.getElementById('btn-pdf').onclick = function() {
            window.opener.exportReportPDF('${reportType}');
          };
          document.getElementById('btn-csv').onclick = function() {
            window.opener.exportReportCSV('${reportType}');
          };
        </script>
      </body>
    </html>
  `;
  
  newWin.document.write(html);
  
  // Store entries and attach export functions to window
  (window as any).currentReportData = { entries, dateInfo, reportType };
  (window as any).exportReportPDF = (type: string) => {
    if (type === 'daily') exportDailyTimecardAsPDF(entries, dateInfo);
    if (type === 'timecard') exportTimeEntryDetailsAsPDF(entries, dateInfo);
  };
  (window as any).exportReportCSV = (type: string) => {
    if (type === 'daily') exportDailyTimecardAsCSV(entries);
    if (type === 'timecard') exportTimeEntryDetailsAsCSV(entries);
  };
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Add HTML builders, CSV/PDF export functions, and modify handleGenerateReport to open popup windows for daily and timecard report types |

## Expected Behavior After Changes

| Report Type | Current Behavior | New Behavior |
|-------------|------------------|--------------|
| Employee Hours | Opens popup | Opens popup (unchanged) |
| Project Hours | Opens popup | Opens popup (unchanged) |
| Daily Timecard | Scrolls to inline report | Opens popup with table + PDF/CSV buttons |
| Time Entry Details | Scrolls to inline report | Opens popup with table + PDF/CSV buttons |

## Report Contents

**Daily Timecard Popup:**
- Title with selected date
- Entry count
- Table with: Employee, Project, Clock In, Clock Out, Duration
- PDF and CSV export buttons

**Time Entry Details Popup:**
- Title with date range
- Entry count
- Table with: Employee, Date, Project, Clock In, Clock Out, Duration, Location
- PDF and CSV export buttons

## Additional Notes
- The inline reports (DailyTimecardReport, TimeEntryDetailsReport components) will remain on the page for quick reference
- Role-based filtering (employee/department) will be applied before rendering in the popup
- Regular employees will only see their own data in the popup report
