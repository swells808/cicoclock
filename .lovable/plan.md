

# Add Photo and Map Thumbnails to PDF Time Entry Cards

## Overview

The current PDF report shows text placeholders ("Photo" / "Map" boxes) instead of actual images. This plan will modify the edge functions to fetch and embed real photo thumbnails and Mapbox static map images in the PDF, matching the visual design shown on the tracking page.

## Current vs Target

| Element | Current | Target |
|---------|---------|--------|
| Photo indicator | Text "Photo" in colored box | Actual employee photo thumbnail (40x40px) |
| Map indicator | Text "Map" in colored box | Mapbox static map thumbnail (40x40px) |
| Missing data | Dashed border box | Dashed border placeholder with icon substitute |

## Technical Approach

### Image Embedding with pdf-lib

pdf-lib supports embedding images with:
```typescript
// Fetch image bytes
const imageBytes = await fetch(imageUrl).then(res => res.arrayBuffer());

// Embed based on format
const image = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
// or
const image = await pdfDoc.embedPng(new Uint8Array(imageBytes));

// Draw on page
page.drawImage(image, { x, y, width: 40, height: 40 });
```

### Photo URLs

The `timeclock-photos` bucket is private, requiring signed URL generation:
```typescript
const { data } = await supabase.storage
  .from('timeclock-photos')
  .createSignedUrl(photoPath, 300);
```

### Map URLs

Mapbox static API generates map thumbnails:
```typescript
const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
const pinColor = isClockIn ? '22c55e' : 'ef4444';
const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/48x48@2x?access_token=${mapboxToken}`;
```

## Implementation Tasks

### Task 1: Add Helper Functions for Image Fetching

Add helper functions to the edge function:

```typescript
// Generate signed URL for private storage bucket
async function getSignedUrl(supabase: any, bucket: string, path: string): Promise<string | null> {
  // Normalize path (remove bucket prefix if present)
  let cleanPath = path;
  if (path.startsWith(`${bucket}/`)) {
    cleanPath = path.replace(`${bucket}/`, '');
  }
  
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 300);
  if (error) {
    console.error(`Failed to sign ${bucket}/${cleanPath}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

// Resolve photo URL (handles full URLs vs storage paths)
async function resolvePhotoUrl(supabase: any, photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  
  // If already a full URL, return as-is
  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }
  
  return getSignedUrl(supabase, 'timeclock-photos', photoUrl);
}

// Generate Mapbox static map URL
function getMapUrl(latitude: number | null, longitude: number | null, isClockIn: boolean): string | null {
  if (!latitude || !longitude) return null;
  
  const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
  if (!mapboxToken) return null;
  
  const pinColor = isClockIn ? '22c55e' : 'ef4444';
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/48x48@2x?access_token=${mapboxToken}`;
}

// Fetch image and embed in PDF
async function fetchAndEmbedImage(pdfDoc: PDFDocument, imageUrl: string): Promise<PDFImage | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    
    if (bytes.length < 100) return null; // Skip if too small (likely error)
    
    if (contentType.includes('png')) {
      return await pdfDoc.embedPng(bytes);
    } else {
      return await pdfDoc.embedJpg(bytes);
    }
  } catch (error) {
    console.error('Failed to embed image:', error);
    return null;
  }
}
```

### Task 2: Pre-fetch All Images Before PDF Generation

Before generating the PDF, fetch all required images:

```typescript
// Pre-fetch all images for entries
interface EntryImages {
  clockInPhoto: PDFImage | null;
  clockOutPhoto: PDFImage | null;
  clockInMap: PDFImage | null;
  clockOutMap: PDFImage | null;
}

async function prefetchEntryImages(
  pdfDoc: PDFDocument,
  supabase: any,
  entries: TimeEntry[]
): Promise<Map<string, EntryImages>> {
  const imageMap = new Map<string, EntryImages>();
  
  for (const entry of entries) {
    const images: EntryImages = {
      clockInPhoto: null,
      clockOutPhoto: null,
      clockInMap: null,
      clockOutMap: null,
    };
    
    // Fetch clock in photo
    if (entry.clock_in_photo_url) {
      const url = await resolvePhotoUrl(supabase, entry.clock_in_photo_url);
      if (url) {
        images.clockInPhoto = await fetchAndEmbedImage(pdfDoc, url);
      }
    }
    
    // Fetch clock out photo
    if (entry.clock_out_photo_url) {
      const url = await resolvePhotoUrl(supabase, entry.clock_out_photo_url);
      if (url) {
        images.clockOutPhoto = await fetchAndEmbedImage(pdfDoc, url);
      }
    }
    
    // Fetch clock in map
    const clockInMapUrl = getMapUrl(entry.clock_in_latitude, entry.clock_in_longitude, true);
    if (clockInMapUrl) {
      images.clockInMap = await fetchAndEmbedImage(pdfDoc, clockInMapUrl);
    }
    
    // Fetch clock out map
    const clockOutMapUrl = getMapUrl(entry.clock_out_latitude, entry.clock_out_longitude, false);
    if (clockOutMapUrl) {
      images.clockOutMap = await fetchAndEmbedImage(pdfDoc, clockOutMapUrl);
    }
    
    imageMap.set(entry.id, images);
  }
  
  return imageMap;
}
```

### Task 3: Update generateTimeEntryDetailsPDF Function Signature

Pass the Supabase client to the PDF generator:

```typescript
async function generateTimeEntryDetailsPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string,
  supabase: any  // Add supabase client parameter
): Promise<Uint8Array>
```

### Task 4: Replace Text Placeholders with Actual Images

Modify the Clock In/Out panel rendering to draw images:

```typescript
// Inside the entry loop, after creating the PDF document:
const entryImages = await prefetchEntryImages(pdfDoc, supabase, entries);

// For each entry card:
const images = entryImages.get(entry.id);

// Photo thumbnail (40x40)
const photoBoxX = clockInX + 8;
const photoBoxY = indicatorY - 42;
const photoBoxSize = 40;

if (images?.clockInPhoto) {
  // Draw actual photo
  page.drawImage(images.clockInPhoto, {
    x: photoBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
  });
  // Add border
  page.drawRectangle({
    x: photoBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
} else {
  // Draw placeholder box with dashed border
  page.drawRectangle({
    x: photoBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  });
  page.drawText('Photo', {
    x: photoBoxX + 8,
    y: photoBoxY + 16,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

// Map thumbnail (40x40)
const mapBoxX = photoBoxX + photoBoxSize + 4;

if (images?.clockInMap) {
  page.drawImage(images.clockInMap, {
    x: mapBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
  });
  page.drawRectangle({
    x: mapBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
} else {
  page.drawRectangle({
    x: mapBoxX,
    y: photoBoxY,
    width: photoBoxSize,
    height: photoBoxSize,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  });
  page.drawText('Map', {
    x: mapBoxX + 12,
    y: photoBoxY + 16,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

// Same pattern for Clock Out panel...
```

### Task 5: Adjust Panel Layout for Images

Update panel dimensions to accommodate photo/map thumbnails side by side:
- Photo: 40x40px at left
- Map: 40x40px at right
- Total width needed: ~88px (40 + 4 gap + 40 + padding)

Current panel width is 110px, which is sufficient.

### Task 6: Update process-scheduled-reports Function

Apply the same changes to `supabase/functions/process-scheduled-reports/index.ts` to ensure automated reports also include images.

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Add image helpers, update PDF generation |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes for automated reports |

## Performance Considerations

1. **Parallel fetching**: Use `Promise.all` where possible to fetch multiple images concurrently
2. **Timeout handling**: Add timeouts for image fetches to prevent hanging
3. **Graceful degradation**: If an image fails to load, show placeholder instead of failing the entire report
4. **Image size**: Mapbox static API returns 96x96 (@2x), which will be scaled down to 40x40 for crisp display

## Testing

After implementation:
1. Click "Test" on the Daily Time Report from the Reports page
2. Open the received email and verify:
   - Employee photos appear in Clock In/Out panels
   - Mapbox map thumbnails show location with colored pins
   - Entries without photos/locations show placeholder boxes
   - Addresses still display below the thumbnails

