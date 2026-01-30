
# Redesign PDF Time Entry Cards to Match Tracking Page UI

## Overview

The current PDF report cards look significantly different from the tracking page. The plan is to rewrite the `generateTimeEntryDetailsPDF` function in both edge functions to closely match the React `TimeEntryTimelineCard` component's visual design.

## Current vs Target Comparison

| Element | Current PDF | Target (Tracking Page) |
|---------|-------------|------------------------|
| Hour labels | None | 6am, 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm across top |
| Timeline bar | Simple filled rectangle with "Work Period" | Colored segments (blue=regular, orange=late, red=overtime, teal=break) |
| Scheduled window | None | Dashed vertical lines at 8am and 5pm |
| Timeline labels | Start/end times below | Hour markers above, segment labels inside bars |
| Legend | None | Colored dots with labels: Regular, Late, Overtime, Break |
| Clock In panel | Light blue box with "CLOCK IN" | Green background with "Clock In" header |
| Clock Out panel | Light green/orange box | Red/coral background with "Clock Out" header |
| Photo/Map indicators | Text "Photo" / "Map" in boxes | Bordered boxes with visual indicators (filled if present, dashed if missing) |
| Addresses | Single truncated line | Multi-line display (up to 3-4 lines) |

---

## Implementation Tasks

### Task 1: Add Timeline Hour Markers and Tick Lines

Draw hour labels above the timeline (6am to 8pm in 2-hour increments) and vertical tick lines within the timeline bar.

```text
Timeline Layout:
    6am     8am     10am    12pm    2pm     4pm     6pm     8pm
     |       |        |       |       |       |       |       |
    [==================== Working time =====================]
```

### Task 2: Add Scheduled Work Window Indicator

Draw dashed vertical lines at 8am and 5pm positions to show the scheduled work window (matching the React component's `border-dashed border-primary/30` style).

### Task 3: Implement Segment Coloring Logic

Port the `calculateSegments` logic from `TimeEntryTimelineCard.tsx` to the PDF generator:
- **Regular** (blue): Work within scheduled hours
- **Late** (orange): Gap from scheduled start to actual clock-in if >10 min late
- **Overtime** (red): Work after scheduled end time (5pm)
- **Break** (teal): Break entries

### Task 4: Add Timeline Legend

Draw a legend row below the timeline with colored squares and labels:
- Blue square + "Regular"
- Orange square + "Late"
- Red square + "Overtime"
- Teal square + "Break"

### Task 5: Redesign Clock In/Out Panels

Update panel styling to match React component:
- **Clock In**: Green background (`rgb(0.9, 0.98, 0.9)`), green text for header
- **Clock Out**: Red/coral background (`rgb(1, 0.95, 0.95)`), red text for header
- Larger time display
- Better photo/map placeholder styling (filled vs dashed boxes)

### Task 6: Improve Address Display

Show addresses on multiple lines (wrap at ~20 characters) instead of truncating to a single line.

### Task 7: Adjust Card Layout Proportions

Increase card height to accommodate:
- Hour labels above timeline
- Legend below timeline
- Multi-line addresses

---

## Technical Details

### Timeline Positioning Algorithm

```typescript
// Match the React component's logic
const timelineStartHour = 6;
const timelineEndHour = 20;
const totalHours = timelineEndHour - timelineStartHour; // 14 hours

const getPositionPercent = (hour: number): number => {
  return ((hour - timelineStartHour) / totalHours) * 100;
};

// Convert percent to actual X coordinate
const getTimelineX = (percent: number, timelineX: number, timelineWidth: number): number => {
  return timelineX + (percent / 100) * timelineWidth;
};
```

### Segment Calculation (from React component)

```typescript
const calculateSegments = (entry, scheduledStartHour = 8, scheduledEndHour = 17) => {
  const clockInTime = parseISO(entry.start_time);
  const clockInHour = clockInTime.getHours() + clockInTime.getMinutes() / 60;
  
  const clockOutTime = entry.end_time ? parseISO(entry.end_time) : new Date();
  const clockOutHour = clockOutTime.getHours() + clockOutTime.getMinutes() / 60;
  
  const segments = [];
  
  // Check if late (>10 min after scheduled start)
  const scheduledStartMinutes = scheduledStartHour * 60;
  const clockInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  const isLate = clockInMinutes > scheduledStartMinutes + 10;
  
  if (isLate && !entry.is_break) {
    segments.push({ type: 'late', startHour: scheduledStartHour, endHour: clockInHour });
  }
  
  // Determine main segment type based on overtime
  const scheduledEndMinutes = scheduledEndHour * 60;
  const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
  
  if (entry.is_break) {
    segments.push({ type: 'break', startHour: clockInHour, endHour: clockOutHour });
  } else if (clockInMinutes >= scheduledEndMinutes) {
    // All overtime
    segments.push({ type: 'overtime', startHour: clockInHour, endHour: clockOutHour });
  } else if (clockOutMinutes > scheduledEndMinutes) {
    // Regular + overtime split
    segments.push({ type: 'regular', startHour: clockInHour, endHour: scheduledEndHour });
    segments.push({ type: 'overtime', startHour: scheduledEndHour, endHour: clockOutHour });
  } else {
    // Regular only
    segments.push({ type: 'regular', startHour: clockInHour, endHour: clockOutHour });
  }
  
  return segments;
};
```

### Color Constants

```typescript
const SEGMENT_COLORS = {
  regular: rgb(0.23, 0.51, 0.96),   // blue-500
  late: rgb(0.98, 0.57, 0.21),      // orange-500
  overtime: rgb(0.94, 0.27, 0.27),  // red-500
  break: rgb(0.25, 0.71, 0.71),     // teal-500
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Rewrite `generateTimeEntryDetailsPDF` function |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes for automated reports |

---

## Visual Result

After implementation, each card will look like:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Thursday, Jan 29 • Felipe Salazar • Project Alpha  [Work] [Complete]        │
│                                                         Duration: 8h 31m    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐       6am   8am   10am  12pm  2pm   4pm   6pm   8pm        │
│  │  Clock In   │        |     ┊      |     |     |     ┊     |     |        │
│  │   5:00 AM   │       [============ Working time ================]         │
│  │  [📷] [🗺]  │                                                             │
│  │ 401 East    │        ■ Regular  ■ Late  ■ Overtime  ■ Break              │
│  │ Sunset Road │                                                ┌───────────┐
│  │ Henderson   │                                                │ Clock Out │
│  │ NV 89011    │                                                │  1:32 PM  │
│  └─────────────┘                                                │ [📷] [🗺] │
│                                                                 │ 401 East  │
│                                                                 │ Sunset Rd │
│                                                                 │ Henderson │
│                                                                 └───────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Card Height Adjustment

Current card height: ~150px
New card height: ~180-200px to accommodate:
- +15px for hour labels above timeline
- +15px for legend below timeline
- +10px for additional address lines
