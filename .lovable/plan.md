

# Rich Time Entry Details Report with Photos, Maps, and Timeline Bars

## Problem
The Time Entry Details report popup currently shows a simple HTML table with basic text data. The user wants it to match the inline `TimeEntryTimelineCard` component display, including:
1. Clock-in and clock-out photos
2. Mini maps showing location
3. Color-coded timeline bars (regular, late, overtime, break)
4. Address information
5. Status badges

The PDF export should also include photos and visual elements, while the CSV export should remain text-only (as photos cannot be embedded in CSV files).

## Solution Overview
1. Fetch additional data (photos, coordinates, addresses) when generating the Time Entry Details report
2. Build a rich HTML representation that mirrors `TimeEntryTimelineCard` for the popup preview
3. Generate signed URLs for photos and convert them to base64 for PDF embedding
4. Use `html2canvas` and `jspdf` to render the visual timeline cards into the PDF
5. Keep CSV export as simple tabular data (no changes needed)

---

## Technical Changes

### File 1: `src/pages/Reports.tsx`

**Change 1: Update the time_entries query to fetch all required fields**

Modify the timecard report query to include photo URLs and coordinates:

```typescript
const { data: timeEntries } = await supabase
  .from('time_entries')
  .select(`
    id, user_id, profile_id, start_time, end_time, duration_minutes,
    clock_in_photo_url, clock_out_photo_url,
    clock_in_latitude, clock_in_longitude,
    clock_out_latitude, clock_out_longitude,
    clock_in_address, clock_out_address,
    is_break,
    projects(name)
  `)
  .eq('company_id', companyId)
  .gte('start_time', start.toISOString())
  .lte('start_time', end.toISOString())
  .order('start_time', { ascending: false });
```

**Change 2: Fetch signed URLs for photos before rendering**

Add a function to fetch signed URLs for all entries:

```typescript
// Fetch signed URLs for all photo paths
async function fetchSignedPhotoUrls(entries: any[]) {
  const updatedEntries = await Promise.all(entries.map(async (entry) => {
    let signedClockInUrl = null;
    let signedClockOutUrl = null;

    if (entry.clock_in_photo_url && !entry.clock_in_photo_url.startsWith('http')) {
      const { data } = await supabase.storage
        .from('timeclock-photos')
        .createSignedUrl(entry.clock_in_photo_url, 3600);
      signedClockInUrl = data?.signedUrl || null;
    } else if (entry.clock_in_photo_url) {
      signedClockInUrl = entry.clock_in_photo_url;
    }

    if (entry.clock_out_photo_url && !entry.clock_out_photo_url.startsWith('http')) {
      const { data } = await supabase.storage
        .from('timeclock-photos')
        .createSignedUrl(entry.clock_out_photo_url, 3600);
      signedClockOutUrl = data?.signedUrl || null;
    } else if (entry.clock_out_photo_url) {
      signedClockOutUrl = entry.clock_out_photo_url;
    }

    return {
      ...entry,
      signedClockInUrl,
      signedClockOutUrl
    };
  }));

  return updatedEntries;
}
```

**Change 3: Create a rich HTML builder that mirrors TimeEntryTimelineCard**

Replace `buildTimeEntryDetailsHTML` with a new function that generates rich visual cards:

```typescript
function buildTimeEntryDetailsRichHTML(entries: any[]): string {
  const mapboxToken = localStorage.getItem("mapbox_public_token");
  
  let html = '<div style="font-family: sans-serif;">';
  
  entries.forEach((entry, index) => {
    const clockInTime = new Date(entry.start_time);
    const clockOutTime = entry.end_time ? new Date(entry.end_time) : null;
    const isActive = !entry.end_time;
    
    // Format duration
    const durationStr = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
      : '—';
    
    // Build mini map URLs
    const clockInMapUrl = entry.clock_in_latitude && entry.clock_in_longitude && mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+22c55e(${entry.clock_in_longitude},${entry.clock_in_latitude})/${entry.clock_in_longitude},${entry.clock_in_latitude},15/64x64@2x?access_token=${mapboxToken}`
      : null;
    
    const clockOutMapUrl = entry.clock_out_latitude && entry.clock_out_longitude && mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${entry.clock_out_longitude},${entry.clock_out_latitude})/${entry.clock_out_longitude},${entry.clock_out_latitude},15/64x64@2x?access_token=${mapboxToken}`
      : null;

    html += `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; overflow: hidden; background: white;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-weight: 600; font-size: 14px;">${format(clockInTime, 'EEEE, MMM d')}</span>
            <span style="color: #6b7280;">•</span>
            <span style="font-weight: 500; font-size: 14px;">${entry.employeeName}</span>
            ${entry.projectName ? `<span style="color: #6b7280;">•</span><span style="font-size: 14px; color: #6b7280;">${entry.projectName}</span>` : ''}
            <span style="background: ${entry.is_break ? '#f3f4f6' : '#3b82f6'}; color: ${entry.is_break ? '#374151' : 'white'}; padding: 2px 8px; border-radius: 9999px; font-size: 12px;">${entry.is_break ? 'Break' : 'Work'}</span>
            <span style="background: ${isActive ? '#fef3c7' : '#dcfce7'}; color: ${isActive ? '#92400e' : '#166534'}; padding: 2px 8px; border-radius: 9999px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
              ${isActive ? '⏱ Active' : '✓ Complete'}
            </span>
          </div>
          <span style="font-size: 14px; font-weight: 500;">Duration: ${durationStr}</span>
        </div>
        
        <!-- Content with panels and timeline -->
        <div style="display: flex; align-items: stretch; gap: 16px; padding: 16px;">
          
          <!-- Clock In Panel -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: 8px; background: #dcfce7; min-width: 100px;">
            <span style="font-size: 12px; font-weight: 500; color: #166534;">Clock In</span>
            <span style="font-size: 14px; font-weight: 700; color: #166534;">${format(clockInTime, 'h:mm a')}</span>
            <div style="display: flex; gap: 4px;">
              ${entry.signedClockInUrl 
                ? `<img src="${entry.signedClockInUrl}" alt="Clock In" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 10px;">No photo</span></div>`
              }
              ${clockInMapUrl 
                ? `<img src="${clockInMapUrl}" alt="Location" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 10px;">No map</span></div>`
              }
            </div>
            ${entry.clock_in_address ? `<p style="font-size: 10px; color: #6b7280; max-width: 100px; text-align: center; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_in_address}</p>` : ''}
          </div>
          
          <!-- Timeline Bar (simplified for HTML/print) -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="position: relative; height: 32px; background: #f3f4f6; border-radius: 6px; overflow: hidden;">
              <!-- Simple work segment -->
              <div style="position: absolute; top: 4px; bottom: 4px; left: 10%; right: 10%; background: ${entry.is_break ? '#14b8a6' : '#3b82f6'}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 10px; color: white; font-weight: 500;">${entry.is_break ? 'Break' : 'Working'}</span>
              </div>
            </div>
          </div>
          
          <!-- Clock Out Panel -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: 8px; background: ${isActive ? '#f3f4f6' : '#fee2e2'}; min-width: 100px;">
            <span style="font-size: 12px; font-weight: 500; color: ${isActive ? '#6b7280' : '#991b1b'};">Clock Out</span>
            <span style="font-size: 14px; font-weight: 700; color: ${isActive ? '#6b7280' : '#991b1b'};">${clockOutTime ? format(clockOutTime, 'h:mm a') : '—'}</span>
            <div style="display: flex; gap: 4px;">
              ${entry.signedClockOutUrl 
                ? `<img src="${entry.signedClockOutUrl}" alt="Clock Out" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 10px;">No photo</span></div>`
              }
              ${clockOutMapUrl 
                ? `<img src="${clockOutMapUrl}" alt="Location" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 10px;">No map</span></div>`
              }
            </div>
            ${entry.clock_out_address ? `<p style="font-size: 10px; color: #6b7280; max-width: 100px; text-align: center; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_out_address}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}
```

**Change 4: Update the Time Entry Details PDF export to use html2canvas**

Replace `exportTimeEntryDetailsAsPDF` with a visual rendering approach:

```typescript
async function exportTimeEntryDetailsAsPDF(entries: any[], dateRange: string) {
  const jsPDFImport = await import("jspdf");
  await import("jspdf-autotable");
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default;
  
  const { jsPDF } = jsPDFImport;
  const doc = new jsPDF('portrait', 'pt', 'a4');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let yPosition = margin;
  
  // Title
  doc.setFontSize(18);
  doc.text(`Time Entry Details Report`, margin, yPosition);
  yPosition += 20;
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(dateRange, margin, yPosition);
  doc.text(`${entries.length} entries`, pageWidth - margin - 60, yPosition);
  doc.setTextColor(0);
  yPosition += 30;
  
  // Render each entry as a card
  for (const entry of entries) {
    // Create temporary container for this entry
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; left: -9999px; top: -9999px; width: 520px; background: white; font-family: sans-serif;';
    container.innerHTML = buildSingleEntryCardHTML(entry);
    document.body.appendChild(container);
    
    // Wait for images to load
    const images = container.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete) resolve(true);
        else {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        }
      });
    }));
    
    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    container.remove();
    
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Check if we need a new page
    if (yPosition + imgHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, yPosition, imgWidth, imgHeight);
    yPosition += imgHeight + 15;
  }
  
  doc.save(`time-entry-details-${dateRange.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}

// Helper to build a single entry card HTML for PDF rendering
function buildSingleEntryCardHTML(entry: any): string {
  const mapboxToken = localStorage.getItem("mapbox_public_token");
  const clockInTime = new Date(entry.start_time);
  const clockOutTime = entry.end_time ? new Date(entry.end_time) : null;
  const isActive = !entry.end_time;
  const durationStr = entry.duration_minutes 
    ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
    : '—';
  
  const clockInMapUrl = entry.clock_in_latitude && entry.clock_in_longitude && mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+22c55e(${entry.clock_in_longitude},${entry.clock_in_latitude})/${entry.clock_in_longitude},${entry.clock_in_latitude},15/48x48@2x?access_token=${mapboxToken}`
    : null;
  
  const clockOutMapUrl = entry.clock_out_latitude && entry.clock_out_longitude && mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${entry.clock_out_longitude},${entry.clock_out_latitude})/${entry.clock_out_longitude},${entry.clock_out_latitude},15/48x48@2x?access_token=${mapboxToken}`
    : null;

  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-weight: 600;">${format(clockInTime, 'EEE, MMM d')}</span>
          <span style="color: #6b7280;">•</span>
          <span style="font-weight: 500;">${entry.employeeName}</span>
          <span style="background: ${entry.is_break ? '#e5e7eb' : '#3b82f6'}; color: ${entry.is_break ? '#374151' : 'white'}; padding: 2px 6px; border-radius: 9999px; font-size: 10px;">${entry.is_break ? 'Break' : 'Work'}</span>
        </div>
        <span style="font-weight: 500;">Duration: ${durationStr}</span>
      </div>
      <div style="display: flex; align-items: stretch; gap: 12px; padding: 12px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 6px; background: #dcfce7; min-width: 80px;">
          <span style="font-size: 10px; font-weight: 500; color: #166534;">Clock In</span>
          <span style="font-size: 12px; font-weight: 700; color: #166534;">${format(clockInTime, 'h:mm a')}</span>
          <div style="display: flex; gap: 4px;">
            ${entry.signedClockInUrl 
              ? `<img src="${entry.signedClockInUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px;"></div>'
            }
            ${clockInMapUrl 
              ? `<img src="${clockInMapUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px;"></div>'
            }
          </div>
        </div>
        <div style="flex: 1; display: flex; align-items: center;">
          <div style="width: 100%; height: 24px; background: #f3f4f6; border-radius: 4px; position: relative;">
            <div style="position: absolute; top: 3px; bottom: 3px; left: 5%; right: 5%; background: ${entry.is_break ? '#14b8a6' : '#3b82f6'}; border-radius: 3px;"></div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 6px; background: ${isActive ? '#f3f4f6' : '#fee2e2'}; min-width: 80px;">
          <span style="font-size: 10px; font-weight: 500; color: ${isActive ? '#6b7280' : '#991b1b'};">Clock Out</span>
          <span style="font-size: 12px; font-weight: 700; color: ${isActive ? '#6b7280' : '#991b1b'};">${clockOutTime ? format(clockOutTime, 'h:mm a') : '—'}</span>
          <div style="display: flex; gap: 4px;">
            ${entry.signedClockOutUrl 
              ? `<img src="${entry.signedClockOutUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px;"></div>'
            }
            ${clockOutMapUrl 
              ? `<img src="${clockOutMapUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px;"></div>'
            }
          </div>
        </div>
      </div>
    </div>
  `;
}
```

**Change 5: Update the popup renderer for Time Entry Details**

Create a specialized popup renderer for the rich Time Entry Details view:

```typescript
function renderTimeEntryDetailsPopup(
  newWin: Window, 
  title: string, 
  entries: any[],
  dateInfo: string
) {
  const richHtml = buildTimeEntryDetailsRichHTML(entries);
  
  const style = `
    <style>
      body { font-family: sans-serif; background: #F6F6F7; margin:0; padding:24px; }
      .download-btn {
        margin-right: 12px;
        padding: 10px 16px; border: none; border-radius:6px;
        font-size: 14px; background: #3b82f6; color: #fff; cursor: pointer;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .download-btn:hover { background: #2563eb; }
      .download-btn.csv { background: #059669; }
      .download-btn.csv:hover { background: #047857; }
      h2 { margin-bottom: 8px; }
      .export-bar { margin-bottom: 20px; }
      .entry-count { color: #666; margin-bottom: 16px; margin-top: 0; }
      .loading-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255,255,255,0.9); display: none;
        justify-content: center; align-items: center; z-index: 1000;
        flex-direction: column; gap: 12px;
      }
      .loading-overlay.active { display: flex; }
      .spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; 
                 border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `;

  const html = `
    <html>
      <head><title>${title}</title>${style}</head>
      <body>
        <div class="loading-overlay" id="loading">
          <div class="spinner"></div>
          <span>Generating PDF with photos...</span>
        </div>
        <h2>${title}</h2>
        <p class="entry-count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</p>
        <div class="export-bar">
          <button class="download-btn" id="btn-pdf">
            📄 Save as PDF (with photos)
          </button>
          <button class="download-btn csv" id="btn-csv">
            📊 Save as CSV
          </button>
        </div>
        ${richHtml}
        <script>
          document.getElementById('btn-pdf').onclick = function() {
            document.getElementById('loading').classList.add('active');
            if (window.opener && window.opener.exportReportPDF) {
              window.opener.exportReportPDF('timecard');
            }
            setTimeout(function() {
              document.getElementById('loading').classList.remove('active');
            }, 5000);
          };
          document.getElementById('btn-csv').onclick = function() {
            if (window.opener && window.opener.exportReportCSV) {
              window.opener.exportReportCSV('timecard');
            }
          };
        </script>
      </body>
    </html>
  `;
  
  newWin.document.write(html);
  newWin.document.close();
}
```

**Change 6: Update handleGenerateReport to use the new functions**

In the `timecard` report type handling:

```typescript
if (filters.reportType === 'timecard') {
  // ... existing date setup and query (updated with all fields)
  
  // Fetch signed URLs for photos
  entries = await fetchSignedPhotoUrls(entries);
  
  // Use the rich popup renderer
  renderTimeEntryDetailsPopup(newWin, title, entries, dateRangeStr);
  
  // Store data for exports
  (window as any).currentReportData = { entries, dateInfo: dateRangeStr, reportType: 'timecard' };
  (window as any).exportReportPDF = async (type: string) => {
    if (type === 'timecard') {
      await exportTimeEntryDetailsAsPDF((window as any).currentReportData.entries, (window as any).currentReportData.dateInfo);
    }
    // ... other types
  };
  (window as any).exportReportCSV = (type: string) => {
    if (type === 'timecard') {
      exportTimeEntryDetailsAsCSV((window as any).currentReportData.entries);
    }
    // ... other types
  };
  
  return;
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Update time_entries query to include all photo/location fields |
| `src/pages/Reports.tsx` | Add `fetchSignedPhotoUrls` function to get signed URLs |
| `src/pages/Reports.tsx` | Replace `buildTimeEntryDetailsHTML` with `buildTimeEntryDetailsRichHTML` that renders cards with photos, maps, and timeline |
| `src/pages/Reports.tsx` | Update `exportTimeEntryDetailsAsPDF` to use html2canvas for visual rendering |
| `src/pages/Reports.tsx` | Add `buildSingleEntryCardHTML` helper for PDF rendering |
| `src/pages/Reports.tsx` | Add `renderTimeEntryDetailsPopup` for the rich popup view |
| `src/pages/Reports.tsx` | Update handleGenerateReport to fetch photo URLs and use new renderers |

---

## Expected Behavior After Changes

| Action | Result |
|--------|--------|
| Generate "Time Entry Details" report | Opens popup showing rich cards with photos, maps, timeline bars |
| Click "Save as PDF" | Generates PDF with each entry as a visual card including photos and maps |
| Click "Save as CSV" | Downloads simple tabular CSV (unchanged - no photos) |

## Visual Preview in Popup and PDF Will Include:
- Header with date, employee name, project, work/break badge, status
- Clock In panel: time, photo thumbnail, mini map, address
- Timeline bar: color-coded work segment
- Clock Out panel: time, photo thumbnail, mini map, address

## Notes
- Photos require signed URLs from Supabase storage (fetched before rendering)
- Maps use Mapbox static image API (requires token in localStorage)
- PDF generation may take a few seconds for entries with many photos
- CSV export remains simple text data (photos cannot be embedded in CSV)

