
# Fix Report Data Discrepancies and Export Functions

## Issues Identified

### 1. Hour Calculation Bug (24h vs 13h for Raul Rodriguez)
**Root Cause**: The Work Hours Per Employee report counts the full `duration_minutes` for entries that **start** on the selected date, even if the entry **ends** on the next day.

For Raul Rodriguez on 1/29/2026:
- Entry 1: Started 12:57 PM, ended 11:30 PM = 632 minutes (10h 32m) - correctly within 1/29
- Entry 2: Started 11:31 PM on 1/29, ended 12:58 PM on 1/30 = 807 minutes (13h 27m) - **spans two days**

The query filters by `start_time` so both entries are included, but Entry 2's duration extends into 1/30, inflating the 1/29 total to ~24 hours.

**Solution**: Prorate entries that span multiple days, counting only the minutes that fall within the selected date range.

### 2. PDF Export Does Nothing
**Root Cause**: The `exportTableAsPDF` function has a bug where `doc.autoTable` is not a function. The `jspdf-autotable` plugin isn't being properly applied to the jsPDF instance.

**Solution**: Fix the dynamic import to correctly apply the autoTable plugin.

### 3. CSV Export Downloads Generic Data
**Root Cause**: The `exportTableAsCSV` function uses hardcoded sample data instead of the actual report data.

**Solution**: Pass the real `reportData` to the export function and use it instead of the sample data.

---

## Implementation Plan

### Task 1: Fix Hour Calculation for Multi-Day Entries

**File**: `src/pages/Reports.tsx` (lines 1016-1025)

Modify the minutes calculation to prorate entries that span beyond the date range:

```typescript
const timeEntries = rawTimeEntries?.map(entry => {
  const entryStart = new Date(entry.start_time).getTime();
  const entryEnd = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
  
  // Clamp to the report's date range
  const rangeStart = start.getTime();
  const rangeEnd = end.getTime();
  
  const effectiveStart = Math.max(entryStart, rangeStart);
  const effectiveEnd = Math.min(entryEnd, rangeEnd);
  
  // Calculate only the minutes within the date range
  const minutes = effectiveStart < effectiveEnd 
    ? Math.floor((effectiveEnd - effectiveStart) / 1000 / 60)
    : 0;
  
  return { ...entry, calculated_minutes: minutes };
}) || [];
```

This ensures that if an entry starts at 11:31 PM on 1/29 and ends at 12:58 PM on 1/30, only the ~29 minutes from 11:31 PM to midnight are counted toward 1/29.

### Task 2: Fix PDF Export (autoTable Error)

**File**: `src/pages/Reports.tsx` (lines 783-802)

The issue is that `jspdf-autotable` needs to be imported **before** creating the jsPDF instance, or use the default export correctly:

```typescript
async function exportTableAsPDF(type: "employee" | "project", data: any[]) {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  
  const { jsPDF } = jsPDFModule;
  const doc = new jsPDF();
  
  // jspdf-autotable adds autoTable to the prototype
  const autoTable = autoTableModule.default;
  
  const columns = ["Name", "Hours"];
  doc.setFontSize(16);
  doc.text(`${type === "employee" ? "Work Hours Per Employee" : "Project Time Distribution"}`, 14, 16);
  
  autoTable(doc, {
    startY: 25,
    head: [columns],
    body: data.map((row) => [row.name, row.hours?.toFixed(1) || "0"]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.save(`${type}-report.pdf`);
}
```

### Task 3: Fix CSV Export to Use Real Data

**File**: `src/pages/Reports.tsx` (lines 765-781)

Replace the hardcoded sample data with actual report data:

```typescript
function exportTableAsCSV(type: "employee" | "project", data: any[]) {
  const columns = ["Name", "Hours"];
  let csv = columns.join(",") + "\n";
  csv += data.map((row) => `"${row.name}",${row.hours?.toFixed(1) || 0}`).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
```

### Task 4: Pass Real Data to Export Functions

**File**: `src/pages/Reports.tsx` (lines 1154-1171)

Update the popup's export button handlers to pass the actual `reportData`:

```typescript
// Store real data for exports
(window as any).currentEmployeeProjectData = { reportData, type: filters.reportType };

(window as any).exportTableAsCSV = (type: string) => {
  const data = (window as any).currentEmployeeProjectData;
  if (data && data.reportData) {
    exportTableAsCSV(type as "employee" | "project", data.reportData);
  }
};

(window as any).exportTableAsPDF = async (type: string) => {
  const data = (window as any).currentEmployeeProjectData;
  if (data && data.reportData) {
    await exportTableAsPDF(type as "employee" | "project", data.reportData);
  }
};
```

### Task 5: Apply Same Fix to useReports Hook

**File**: `src/hooks/useReports.ts` (lines 76-84)

Apply the same prorated calculation for the inline metrics display:

```typescript
const timeEntries = rawTimeEntries?.map(entry => {
  const entryStart = new Date(entry.start_time).getTime();
  const entryEnd = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
  
  // Clamp to the report's date range
  const rangeStart = start.getTime();
  const rangeEnd = end.getTime();
  
  const effectiveStart = Math.max(entryStart, rangeStart);
  const effectiveEnd = Math.min(entryEnd, rangeEnd);
  
  const minutes = effectiveStart < effectiveEnd 
    ? Math.floor((effectiveEnd - effectiveStart) / 1000 / 60)
    : 0;
  
  return { ...entry, calculated_minutes: minutes };
}) || [];
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Reports.tsx` | Fix hour calculation prorating, fix PDF export autoTable call, fix CSV export to use real data, pass data to export handlers |
| `src/hooks/useReports.ts` | Apply same prorated calculation for dashboard metrics |

---

## Technical Details

### Why Prorating Works

If an employee clocks in at 11:31 PM on Monday and clocks out at 12:58 PM on Tuesday:
- **Monday's report** should show: 11:31 PM to 11:59:59 PM = ~29 minutes
- **Tuesday's report** should show: 12:00 AM to 12:58 PM = ~778 minutes

Current behavior counts the full 807 minutes toward Monday because that's when `start_time` falls.

### PDF Export Fix Explanation

The `jspdf-autotable` library works by extending jsPDF's prototype. The correct way to use it with ES modules is:
1. Import jspdf-autotable's default export
2. Call it as `autoTable(doc, options)` instead of `doc.autoTable(options)`

This matches the library's modern API and avoids the "autoTable is not a function" error.

---

## Expected Results

After these changes:
- Raul Rodriguez's hours on 1/29 will show ~10h 32m + ~29m ≈ 11 hours (only time within 1/29)
- PDF export will generate and download correctly
- CSV export will contain actual employee/project data from the report
