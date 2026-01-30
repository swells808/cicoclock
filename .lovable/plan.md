

# Fix PDF Report: Images Missing & Address Overflow

## Problem Summary

1. **Images not appearing**: The report has 23 time entries, but `MAX_ENTRIES_FOR_IMAGES = 15` causes ALL images to be skipped
2. **Addresses truncated badly**: Text is cut off mid-word with only 2 lines allowed
3. **Memory constraint**: Cannot simply remove the limit as 92+ images will cause WORKER_LIMIT errors

## Solution Strategy: Per-Page Image Limiting

Instead of skipping images for the entire report when entry count exceeds threshold, we'll:
1. **Process images per page** - limit to ~6-8 entries with images per page (3 cards × 2-3 pages worth)
2. **Reduce Mapbox image size** - request 40x40 instead of 80x80@2x to cut image data by 75%
3. **Expand address display** - allow 3 lines with proper wrapping

## Technical Changes

### 1. Change from Report-Level to Page-Level Image Budget

```typescript
// Remove the old threshold check
// const includeImages = entries.length <= MAX_ENTRIES_FOR_IMAGES;

// Track images embedded per page
const MAX_IMAGES_PER_PAGE = 24; // ~6 entries × 4 images each
let imagesOnCurrentPage = 0;

// Reset counter when adding new page
if (yPosition - cardHeight < margin + 30) {
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  yPosition = pageHeight - margin;
  imagesOnCurrentPage = 0; // Reset for new page
}

// Check per-entry, not per-report
const canIncludeImages = imagesOnCurrentPage < MAX_IMAGES_PER_PAGE;
const images = canIncludeImages ? await fetchEntryImages(...) : null;

// Increment counter after embedding
if (images) {
  if (images.clockInPhoto) imagesOnCurrentPage++;
  if (images.clockInMap) imagesOnCurrentPage++;
  if (images.clockOutPhoto) imagesOnCurrentPage++;
  if (images.clockOutMap) imagesOnCurrentPage++;
}
```

### 2. Reduce Mapbox Image Size

Change from 80x80@2x (160×160 actual) to 48x48 (no @2x):

```typescript
function getMapUrl(latitude: number | null, longitude: number | null, isClockIn: boolean): string | null {
  // ... existing checks ...
  
  // Smaller size = less memory
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/48x48?access_token=${mapboxToken}`;
}
```

### 3. Improve Address Wrapping

```typescript
function wrapAddress(address: string, maxCharsPerLine: number = 20): string[] {
  if (!address) return ['No address'];
  
  // Clean up address formatting
  const cleanAddr = address.replace(/\s+/g, ' ').trim();
  const words = cleanAddr.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Return max 3 lines, add ellipsis only if needed
  if (lines.length > 3) {
    return [...lines.slice(0, 2), lines[2].substring(0, 16) + '...'];
  }
  return lines.slice(0, 3);
}
```

### 4. Adjust Panel Layout for 3 Address Lines

Current panel height is 120px. We need to adjust vertical spacing:

```typescript
// Thumbnails at fixed position from top (after time display)
const thumbnailY = clockInY + panelHeight - 70;  // Move up slightly

// Address text at fixed position from bottom
const addressBaseY = clockInY + 32; // 32px from panel bottom
// Draw 3 lines at addressBaseY, addressBaseY - 10, addressBaseY - 20
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Per-page image budget, smaller Mapbox images, better address wrapping |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes |

## Memory Math

**Before**: 23 entries × 4 images × ~50KB each = ~4.6MB (hits limit)

**After**: 
- Max 24 images per page × ~12KB each (smaller Mapbox) = ~300KB per page
- Pages process and flush, memory doesn't accumulate
- Report generates successfully with images on every page

## Expected Result

After these changes:
- Employee photos will appear in Clock In/Out panels
- Mapbox maps will show location pins
- Addresses will display 3 readable lines (e.g., "401 East Sunset Road, Henderson, Nevada...")
- Reports with 50+ entries will still generate successfully

