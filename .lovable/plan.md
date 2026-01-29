

# Enhance Time Entry Details Report Timeline Bar

## Problem Identified

After reviewing the code, I can confirm the timeline bar in the report popup/PDF is **missing several key elements** compared to the inline `TimeEntryTimelineCard` component:

| Feature | In-Page Component | Report Popup/PDF |
|---------|-------------------|------------------|
| Hour labels (6am-8pm) | Yes | **Missing** |
| Hour tick mark lines | Yes | **Missing** |
| Scheduled time range indicator | Yes | **Missing** |
| Dynamic color-coded segments | Yes (calculates late/overtime/regular) | **No** - only static blue or teal |
| Color legend | Yes | **Missing** |

### Current Report Bar (Simplified)
The current implementation just shows a single blue bar for "Work" or teal for "Break" - it doesn't calculate:
- Late arrival (orange) when clocking in >10 min after scheduled start
- Overtime (red) when working past scheduled end time
- Mixed segments when a shift spans into overtime

---

## Solution

Port the full timeline bar logic from `TimeEntryTimelineCard.tsx` to the HTML builder functions in `Reports.tsx`:

### Changes to `buildTimeEntryDetailsRichHTML` and `buildSingleEntryCardHTML`

**1. Add hour label row above the timeline bar**
```html
<!-- Hour Labels -->
<div style="position: relative; height: 14px; margin-bottom: 4px;">
  <span style="position: absolute; left: 0%; font-size: 9px; color: #6b7280;">6am</span>
  <span style="position: absolute; left: 14.3%; font-size: 9px; color: #6b7280;">8am</span>
  <span style="position: absolute; left: 28.6%; font-size: 9px; color: #6b7280;">10am</span>
  <span style="position: absolute; left: 42.9%; font-size: 9px; color: #6b7280;">12pm</span>
  <span style="position: absolute; left: 57.1%; font-size: 9px; color: #6b7280;">2pm</span>
  <span style="position: absolute; left: 71.4%; font-size: 9px; color: #6b7280;">4pm</span>
  <span style="position: absolute; left: 85.7%; font-size: 9px; color: #6b7280;">6pm</span>
  <span style="position: absolute; left: 100%; font-size: 9px; color: #6b7280; transform: translateX(-100%);">8pm</span>
</div>
```

**2. Add hour tick marks inside the timeline bar**
```html
<!-- Hour tick marks at 2-hour intervals -->
<div style="position: absolute; left: 14.3%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
<div style="position: absolute; left: 28.6%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
<!-- etc. -->
```

**3. Add scheduled time range indicator**
```html
<!-- Scheduled 8am-5pm range (dashed border) -->
<div style="position: absolute; left: 14.3%; width: 64.3%; top: 0; bottom: 0; border-left: 2px dashed rgba(59, 130, 246, 0.3); border-right: 2px dashed rgba(59, 130, 246, 0.3);"></div>
```

**4. Port segment calculation logic**
Add a helper function to calculate segments based on:
- Scheduled start/end times (default 8am-5pm)
- Actual clock in/out times
- Break status

This will determine:
- **Regular (blue)**: Work within scheduled hours
- **Late (orange)**: Gap from scheduled start to actual clock-in if >10 min late
- **Overtime (red)**: Work after scheduled end time
- **Break (teal)**: Break entries

**5. Add color legend below the timeline bar**
```html
<!-- Legend -->
<div style="display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
  <div style="display: flex; align-items: center; gap: 4px;">
    <div style="width: 12px; height: 12px; border-radius: 2px; background: #3b82f6;"></div>
    <span style="font-size: 10px; color: #6b7280;">Regular</span>
  </div>
  <div style="display: flex; align-items: center; gap: 4px;">
    <div style="width: 12px; height: 12px; border-radius: 2px; background: #f97316;"></div>
    <span style="font-size: 10px; color: #6b7280;">Late</span>
  </div>
  <div style="display: flex; align-items: center; gap: 4px;">
    <div style="width: 12px; height: 12px; border-radius: 2px; background: #ef4444;"></div>
    <span style="font-size: 10px; color: #6b7280;">Overtime</span>
  </div>
  <div style="display: flex; align-items: center; gap: 4px;">
    <div style="width: 12px; height: 12px; border-radius: 2px; background: #14b8a6;"></div>
    <span style="font-size: 10px; color: #6b7280;">Break</span>
  </div>
</div>
```

---

## Technical Implementation

### New Helper Function: `calculateTimelineSegmentsHTML`

```typescript
function calculateTimelineSegmentsHTML(
  startTime: Date, 
  endTime: Date | null, 
  isBreak: boolean,
  scheduledStartHour: number = 8,
  scheduledEndHour: number = 17
): string {
  const timelineStartHour = 6;
  const timelineEndHour = 20;
  const totalHours = timelineEndHour - timelineStartHour;
  
  const getPositionPercent = (hour: number): number => {
    return ((hour - timelineStartHour) / totalHours) * 100;
  };
  
  const clockInHour = startTime.getHours() + startTime.getMinutes() / 60;
  const clockOutTime = endTime || new Date();
  const clockOutHour = clockOutTime.getHours() + clockOutTime.getMinutes() / 60;
  
  const clockInMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const scheduledStartMinutes = scheduledStartHour * 60;
  const isLateByMoreThan10 = clockInMinutes > scheduledStartMinutes + 10;
  
  let segmentsHTML = '';
  
  // Colors
  const colors = {
    regular: '#3b82f6',
    late: '#f97316', 
    overtime: '#ef4444',
    break: '#14b8a6'
  };
  
  // Late segment
  if (isLateByMoreThan10 && !isBreak) {
    const startPct = getPositionPercent(scheduledStartHour);
    const widthPct = getPositionPercent(clockInHour) - startPct;
    segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${widthPct}%; background: ${colors.late}; border-radius: 3px;" title="Late"></div>`;
  }
  
  // Main segment(s)
  if (isBreak) {
    const startPct = getPositionPercent(clockInHour);
    const widthPct = getPositionPercent(clockOutHour) - startPct;
    segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${Math.max(widthPct, 1)}%; background: ${colors.break}; border-radius: 3px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 9px; color: white; font-weight: 500;">Break</span></div>`;
  } else {
    const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
    const scheduledEndMinutes = scheduledEndHour * 60;
    
    if (clockInMinutes >= scheduledEndMinutes) {
      // Entire entry is overtime
      const startPct = getPositionPercent(clockInHour);
      const widthPct = getPositionPercent(clockOutHour) - startPct;
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${Math.max(widthPct, 1)}%; background: ${colors.overtime}; border-radius: 3px;"></div>`;
    } else if (clockOutMinutes > scheduledEndMinutes) {
      // Spans into overtime
      const scheduledEndHourFloat = scheduledEndMinutes / 60;
      const regularStart = getPositionPercent(clockInHour);
      const regularWidth = getPositionPercent(scheduledEndHourFloat) - regularStart;
      const overtimeStart = getPositionPercent(scheduledEndHourFloat);
      const overtimeWidth = getPositionPercent(clockOutHour) - overtimeStart;
      
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${regularStart}%; width: ${Math.max(regularWidth, 1)}%; background: ${colors.regular}; border-radius: 3px 0 0 3px;"></div>`;
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${overtimeStart}%; width: ${Math.max(overtimeWidth, 1)}%; background: ${colors.overtime}; border-radius: 0 3px 3px 0;"></div>`;
    } else {
      // Regular work
      const startPct = getPositionPercent(clockInHour);
      const widthPct = getPositionPercent(clockOutHour) - startPct;
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${Math.max(widthPct, 1)}%; background: ${colors.regular}; border-radius: 3px;"></div>`;
    }
  }
  
  return segmentsHTML;
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Reports.tsx` | Add `calculateTimelineSegmentsHTML` helper function |
| `src/pages/Reports.tsx` | Update `buildTimeEntryDetailsRichHTML` with hour labels, tick marks, scheduled range indicator, dynamic segments, and legend |
| `src/pages/Reports.tsx` | Update `buildSingleEntryCardHTML` with the same timeline enhancements for PDF export |

---

## Expected Result

After implementation:

1. **Popup preview** will show the full timeline bar with:
   - Hour labels (6am, 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm)
   - Vertical lines marking hour intervals
   - Dashed lines showing scheduled work window (8am-5pm)
   - Color-coded segments (blue/orange/red/teal) based on actual times
   - Legend explaining what each color means

2. **PDF export** will include the same visual elements

3. **Color behavior**:
   - Blue bar = clocked in on time, working within scheduled hours
   - Orange segment = gap between scheduled start and late arrival
   - Red segment = working past scheduled end time (overtime)
   - Teal bar = break entries

