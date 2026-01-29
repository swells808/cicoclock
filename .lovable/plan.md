

# Add Time Entry Details PDF to Employee Timecard Scheduled Reports

## Overview

The user wants the scheduled "Employee Timecard" report to include a **Time Entry Details** style PDF attachment - a rich format that shows each time entry as a visual card with:
- Clock in/out times and photos
- Location maps (via Mapbox)
- Timeline visualization
- Status badges (Work/Break, Active/Complete)

Currently, the PDF is a simple tabular format. This enhancement will generate a more detailed, card-based PDF.

---

## Technical Challenge

The frontend uses `html2canvas` to convert React components to images for PDF generation. This requires a browser DOM which is not available in Deno edge functions.

**Solution**: Generate a detailed, card-style PDF using `pdf-lib` programmatically:
1. Fetch additional time entry fields (photos, geo data, addresses)
2. For each entry, draw a styled "card" with sections for Clock In, Timeline, and Clock Out
3. Embed photos and maps as images directly in the PDF

---

## Data Changes

The current query only fetches basic fields. We need to expand it to include:

```
start_time, end_time, duration_minutes, is_break,
clock_in_photo_url, clock_out_photo_url,
clock_in_latitude, clock_in_longitude, clock_in_address,
clock_out_latitude, clock_out_longitude, clock_out_address
```

---

## PDF Design (Visual Card Format)

Each time entry will render as a card containing:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 Monday, Jan 27 • John Smith • Project Alpha  [Work] [✓ Complete]    │
│                                                        Duration: 8h 30m │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐                                            ┌─────────┐    │
│  │ CLOCK IN│            [ Timeline Bar ]                │CLOCK OUT│    │
│  │ 8:00 AM │    |--[======Regular======]--|             │ 4:30 PM │    │
│  │ 📷 🗺️   │    6am   9am   12pm   3pm   6pm            │ 📷 🗺️   │    │
│  │ 123 Main│                                            │ 456 Oak │    │
│  └─────────┘                                            └─────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Components**:
1. **Header**: Date, employee name, project, badges (Work/Break, status), duration
2. **Clock In Panel**: Time, photo thumbnail placeholder, mini map placeholder, address
3. **Timeline Bar**: Visual representation of work period (simplified)
4. **Clock Out Panel**: Same as Clock In

---

## Image Handling

For photos and maps in PDFs, we have two options:

**Option A: Fetch and embed images** (complex, requires image fetching)
- Fetch signed URLs for photos from Supabase storage
- Fetch static map images from Mapbox
- Embed as PNG in PDF

**Option B: Draw placeholders with text** (simpler, reliable)
- Draw colored boxes where images would appear
- Add text labels ("Photo", "Map")
- Include addresses as text

**Recommended**: Start with **Option B** for reliability, since:
- Edge functions have memory/timeout constraints
- Image fetching can fail or be slow
- Photos in storage require signed URLs (additional complexity)

The PDF will still be significantly more informative than the current tabular version, showing:
- Individual time entry cards with visual structure
- Clock in/out times prominently displayed
- Status indicators (Work/Break, Active/Complete)
- Addresses for clock in/out locations
- Timeline bar showing work period

---

## Changes to `supabase/functions/send-test-report/index.ts`

### 1. Update TimeEntry Interface

Add the additional fields:

```typescript
interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_break: boolean;  // Add
  clock_in_photo_url: string | null;  // Add
  clock_out_photo_url: string | null;  // Add
  clock_in_latitude: number | null;  // Add
  clock_in_longitude: number | null;  // Add
  clock_in_address: string | null;  // Add
  clock_out_latitude: number | null;  // Add
  clock_out_longitude: number | null;  // Add
  clock_out_address: string | null;  // Add
  profiles: { ... };
  projects: { ... } | null;
}
```

### 2. Update Data Query

Expand the select to include all fields needed:

```typescript
.select(`
  id,
  start_time,
  end_time,
  duration_minutes,
  is_break,
  clock_in_photo_url,
  clock_out_photo_url,
  clock_in_latitude,
  clock_in_longitude,
  clock_in_address,
  clock_out_latitude,
  clock_out_longitude,
  clock_out_address,
  profiles!time_entries_profile_id_fkey(...),
  projects(...)
`)
```

### 3. Create New PDF Generator Function

Replace `generateEmployeeTimecardPDF` with a new `generateTimeEntryDetailsPDF` function that:

1. Creates a page header with report title, company name, date range
2. For each time entry:
   - Draws a bordered card container
   - Draws header section with date, name, project, badges
   - Draws Clock In panel (colored background, time, placeholder for photo/map, address)
   - Draws simplified timeline bar
   - Draws Clock Out panel
3. Handles page breaks when cards won't fit
4. Adds footer with generation timestamp

### 4. Update Switch Statement

For `employee_timecard` report type, call the new detailed PDF generator.

---

## Same Changes to `supabase/functions/process-scheduled-reports/index.ts`

The process-scheduled-reports function also needs the same updates to ensure automated reports match the test reports:

1. Update TimeEntry interface
2. Update data query
3. Add the new detailed PDF generator
4. Update switch statement

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Update interface, query, add detailed PDF generator |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes to keep automated reports in sync |

---

## Expected Result

After implementation, the Employee Timecard scheduled report PDF attachment will:

1. Show each time entry as a **visual card** instead of a table row
2. Display **Clock In and Clock Out panels** with times and addresses
3. Include **status badges** (Work/Break, Active/Complete)
4. Show a **simplified timeline bar** representing the work period
5. Provide a much more **readable and detailed audit trail**

The CSV attachment will remain unchanged (tabular format for data import).

---

## Notes

- Photos will be shown as placeholder boxes with "Photo" label (to avoid complexity of fetching signed URLs)
- Maps will be shown as placeholder boxes with "Map" label and coordinates if available
- The timeline bar will be a simplified visual without exact hour markers
- This matches the spirit of the frontend "Time Entry Details" view while working within edge function constraints

