

# Fix PDF Report Images and Address Layout

## Overview

The PDF report has two issues:
1. **Images not showing** - The `MAX_ENTRIES_FOR_IMAGES = 10` limit is too restrictive, causing all photos and maps to show as placeholders when the report has more than 10 entries
2. **Address text overflow** - The multi-line addresses extend below the panel boundary because there's insufficient space between the thumbnails and panel bottom

## Root Cause Analysis

### Issue 1: Images Skipped
The logs confirm: `Skipping images for 23 entries (max 10) to avoid memory limits`

The memory optimization that was added to prevent the `WORKER_LIMIT` error is too aggressive. Since we're now fetching images on-demand per entry (not pre-loading all at once), we can safely increase this limit significantly.

### Issue 2: Address Overflow
Current layout math:
- Panel height: 120px
- Thumbnails at `panelHeight - 100 = 20px` from panel bottom
- Address starts at `thumbnailY - 10 = 10px` from panel bottom
- Each address line is 10px tall
- Max 4 lines = 40px total, going to -30px (below panel)

The address text has 4 lines × 10px = 40px of content trying to fit in only 10px of remaining space.

## Solution

### Fix 1: Remove or Significantly Increase Image Limit
Since images are fetched on-demand per entry (not all at once), memory usage is bounded. We can safely increase the limit or remove it entirely for reasonable report sizes.

**Change**: Increase `MAX_ENTRIES_FOR_IMAGES` from 10 to 50 in both edge functions.

### Fix 2: Adjust Panel Layout for Address Space
We need to reposition elements to ensure addresses fit within the panel:

**Option A (Recommended)**: Move thumbnails higher + reduce address line count
- Move thumbnails to `panelHeight - 80` (instead of -100) giving more space below
- Limit address to 2 lines max (instead of 4)
- This keeps cards at the same height

**Option B**: Increase panel height
- Would require increasing card height, affecting page layout

Going with Option A for minimal disruption.

## Implementation Tasks

### Task 1: Increase Image Limit in Both Functions
| File | Change |
|------|--------|
| `supabase/functions/send-test-report/index.ts` | Change `MAX_ENTRIES_FOR_IMAGES` from `10` to `50` |
| `supabase/functions/process-scheduled-reports/index.ts` | Same change |

### Task 2: Adjust Address Wrapping
| File | Change |
|------|--------|
| `supabase/functions/send-test-report/index.ts` | Change `wrapAddress` to return max 2 lines instead of 4 |
| `supabase/functions/process-scheduled-reports/index.ts` | Same change |

### Task 3: Move Thumbnails Up
Adjust thumbnail Y position to create more room for addresses:

```typescript
// Before:
const thumbnailY = clockInY + panelHeight - 100;  // 20px from bottom

// After:
const thumbnailY = clockInY + panelHeight - 75;   // 45px from bottom
```

This gives 35px for address (3+ lines at 10px each), but we'll limit to 2 lines for clean appearance.

### Task 4: Shorten Address Display
Modify the `wrapAddress` function:

```typescript
function wrapAddress(address: string, maxCharsPerLine: number = 22): string[] {
  if (!address) return ['No address'];
  const words = address.split(/[\s,]+/);
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  
  // Return max 2 lines, truncate last line with ellipsis if needed
  if (lines.length > 2) {
    lines[1] = lines[1].length > 18 ? lines[1].substring(0, 18) + '...' : lines[1] + '...';
    return lines.slice(0, 2);
  }
  return lines.slice(0, 2);
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Increase `MAX_ENTRIES_FOR_IMAGES` to 50, adjust `wrapAddress` to 2 lines, move thumbnails to `panelHeight - 75` |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes for consistency |

## Testing

After deployment:
1. Click "Test" on the Daily Time Report from the Reports page
2. Verify in the received PDF:
   - Employee photos appear in Clock In/Out panels
   - Mapbox map thumbnails show with colored pins
   - Addresses are contained within the panel (2 lines max)
   - Layout looks clean and consistent

