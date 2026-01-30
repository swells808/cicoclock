
# New Approach: Rich HTML Email + Browser-Style PDF

## Problem Summary

The current Edge Function approach has two issues:
1. **PDF generation fails** with `WORKER_LIMIT` errors for large reports because `pdf-lib` accumulates all embedded images in memory
2. **Current solution skips images** for reports with >8 entries, making the PDF useless compared to the web version

## New Strategy

Take a completely different approach that leverages what already works:

### Email Body → Rich HTML (like web preview)
- Generate the **same visual HTML** used in the browser popup (`buildTimeEntryDetailsRichHTML`)
- Include embedded photos as data URLs or signed URLs
- Include Mapbox maps directly in the HTML
- Email clients will render the images on demand (no memory issue)

### PDF Attachment → Simple tabular format (no images)
- Generate a **clean tabular PDF** similar to the Daily Timecard report
- Include all data: employee, date, times, addresses, duration
- No photos or maps (keeps PDF small and prevents memory errors)
- Users who need the visual version can open the HTML email or use the web app

## Why This Works

| Aspect | HTML Email | PDF Attachment |
|--------|-----------|----------------|
| Images | Loaded by email client on-demand | Not included |
| Memory | No server-side memory issues | Minimal (~50KB) |
| Visual fidelity | **Matches web exactly** | Clean data summary |
| File size | N/A (inline) | Small |
| Use case | Visual review | Archival/printing data |

## Technical Implementation

### 1. New HTML Generator for Employee Timecard Emails

Create a new function `generateTimeEntryDetailsHtml()` that mirrors `buildTimeEntryDetailsRichHTML()` from the frontend:

```typescript
async function generateTimeEntryDetailsHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string,
  supabase: any
): Promise<string> {
  // For each entry, fetch signed URLs for photos
  // Build rich HTML cards with:
  // - Header row: date, employee, project, Work/Break badge, Complete/Active badge, duration
  // - Clock In panel: time, photo img, map img, address
  // - Timeline bar with colored segments
  // - Clock Out panel: time, photo img, map img, address
}
```

Key differences from current table-based HTML:
- Uses the **card layout** matching `TimeEntryTimelineCard`
- Includes **photo images** (signed URLs)
- Includes **Mapbox maps** (static image URLs)
- Full **address display** (not truncated)
- **Timeline bar** with colored segments

### 2. Simple Tabular PDF Generator

Replace the complex card-based PDF with a simple table:

```typescript
async function generateSimpleTimecardPDF(
  entries: TimeEntry[],
  companyName: string,
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): Promise<Uint8Array> {
  // Simple table with columns:
  // Date | Employee | Project | Clock In | Clock Out | Duration | In Address | Out Address
  // No images - just text
  // Similar to generateProjectTimecardPDF() but with address columns
}
```

### 3. Update Report Selection Logic

Modify the switch statement in the main handler:

```typescript
case 'employee_timecard':
  // Use new rich HTML with photos
  html = await generateTimeEntryDetailsHtml(typedEntries, companyName, report.name, dateRange, companyTimezone, supabase);
  csvContent = generateEmployeeTimecardCSV(typedEntries, companyTimezone);
  // Use simple tabular PDF (no images)
  pdfBytes = await generateSimpleTimecardPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
  attachmentPrefix = 'employee-timecard';
  break;
```

### 4. Photo URL Resolution for HTML

The HTML can use signed URLs directly since email clients fetch images:

```typescript
// Resolve photo URLs for HTML embedding
async function resolveAllPhotoUrls(supabase: any, entries: TimeEntry[]): Promise<Map<string, {clockIn?: string, clockOut?: string}>> {
  const urlMap = new Map();
  
  for (const entry of entries) {
    const urls: any = {};
    
    if (entry.clock_in_photo_url) {
      urls.clockIn = await resolvePhotoUrl(supabase, entry.clock_in_photo_url);
    }
    if (entry.clock_out_photo_url) {
      urls.clockOut = await resolvePhotoUrl(supabase, entry.clock_out_photo_url);
    }
    
    urlMap.set(entry.id, urls);
  }
  
  return urlMap;
}
```

## HTML Structure (matching web)

```html
<div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; background: white;">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
    <div>
      <span style="font-weight: 600;">Friday, Jan 24</span>
      <span>•</span>
      <span>John Doe</span>
      <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 9999px;">Work</span>
      <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px;">Complete</span>
    </div>
    <span>Duration: 8h 30m</span>
  </div>
  
  <!-- Content -->
  <div style="display: flex; align-items: stretch; gap: 16px; padding: 16px;">
    <!-- Clock In Panel (green) -->
    <div style="display: flex; flex-direction: column; align-items: center; padding: 12px; background: #dcfce7; border-radius: 8px; min-width: 110px;">
      <span style="color: #166534;">Clock In</span>
      <span style="font-weight: 700; color: #166534;">7:00 AM</span>
      <div style="display: flex; gap: 4px;">
        <img src="[signed-photo-url]" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;" />
        <img src="[mapbox-static-url]" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;" />
      </div>
      <p style="font-size: 10px; color: #6b7280; text-align: center;">401 East Sunset Road, Henderson, Nevada 89011</p>
    </div>
    
    <!-- Timeline Bar -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
      <!-- Hour labels -->
      <!-- Bar with colored segments -->
      <!-- Legend -->
    </div>
    
    <!-- Clock Out Panel (red) -->
    <div style="display: flex; flex-direction: column; align-items: center; padding: 12px; background: #fee2e2; border-radius: 8px; min-width: 110px;">
      <!-- Similar structure to Clock In -->
    </div>
  </div>
</div>
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Add `generateTimeEntryDetailsHtml()`, add `generateSimpleTimecardPDF()`, update switch logic |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes for production scheduled reports |

## Memory Comparison

| Scenario | Current Approach | New Approach |
|----------|-----------------|--------------|
| 23 entries, HTML | Table only | Rich cards with photos |
| 23 entries, PDF | WORKER_LIMIT crash OR no images | Simple table (~50KB) |
| 50 entries | Crashes | Works fine |
| 100 entries | Crashes | Works fine |

## Expected Result

After these changes:
- Email body shows **rich visual cards** with photos, maps, addresses, and timeline bars (exactly like web)
- PDF attachment is a **clean tabular summary** without images (always succeeds)
- No more WORKER_LIMIT errors regardless of entry count
- Users get the visual audit trail in their email, and a compact PDF for records
