

# Solution: Match Browser's PDF Generation Strategy

## Why Browser Works But Edge Function Fails

| Aspect | Browser (`html2canvas` + `jsPDF`) | Edge Function (`pdf-lib`) |
|--------|----------------------------------|---------------------------|
| **Memory Model** | Process one card → render to canvas → compress → add image → garbage collect | Fetch all images → embed all → save PDF → all in memory |
| **Image Lifecycle** | Each entry's images released after canvas rendered | All images held until `pdfDoc.save()` |
| **Memory Growth** | Constant (~500KB peak) | Linear (entries × images × size) |
| **23 entries** | Works fine | WORKER_LIMIT crash |

The browser version renders each entry to an HTML container, captures it with `html2canvas` (which compresses it), adds the resulting PNG to jsPDF, then removes the container. Memory stays flat because only one card is processed at a time.

## Solution: Paginated PDF Generation with Streaming

Instead of building the entire PDF in memory, we'll generate one page at a time and concatenate them. However, `pdf-lib` doesn't support true streaming, so we need a different approach.

### Approach: Generate Multiple Small PDFs, Then Merge

1. **Split entries into chunks** (6 entries per chunk = ~24 images max)
2. **Generate a mini-PDF for each chunk** (fits in memory)
3. **Merge mini-PDFs** at the end using `pdf-lib`'s `copyPages`
4. **Discard mini-PDF after copying** (releases memory)

```typescript
const ENTRIES_PER_CHUNK = 6; // 6 entries × 4 images = 24 images max per chunk
const chunks = [];
for (let i = 0; i < entries.length; i += ENTRIES_PER_CHUNK) {
  chunks.push(entries.slice(i, i + ENTRIES_PER_CHUNK));
}

const finalPdf = await PDFDocument.create();

for (const chunk of chunks) {
  // Create temporary PDF with just this chunk's entries
  const tempPdf = await generateChunkPDF(chunk, ...);
  
  // Copy pages from temp to final
  const pages = await finalPdf.copyPages(tempPdf, tempPdf.getPageIndices());
  pages.forEach(page => finalPdf.addPage(page));
  
  // tempPdf goes out of scope, eligible for GC
}

return await finalPdf.save();
```

### Why This Works

- Each chunk PDF has at most 24 images (~300KB)
- After copying pages to the final PDF, the temp PDF can be garbage collected
- The final PDF only holds page references, not the original image bytes
- Memory stays bounded at ~500KB peak instead of growing to 4.6MB

## Implementation Plan

### Task 1: Create Chunk-Based PDF Generator Function

Create a helper that generates a PDF for a subset of entries:

```typescript
async function generateChunkPDF(
  entries: TimeEntry[],
  companyName: string,
  timezone: string,
  supabase: any,
  isFirstChunk: boolean,
  dateRange: { start: string; end: string }
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  // Only add header on first chunk
  // Always include images (chunk is small enough)
  // Return the PDFDocument for merging
  return pdfDoc;
}
```

### Task 2: Modify Main Generator to Use Chunking

```typescript
async function generateTimeEntryDetailsPDF(...): Promise<Uint8Array> {
  const ENTRIES_PER_CHUNK = 6;
  const chunks = [];
  for (let i = 0; i < entries.length; i += ENTRIES_PER_CHUNK) {
    chunks.push(entries.slice(i, i + ENTRIES_PER_CHUNK));
  }
  
  if (chunks.length === 1) {
    // Small report, generate directly
    return await generateSinglePDF(entries, ...);
  }
  
  // Large report, generate in chunks
  const finalPdf = await PDFDocument.create();
  
  for (let i = 0; i < chunks.length; i++) {
    console.info(`Processing chunk ${i + 1}/${chunks.length}`);
    const chunkPdf = await generateChunkPDF(chunks[i], ..., i === 0, ...);
    const pages = await finalPdf.copyPages(chunkPdf, chunkPdf.getPageIndices());
    pages.forEach(page => finalPdf.addPage(page));
  }
  
  return await finalPdf.save();
}
```

### Task 3: Handle Page Headers Correctly

- First chunk includes full report header
- Subsequent chunks start with a continuation header
- Page numbers span the entire document

### Task 4: Update Both Edge Functions

Apply the same chunking logic to:
- `supabase/functions/send-test-report/index.ts`
- `supabase/functions/process-scheduled-reports/index.ts`

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-test-report/index.ts` | Add chunked PDF generation with memory-bounded processing |
| `supabase/functions/process-scheduled-reports/index.ts` | Same changes for consistency |

## Memory Math

**Before (monolithic)**:
- 23 entries × 4 images × 50KB = 4.6MB (crashes)

**After (chunked)**:
- Chunk 1: 6 entries × 4 images × 50KB = 1.2MB → copy pages → GC
- Chunk 2: 6 entries × 4 images × 50KB = 1.2MB → copy pages → GC
- Chunk 3: 6 entries × 4 images × 50KB = 1.2MB → copy pages → GC
- Chunk 4: 5 entries × 4 images × 50KB = 1.0MB → copy pages → GC
- Peak memory: ~1.5MB (fits in Edge Function limit)

## Expected Result

After these changes:
- All 23 entries will have their photos and maps displayed
- Reports with 50+ entries will still generate successfully
- Memory usage stays bounded regardless of report size
- Layout matches the browser-generated PDF exactly

