import React, { useState, useRef } from "react";
import {
  Clock,
  FolderOpen,
  ArrowUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useReports } from "@/hooks/useReports";
import { ReportFilters, ReportFiltersValues } from "@/components/reports/ReportFilters";
import { buildRealTableHTML } from "@/utils/reportUtils";
import { DailyTimecardReport } from "@/components/reports/DailyTimecardReport";
import { ScheduledReportsManager } from "@/components/reports/ScheduledReportsManager";
import { TimeEntryDetailsReport } from "@/components/reports/TimeEntryDetailsReport";
import { format } from "date-fns";

// --- Timeline Segment Calculation Helper ---

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
    return Math.max(0, Math.min(100, ((hour - timelineStartHour) / totalHours) * 100));
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
  
  // Late segment (gap from scheduled start to actual clock-in)
  if (isLateByMoreThan10 && !isBreak) {
    const startPct = getPositionPercent(scheduledStartHour);
    const endPct = getPositionPercent(clockInHour);
    const widthPct = endPct - startPct;
    if (widthPct > 0) {
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${widthPct}%; background: ${colors.late}; border-radius: 3px;" title="Late"></div>`;
    }
  }
  
  // Main segment(s)
  if (isBreak) {
    const startPct = getPositionPercent(clockInHour);
    const endPct = getPositionPercent(clockOutHour);
    const widthPct = Math.max(endPct - startPct, 1);
    segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${widthPct}%; background: ${colors.break}; border-radius: 3px;"></div>`;
  } else {
    const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
    const scheduledEndMinutes = scheduledEndHour * 60;
    
    if (clockInMinutes >= scheduledEndMinutes) {
      // Entire entry is overtime
      const startPct = getPositionPercent(clockInHour);
      const endPct = getPositionPercent(clockOutHour);
      const widthPct = Math.max(endPct - startPct, 1);
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${widthPct}%; background: ${colors.overtime}; border-radius: 3px;"></div>`;
    } else if (clockOutMinutes > scheduledEndMinutes) {
      // Spans into overtime - split into regular + overtime
      const scheduledEndHourFloat = scheduledEndMinutes / 60;
      const regularStart = getPositionPercent(clockInHour);
      const regularEnd = getPositionPercent(scheduledEndHourFloat);
      const regularWidth = Math.max(regularEnd - regularStart, 1);
      const overtimeStart = getPositionPercent(scheduledEndHourFloat);
      const overtimeEnd = getPositionPercent(clockOutHour);
      const overtimeWidth = Math.max(overtimeEnd - overtimeStart, 1);
      
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${regularStart}%; width: ${regularWidth}%; background: ${colors.regular}; border-radius: 3px 0 0 3px;"></div>`;
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${overtimeStart}%; width: ${overtimeWidth}%; background: ${colors.overtime}; border-radius: 0 3px 3px 0;"></div>`;
    } else {
      // Regular work within scheduled hours
      const startPct = getPositionPercent(clockInHour);
      const endPct = getPositionPercent(clockOutHour);
      const widthPct = Math.max(endPct - startPct, 1);
      segmentsHTML += `<div style="position: absolute; top: 4px; bottom: 4px; left: ${startPct}%; width: ${widthPct}%; background: ${colors.regular}; border-radius: 3px;"></div>`;
    }
  }
  
  return segmentsHTML;
}

// Build enhanced timeline HTML with hour labels, tick marks, and legend
function buildEnhancedTimelineHTML(startTime: Date, endTime: Date | null, isBreak: boolean): string {
  const segments = calculateTimelineSegmentsHTML(startTime, endTime, isBreak);
  
  // Hour label positions (6am to 8pm = 14 hours, so each 2-hour interval is 100/7 ≈ 14.29%)
  const hourLabels = `
    <div style="position: relative; height: 14px; margin-bottom: 4px;">
      <span style="position: absolute; left: 0%; font-size: 9px; color: #6b7280;">6am</span>
      <span style="position: absolute; left: 14.29%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">8am</span>
      <span style="position: absolute; left: 28.57%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">10am</span>
      <span style="position: absolute; left: 42.86%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">12pm</span>
      <span style="position: absolute; left: 57.14%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">2pm</span>
      <span style="position: absolute; left: 71.43%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">4pm</span>
      <span style="position: absolute; left: 85.71%; font-size: 9px; color: #6b7280; transform: translateX(-50%);">6pm</span>
      <span style="position: absolute; right: 0%; font-size: 9px; color: #6b7280;">8pm</span>
    </div>
  `;
  
  // Tick marks at 2-hour intervals inside the bar
  const tickMarks = `
    <div style="position: absolute; left: 14.29%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
    <div style="position: absolute; left: 28.57%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
    <div style="position: absolute; left: 42.86%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
    <div style="position: absolute; left: 57.14%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
    <div style="position: absolute; left: 71.43%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
    <div style="position: absolute; left: 85.71%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>
  `;
  
  // Scheduled range indicator (8am = 14.29%, 5pm = 78.57%, width = 64.28%)
  const scheduledRange = `
    <div style="position: absolute; left: 14.29%; width: 64.28%; top: 0; bottom: 0; border-left: 2px dashed rgba(59, 130, 246, 0.4); border-right: 2px dashed rgba(59, 130, 246, 0.4); pointer-events: none;"></div>
  `;
  
  // Color legend
  const legend = `
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
  `;
  
  return `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 200px;">
      ${hourLabels}
      <div style="position: relative; height: 28px; background: #f3f4f6; border-radius: 6px; overflow: visible;">
        ${tickMarks}
        ${scheduledRange}
        ${segments}
      </div>
      ${legend}
    </div>
  `;
}

// --- Export Utility Functions ---

// Export Daily Timecard as CSV
function exportDailyTimecardAsCSV(entries: any[]) {
  const columns = ["Employee", "Employee Number", "Project", "Clock In", "Clock Out", "Duration"];
  let csv = columns.join(",") + "\n";
  csv += entries.map(entry => {
    const clockIn = entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-';
    const clockOut = entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active';
    const duration = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
      : '-';
    return [
      `"${entry.employeeName}"`,
      `"${entry.employeeNumber || ''}"`,
      `"${entry.projectName || 'No Project'}"`,
      clockIn,
      clockOut,
      duration
    ].join(",");
  }).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-timecard-report.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// Export Time Entry Details as CSV
function exportTimeEntryDetailsAsCSV(entries: any[]) {
  const columns = ["Employee", "Employee Number", "Date", "Project", "Clock In", "Clock Out", "Duration", "Clock In Address", "Clock Out Address"];
  let csv = columns.join(",") + "\n";
  csv += entries.map(entry => {
    const date = format(new Date(entry.start_time), 'MMM d, yyyy');
    const clockIn = format(new Date(entry.start_time), 'h:mm a');
    const clockOut = entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active';
    const duration = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
      : '-';
    return [
      `"${entry.employeeName}"`,
      `"${entry.employeeNumber || ''}"`,
      date,
      `"${entry.projectName || 'No Project'}"`,
      clockIn,
      clockOut,
      duration,
      `"${entry.clock_in_address || ''}"`,
      `"${entry.clock_out_address || ''}"`
    ].join(",");
  }).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "time-entry-details-report.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// Export Daily Timecard as PDF
function exportDailyTimecardAsPDF(entries: any[], dateStr: string) {
  // @ts-ignore
  import("jspdf").then(jsPDFImport => {
    // @ts-ignore
    import("jspdf-autotable").then(() => {
      const { jsPDF } = jsPDFImport;
      const doc = new jsPDF();
      const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
      
      doc.setFontSize(16);
      doc.text(`Daily Timecard Report - ${dateStr}`, 14, 16);
      
      // @ts-ignore
      doc.autoTable({
        startY: 25,
        head: [columns],
        body: entries.map(entry => [
          entry.employeeName,
          entry.projectName || 'No Project',
          entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-',
          entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active',
          entry.duration_minutes 
            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
            : '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      doc.save(`daily-timecard-${dateStr.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    });
  });
}

// Export Time Entry Details as PDF with photos and visual cards
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
          ${entry.projectName ? `<span style="color: #6b7280;">•</span><span style="color: #6b7280;">${entry.projectName}</span>` : ''}
          <span style="background: ${entry.is_break ? '#e5e7eb' : '#3b82f6'}; color: ${entry.is_break ? '#374151' : 'white'}; padding: 2px 6px; border-radius: 9999px; font-size: 10px;">${entry.is_break ? 'Break' : 'Work'}</span>
          <span style="background: ${isActive ? '#fef3c7' : '#dcfce7'}; color: ${isActive ? '#92400e' : '#166534'}; padding: 2px 6px; border-radius: 9999px; font-size: 10px;">${isActive ? '⏱ Active' : '✓ Complete'}</span>
        </div>
        <span style="font-weight: 500;">Duration: ${durationStr}</span>
      </div>
      <div style="display: flex; align-items: stretch; gap: 12px; padding: 12px;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 6px; background: #dcfce7; min-width: 90px;">
          <span style="font-size: 10px; font-weight: 500; color: #166534;">Clock In</span>
          <span style="font-size: 12px; font-weight: 700; color: #166534;">${format(clockInTime, 'h:mm a')}</span>
          <div style="display: flex; gap: 4px;">
            ${entry.signedClockInUrl 
              ? `<img src="${entry.signedClockInUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; border: 1px dashed #d1d5db;"></div>'
            }
            ${clockInMapUrl 
              ? `<img src="${clockInMapUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; border: 1px dashed #d1d5db;"></div>'
            }
          </div>
          ${entry.clock_in_address ? `<p style="font-size: 9px; color: #6b7280; max-width: 90px; text-align: center; margin: 2px 0 0; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_in_address}</p>` : ''}
        </div>
        ${buildEnhancedTimelineHTML(clockInTime, clockOutTime, entry.is_break)}
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; border-radius: 6px; background: ${isActive ? '#f3f4f6' : '#fee2e2'}; min-width: 90px;">
          <span style="font-size: 10px; font-weight: 500; color: ${isActive ? '#6b7280' : '#991b1b'};">Clock Out</span>
          <span style="font-size: 12px; font-weight: 700; color: ${isActive ? '#6b7280' : '#991b1b'};">${clockOutTime ? format(clockOutTime, 'h:mm a') : '—'}</span>
          <div style="display: flex; gap: 4px;">
            ${entry.signedClockOutUrl 
              ? `<img src="${entry.signedClockOutUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; border: 1px dashed #d1d5db;"></div>'
            }
            ${clockOutMapUrl 
              ? `<img src="${clockOutMapUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" crossorigin="anonymous" />`
              : '<div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 4px; border: 1px dashed #d1d5db;"></div>'
            }
          </div>
          ${entry.clock_out_address ? `<p style="font-size: 9px; color: #6b7280; max-width: 90px; text-align: center; margin: 2px 0 0; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_out_address}</p>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Build Daily Timecard HTML table
function buildDailyTimecardHTML(entries: any[]): string {
  const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
  let table = "<table border='1' style='border-collapse:collapse;width:100%;font-family:sans-serif;'>";
  table += "<thead><tr>" + columns.map(col => 
    `<th style='padding:10px;background:#F6F6F7;text-align:left;'>${col}</th>`
  ).join("") + "</tr></thead><tbody>";
  
  if (entries.length === 0) {
    table += `<tr><td colspan='${columns.length}' style='padding:20px;text-align:center;color:#666;'>No time entries for this period</td></tr>`;
  } else {
    table += entries.map((entry, i) => {
      const bgColor = i % 2 === 0 ? '#fff' : '#fafafa';
      return `<tr style='background:${bgColor}'>
        <td style='padding:10px;'>${entry.employeeName}</td>
        <td style='padding:10px;'>${entry.projectName || 'No Project'}</td>
        <td style='padding:10px;'>${entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-'}</td>
        <td style='padding:10px;'>${entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}</td>
        <td style='padding:10px;'>${entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : '-'}</td>
      </tr>`;
    }).join("");
  }
  
  table += "</tbody></table>";
  return table;
}

// Build rich Time Entry Details HTML with photos, maps, and timeline
function buildTimeEntryDetailsRichHTML(entries: any[]): string {
  const mapboxToken = localStorage.getItem("mapbox_public_token");
  
  let html = '<div style="font-family: sans-serif;">';
  
  if (entries.length === 0) {
    html += '<div style="padding: 40px; text-align: center; color: #666; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">No time entries for this period</div>';
    html += '</div>';
    return html;
  }
  
  entries.forEach((entry) => {
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
            <span style="background: ${isActive ? '#fef3c7' : '#dcfce7'}; color: ${isActive ? '#92400e' : '#166534'}; padding: 2px 8px; border-radius: 9999px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
              ${isActive ? '⏱ Active' : '✓ Complete'}
            </span>
          </div>
          <span style="font-size: 14px; font-weight: 500;">Duration: ${durationStr}</span>
        </div>
        
        <!-- Content with panels and timeline -->
        <div style="display: flex; align-items: stretch; gap: 16px; padding: 16px;">
          
          <!-- Clock In Panel -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: 8px; background: #dcfce7; min-width: 110px;">
            <span style="font-size: 12px; font-weight: 500; color: #166534;">Clock In</span>
            <span style="font-size: 14px; font-weight: 700; color: #166534;">${format(clockInTime, 'h:mm a')}</span>
            <div style="display: flex; gap: 4px;">
              ${entry.signedClockInUrl 
                ? `<img src="${entry.signedClockInUrl}" alt="Clock In" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 9px;">No photo</span></div>`
              }
              ${clockInMapUrl 
                ? `<img src="${clockInMapUrl}" alt="Location" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 9px;">No map</span></div>`
              }
            </div>
            ${entry.clock_in_address ? `<p style="font-size: 10px; color: #6b7280; max-width: 110px; text-align: center; margin: 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_in_address}</p>` : ''}
          </div>
          
          <!-- Enhanced Timeline Bar -->
          ${buildEnhancedTimelineHTML(clockInTime, clockOutTime, entry.is_break)}
          
          <!-- Clock Out Panel -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: 8px; background: ${isActive ? '#f3f4f6' : '#fee2e2'}; min-width: 110px;">
            <span style="font-size: 12px; font-weight: 500; color: ${isActive ? '#6b7280' : '#991b1b'};">Clock Out</span>
            <span style="font-size: 14px; font-weight: 700; color: ${isActive ? '#6b7280' : '#991b1b'};">${clockOutTime ? format(clockOutTime, 'h:mm a') : '—'}</span>
            <div style="display: flex; gap: 4px;">
              ${entry.signedClockOutUrl 
                ? `<img src="${entry.signedClockOutUrl}" alt="Clock Out" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 9px;">No photo</span></div>`
              }
              ${clockOutMapUrl 
                ? `<img src="${clockOutMapUrl}" alt="Location" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" crossorigin="anonymous" />`
                : `<div style="width: 48px; height: 48px; border: 1px dashed #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;"><span style="color: #9ca3af; font-size: 9px;">No map</span></div>`
              }
            </div>
            ${entry.clock_out_address ? `<p style="font-size: 10px; color: #6b7280; max-width: 110px; text-align: center; margin: 0; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${entry.clock_out_address}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

// Render Time Entry Details popup with rich visual cards
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
          };
          document.getElementById('btn-csv').onclick = function() {
            if (window.opener && window.opener.exportReportCSV) {
              window.opener.exportReportCSV('timecard');
            }
          };
          // Listen for PDF completion message
          window.addEventListener('message', function(e) {
            if (e.data === 'pdf-complete') {
              document.getElementById('loading').classList.remove('active');
            }
          });
        </script>
      </body>
    </html>
  `;
  
  newWin.document.write(html);
  newWin.document.close();
}

// Fetch signed URLs for all photo paths
async function fetchSignedPhotoUrls(entries: any[]) {
  const updatedEntries = await Promise.all(entries.map(async (entry) => {
    let signedClockInUrl = null;
    let signedClockOutUrl = null;

    if (entry.clock_in_photo_url) {
      if (entry.clock_in_photo_url.startsWith('http')) {
        signedClockInUrl = entry.clock_in_photo_url;
      } else {
        let cleanPath = entry.clock_in_photo_url;
        if (cleanPath.startsWith('timeclock-photos/')) {
          cleanPath = cleanPath.replace('timeclock-photos/', '');
        }
        const { data } = await supabase.storage
          .from('timeclock-photos')
          .createSignedUrl(cleanPath, 3600);
        signedClockInUrl = data?.signedUrl || null;
      }
    }

    if (entry.clock_out_photo_url) {
      if (entry.clock_out_photo_url.startsWith('http')) {
        signedClockOutUrl = entry.clock_out_photo_url;
      } else {
        let cleanPath = entry.clock_out_photo_url;
        if (cleanPath.startsWith('timeclock-photos/')) {
          cleanPath = cleanPath.replace('timeclock-photos/', '');
        }
        const { data } = await supabase.storage
          .from('timeclock-photos')
          .createSignedUrl(cleanPath, 3600);
        signedClockOutUrl = data?.signedUrl || null;
      }
    }

    return {
      ...entry,
      signedClockInUrl,
      signedClockOutUrl
    };
  }));

  return updatedEntries;
}

// Render report in popup window
function renderReportPopup(
  newWin: Window, 
  title: string, 
  tableHtml: string, 
  reportType: string, 
  dateInfo: string,
  entries: any[]
) {
  const style = `
    <style>
      body { font-family: sans-serif; background: #F6F6F7; margin:0; padding:24px; }
      .download-btn {
        margin-top: 24px; margin-right: 16px;
        padding: 10px 16px; border: none; border-radius:6px;
        font-size: 15px; background: #4BA0F4; color: #fff; cursor: pointer;
        display: inline-flex; align-items: center; gap: 7px;
      }
      .download-btn:hover { background: #3b8ee6; }
      h2 { margin-bottom: 8px; }
      .export-bar { margin-bottom: 20px; }
      table { background: #fff; border:1px solid #ececec; }
      .entry-count { color: #666; margin-bottom: 16px; margin-top: 0; }
    </style>
  `;

  const html = `
    <html>
      <head><title>${title}</title>${style}</head>
      <body>
        <h2>${title}</h2>
        <p class="entry-count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</p>
        <div class="export-bar">
          <button class="download-btn" id="btn-pdf">
            <svg fill="none" height="18" width="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <rect width="18" height="22" x="3" y="1" stroke="#fff" fill="none" rx="2"/>
              <text x="7" y="18" font-size="9" fill="#fff">PDF</text>
            </svg> Save as PDF
          </button>
          <button class="download-btn" id="btn-csv">
            <svg fill="none" height="18" width="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <rect width="18" height="22" x="3" y="1" stroke="#fff" fill="none" rx="2"/>
              <text x="7" y="18" font-size="9" fill="#fff">CSV</text>
            </svg> Save as CSV
          </button>
        </div>
        ${tableHtml}
        <script>
          document.getElementById('btn-pdf').onclick = function() {
            if (window.opener && window.opener.exportReportPDF) {
              window.opener.exportReportPDF('${reportType}');
            }
          };
          document.getElementById('btn-csv').onclick = function() {
            if (window.opener && window.opener.exportReportCSV) {
              window.opener.exportReportCSV('${reportType}');
            }
          };
        </script>
      </body>
    </html>
  `;
  
  newWin.document.write(html);
  newWin.document.close();
  
  // Store entries and attach export functions to opener window
  (window as any).currentReportData = { entries, dateInfo, reportType };
  (window as any).exportReportPDF = (type: string) => {
    const data = (window as any).currentReportData;
    if (type === 'daily') exportDailyTimecardAsPDF(data.entries, data.dateInfo);
    if (type === 'timecard') exportTimeEntryDetailsAsPDF(data.entries, data.dateInfo);
  };
  (window as any).exportReportCSV = (type: string) => {
    const data = (window as any).currentReportData;
    if (type === 'daily') exportDailyTimecardAsCSV(data.entries);
    if (type === 'timecard') exportTimeEntryDetailsAsCSV(data.entries);
  };
}

// --- Employee/Project Report Export Utilities ---

function exportTableAsCSV(type: "employee" | "project", _data?: any[], _includeOvertimeColumns?: boolean) {
  if (type === "employee") {
    // Use detailed rows format for employee report
    const detailedRows = (window as any).currentEmployeeDetailedRows || [];
    
    const columns = ["First Name", "Last Name", "Employee ID", "Date", "Project ID", "Cost Code", "Hours Type", "Hours"];
    let csv = columns.join(",") + "\n";
    
    csv += detailedRows.map((row: any) => {
      return [
        `"${row.firstName || ''}"`,
        `"${row.lastName || ''}"`,
        `"${row.employeeId || ''}"`,
        `"${row.date || ''}"`,
        `"${row.projectId || ''}"`,
        `"${row.costCode || ''}"`,
        `"${row.hoursType || ''}"`,
        row.hours?.toFixed(1) || "0"
      ].join(",");
    }).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-hours-report.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return;
  }
  
  // Project report (unchanged)
  const reportData = (window as any).currentEmployeeProjectData?.reportData || [];
  const columns = ["Name", "Hours"];
  let csv = columns.join(",") + "\n";
  csv += reportData.map((row: any) => `"${row.name}",${row.hours?.toFixed(1) || 0}`).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project-report.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

async function exportTableAsPDF(type: "employee" | "project", _data?: any[], _includeOvertimeColumns?: boolean) {
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  
  const { jsPDF } = jsPDFModule;
  const autoTable = autoTableModule.default;
  
  if (type === "employee") {
    const detailedRows = (window as any).currentEmployeeDetailedRows || [];
    const doc = new jsPDF('landscape');
    
    const columns = ["First Name", "Last Name", "Employee ID", "Date", "Project ID", "Cost Code", "Hours Type", "Hours"];
    
    doc.setFontSize(16);
    doc.text("Employee Hours Report", 14, 16);
    
    autoTable(doc, {
      startY: 25,
      head: [columns],
      body: detailedRows.map((row: any) => [
        row.firstName || '',
        row.lastName || '',
        row.employeeId || '',
        row.date || '',
        row.projectId || '',
        row.costCode || '',
        row.hoursType || '',
        row.hours?.toFixed(1) || "0"
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`employee-hours-report.pdf`);
    return;
  }
  
  // Project report (unchanged)
  const reportData = (window as any).currentEmployeeProjectData?.reportData || [];
  const doc = new jsPDF();
  const columns = ["Name", "Hours"];
  
  doc.setFontSize(16);
  doc.text("Project Time Distribution", 14, 16);
  
  autoTable(doc, {
    startY: 25,
    head: [columns],
    body: reportData.map((row: any) => [row.name, row.hours?.toFixed(1) || "0"]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  doc.save(`project-report.pdf`);
}

const Reports = () => {
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [appliedFilters, setAppliedFilters] = useState<ReportFiltersValues | null>(null);
  const { metrics, employeeReports, projectReports, loading, error } = useReports(selectedStartDate, selectedEndDate);

  // Refs for scrolling to report sections
  const dailyReportRef = useRef<HTMLDivElement>(null);
  const timeEntryReportRef = useRef<HTMLDivElement>(null);

  // Generate report logic
  const handleGenerateReport = async (filters: ReportFiltersValues) => {
    // Store applied filters for inline reports
    setAppliedFilters(filters);
    
    // Update selected dates for the hook to update overview metrics
    setSelectedStartDate(filters.startDate);
    setSelectedEndDate(filters.endDate);

    // Open popup window for all report types
    const newWin = window.open("", "_blank", "width=900,height=700");
    if (!newWin) {
      alert("Please enable popups for this site.");
      return;
    }

    // Fetch company data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, first_name, last_name, department_id, company_id, employee_id');

    const companyId = profiles?.[0]?.company_id;
    if (!companyId) {
      newWin.close();
      alert("Unable to fetch company data");
      return;
    }

    // Build profile lookup map
    const userProfiles = profiles?.reduce((acc, profile) => {
      acc[profile.id] = profile;
      if (profile.user_id) {
        acc[profile.user_id] = profile;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // Handle Daily Timecard Report
    if (filters.reportType === 'daily') {
      const date = filters.startDate || new Date();
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(`id, user_id, profile_id, start_time, end_time, duration_minutes, projects(name)`)
        .eq('company_id', companyId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: false });

      // Map entries with employee names and filter
      let entries = (timeEntries || []).map((entry: any) => {
        const profile = entry.profile_id 
          ? userProfiles[entry.profile_id] 
          : userProfiles[entry.user_id];
        const employeeName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                            profile?.display_name ||
                            'Unknown User';
        return {
          ...entry,
          employeeName,
          employeeNumber: profile?.employee_id || null,
          projectName: entry.projects?.name || null,
          departmentId: profile?.department_id,
          profileId: entry.profile_id || profile?.id
        };
      });

      // Apply filters
      if (filters.employeeId) {
        entries = entries.filter(e => e.profileId === filters.employeeId || e.user_id === filters.employeeId);
      }
      if (filters.departmentId) {
        entries = entries.filter(e => e.departmentId === filters.departmentId);
      }

      const dateStr = format(date, 'MMMM d, yyyy');
      const title = `Daily Timecard Report — ${dateStr}`;
      const reportTable = buildDailyTimecardHTML(entries);
      
      renderReportPopup(newWin, title, reportTable, 'daily', dateStr, entries);
      return;
    }

    // Handle Time Entry Details Report
    if (filters.reportType === 'timecard') {
      const startDate = filters.startDate || new Date();
      const endDate = filters.endDate || new Date();
      
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Fetch all required fields including photos and coordinates
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

      // Map entries with employee names and filter
      let entries = (timeEntries || []).map((entry: any) => {
        const profile = entry.profile_id 
          ? userProfiles[entry.profile_id] 
          : userProfiles[entry.user_id];
        const employeeName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                            profile?.display_name ||
                            'Unknown User';
        return {
          ...entry,
          employeeName,
          employeeNumber: profile?.employee_id || null,
          projectName: entry.projects?.name || null,
          departmentId: profile?.department_id,
          profileId: entry.profile_id || profile?.id
        };
      });

      // Apply filters
      if (filters.employeeId) {
        entries = entries.filter(e => e.profileId === filters.employeeId || e.user_id === filters.employeeId);
      }
      if (filters.departmentId) {
        entries = entries.filter(e => e.departmentId === filters.departmentId);
      }

      // Fetch signed URLs for photos
      entries = await fetchSignedPhotoUrls(entries);

      const formatDateForTitle = (d: Date) => format(d, 'MMM d, yyyy');
      const dateRangeStr = start.toDateString() === end.toDateString()
        ? formatDateForTitle(start)
        : `${formatDateForTitle(start)} - ${formatDateForTitle(end)}`;
      
      const title = `Time Entry Details — ${dateRangeStr}`;
      
      // Use the rich popup renderer with photos and maps
      renderTimeEntryDetailsPopup(newWin, title, entries, dateRangeStr);
      
      // Store data for exports with async PDF handler
      (window as any).currentReportData = { entries, dateInfo: dateRangeStr, reportType: 'timecard' };
      (window as any).exportReportPDF = async (type: string) => {
        if (type === 'timecard') {
          await exportTimeEntryDetailsAsPDF((window as any).currentReportData.entries, (window as any).currentReportData.dateInfo);
          // Signal completion to popup
          if (newWin && !newWin.closed) {
            newWin.postMessage('pdf-complete', '*');
          }
        }
        if (type === 'daily') {
          exportDailyTimecardAsPDF((window as any).currentReportData.entries, (window as any).currentReportData.dateInfo);
        }
      };
      (window as any).exportReportCSV = (type: string) => {
        if (type === 'timecard') {
          exportTimeEntryDetailsAsCSV((window as any).currentReportData.entries);
        }
        if (type === 'daily') {
          exportDailyTimecardAsCSV((window as any).currentReportData.entries);
        }
      };
      
      return;
    }

    // Handle Employee and Project reports (existing logic)
    const start = filters.startDate 
      ? new Date(filters.startDate.getFullYear(), filters.startDate.getMonth(), filters.startDate.getDate(), 0, 0, 0)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const end = filters.endDate 
      ? new Date(filters.endDate.getFullYear(), filters.endDate.getMonth(), filters.endDate.getDate(), 23, 59, 59, 999)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const { data: rawTimeEntries } = await supabase
      .from('time_entries')
      .select(`
        id,
        duration_minutes,
        start_time,
        end_time,
        user_id,
        profile_id,
        projects(id, name, status)
      `)
      .eq('company_id', companyId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString());

    // Fetch task activities with task type codes for all time entries in range
    const timeEntryIds = rawTimeEntries?.map(e => e.id) || [];
    const { data: taskActivities } = timeEntryIds.length > 0 
      ? await supabase
          .from('task_activities')
          .select('time_entry_id, task_type_id, task_types(code)')
          .in('time_entry_id', timeEntryIds)
      : { data: [] };

    // Build map: time_entry_id -> task type code (use first activity's code if multiple)
    const timeEntryTaskCodes: Record<string, string> = {};
    (taskActivities || []).forEach((ta: any) => {
      if (ta.time_entry_id && !timeEntryTaskCodes[ta.time_entry_id]) {
        timeEntryTaskCodes[ta.time_entry_id] = ta.task_types?.code || '';
      }
    });

    // Calculate minutes for each entry, prorating entries that span multiple days
    const timeEntries = rawTimeEntries?.map(entry => {
      const entryStart = new Date(entry.start_time).getTime();
      const entryEnd = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
      
      // Clamp to the report's date range to prorate multi-day entries
      const rangeStart = start.getTime();
      const rangeEnd = end.getTime();
      
      const effectiveStart = Math.max(entryStart, rangeStart);
      const effectiveEnd = Math.min(entryEnd, rangeEnd);
      
      // Calculate only the minutes within the date range
      const minutes = effectiveStart < effectiveEnd 
        ? Math.floor((effectiveEnd - effectiveStart) / 1000 / 60)
        : 0;
      
      return { 
        ...entry, 
        calculated_minutes: minutes,
        taskTypeCode: timeEntryTaskCodes[entry.id] || ''
      };
    }) || [];

    // Build employee or project reports from fresh data
    let reportData: any[] = [];
    let overtimeEnabled = false;

    if (filters.reportType === 'employee') {
      // Fetch company features for overtime settings
      const { data: companyFeatures } = await supabase
        .from('company_features')
        .select('overtime_enabled, overtime_daily_threshold_hours')
        .eq('company_id', companyId)
        .maybeSingle();

      overtimeEnabled = companyFeatures?.overtime_enabled ?? false;
      const dailyThresholdHours = companyFeatures?.overtime_daily_threshold_hours ?? 8;
      const dailyThresholdMinutes = dailyThresholdHours * 60;

      // Get unique profile IDs for schedule lookup
      const profileIds = [...new Set(
        timeEntries
          .map((e: any) => e.profile_id || userProfiles[e.user_id]?.id)
          .filter(Boolean)
      )] as string[];

      // Fetch employee schedules for all days
      const { data: employeeSchedules } = await supabase
        .from('employee_schedules')
        .select('profile_id, day_of_week, start_time, end_time, is_day_off')
        .in('profile_id', profileIds.length > 0 ? profileIds : ['none']);

      // Build employee schedule map: profileId -> dayOfWeek -> schedule
      const employeeScheduleMap: Record<string, Record<number, { start_time: string | null; end_time: string | null; is_day_off: boolean }>> = {};
      (employeeSchedules || []).forEach((s: any) => {
        if (!employeeScheduleMap[s.profile_id]) {
          employeeScheduleMap[s.profile_id] = {};
        }
        employeeScheduleMap[s.profile_id][s.day_of_week] = {
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off ?? false,
        };
      });

      // Get department IDs for fallback schedules
      const departmentIds = [...new Set(
        Object.values(userProfiles).map((p: any) => p.department_id).filter(Boolean)
      )] as string[];

      // Fetch department schedules
      const { data: departmentSchedules } = await supabase
        .from('department_schedules')
        .select('department_id, day_of_week, start_time, end_time, is_day_off')
        .in('department_id', departmentIds.length > 0 ? departmentIds : ['none']);

      // Build department schedule map
      const departmentScheduleMap: Record<string, Record<number, { start_time: string | null; end_time: string | null; is_day_off: boolean }>> = {};
      (departmentSchedules || []).forEach((s: any) => {
        if (!departmentScheduleMap[s.department_id]) {
          departmentScheduleMap[s.department_id] = {};
        }
        departmentScheduleMap[s.department_id][s.day_of_week] = {
          start_time: s.start_time,
          end_time: s.end_time,
          is_day_off: s.is_day_off ?? false,
        };
      });

      // Helper function to get scheduled minutes for a day
      const getScheduledMinutes = (profileId: string, departmentId: string | undefined, dayOfWeek: number): number => {
        // Check employee schedule first
        const empSchedule = employeeScheduleMap[profileId]?.[dayOfWeek];
        if (empSchedule) {
          if (empSchedule.is_day_off) return 0;
          if (empSchedule.start_time && empSchedule.end_time) {
            const [startH, startM] = empSchedule.start_time.split(':').map(Number);
            const [endH, endM] = empSchedule.end_time.split(':').map(Number);
            return (endH * 60 + endM) - (startH * 60 + startM);
          }
        }
        // Check department schedule
        if (departmentId) {
          const deptSchedule = departmentScheduleMap[departmentId]?.[dayOfWeek];
          if (deptSchedule) {
            if (deptSchedule.is_day_off) return 0;
            if (deptSchedule.start_time && deptSchedule.end_time) {
              const [startH, startM] = deptSchedule.start_time.split(':').map(Number);
              const [endH, endM] = deptSchedule.end_time.split(':').map(Number);
              return (endH * 60 + endM) - (startH * 60 + startM);
            }
          }
        }
        // Default to configured threshold
        return dailyThresholdMinutes;
      };

      // Build detailed rows: one per employee + date + project, separate rows for Reg/OT
      interface DetailedRow {
        firstName: string;
        lastName: string;
        employeeId: string;
        date: string;
        projectId: string;
        costCode: string;
        hoursType: 'Regular' | 'Overtime';
        hours: number;
        profileId: string;
        departmentId?: string;
      }
      
      // Group time entries by employee + date + project
      const groupKey = (profileId: string, date: string, projectId: string) => `${profileId}|${date}|${projectId}`;
      const groupedMinutes: Record<string, { 
        minutes: number; 
        firstName: string; 
        lastName: string; 
        employeeId: string; 
        date: string; 
        projectId: string;
        costCode: string;
        profileId: string;
        departmentId?: string;
      }> = {};
      
      // Also track total minutes per employee per day for overtime calculation
      const employeeDailyTotals: Record<string, Record<string, number>> = {};

      timeEntries.forEach((entry: any) => {
        const profile = entry.profile_id 
          ? userProfiles[entry.profile_id] 
          : userProfiles[entry.user_id];
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const employeeId = profile?.employee_id || '';
        const profileId = entry.profile_id || entry.user_id || 'unknown';
        const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
        const projectName = entry.projects?.name || '';
        const costCode = entry.taskTypeCode || '';
        
        const key = groupKey(profileId, entryDate, projectName + '|' + costCode);
        
        if (!groupedMinutes[key]) {
          groupedMinutes[key] = {
            minutes: 0,
            firstName,
            lastName,
            employeeId,
            date: entryDate,
            projectId: projectName,
            costCode,
            profileId,
            departmentId: profile?.department_id,
          };
        }
        groupedMinutes[key].minutes += entry.calculated_minutes || 0;
        
        // Track daily totals for overtime calculation
        if (!employeeDailyTotals[profileId]) {
          employeeDailyTotals[profileId] = {};
        }
        if (!employeeDailyTotals[profileId][entryDate]) {
          employeeDailyTotals[profileId][entryDate] = 0;
        }
        employeeDailyTotals[profileId][entryDate] += entry.calculated_minutes || 0;
      });
      
      // Calculate overtime thresholds per employee per day
      const employeeDailyOvertime: Record<string, Record<string, { scheduledMinutes: number; totalMinutes: number }>> = {};
      Object.entries(employeeDailyTotals).forEach(([profileId, dailyTotals]) => {
        const profile = userProfiles[profileId];
        employeeDailyOvertime[profileId] = {};
        
        Object.entries(dailyTotals).forEach(([dateStr, totalMinutes]) => {
          const dayDate = new Date(dateStr);
          const dayOfWeek = dayDate.getDay();
          const scheduledMinutes = getScheduledMinutes(profileId, profile?.department_id, dayOfWeek);
          employeeDailyOvertime[profileId][dateStr] = { scheduledMinutes, totalMinutes };
        });
      });
      
      // Build detailed rows with proper Reg/OT split
      const detailedRows: DetailedRow[] = [];
      
      Object.values(groupedMinutes).forEach((group) => {
        const { profileId, date } = group;
        const dailyInfo = employeeDailyOvertime[profileId]?.[date];
        const scheduledMinutes = dailyInfo?.scheduledMinutes || dailyThresholdMinutes;
        const totalDailyMinutes = dailyInfo?.totalMinutes || 0;
        
        const groupMinutes = group.minutes;
        
        if (overtimeEnabled && totalDailyMinutes > scheduledMinutes) {
          // There is overtime for this day - need to split
          const ratio = groupMinutes / totalDailyMinutes;
          const dailyRegular = Math.min(totalDailyMinutes, scheduledMinutes);
          const dailyOvertime = Math.max(0, totalDailyMinutes - scheduledMinutes);
          
          const groupRegular = dailyRegular * ratio;
          const groupOvertime = dailyOvertime * ratio;
          
          if (groupRegular > 0) {
            detailedRows.push({
              firstName: group.firstName,
              lastName: group.lastName,
              employeeId: group.employeeId,
              date: format(new Date(date), 'M/d/yy'),
              projectId: group.projectId,
              costCode: group.costCode,
              hoursType: 'Regular',
              hours: groupRegular / 60,
              profileId: group.profileId,
              departmentId: group.departmentId,
            });
          }
          
          if (groupOvertime > 0) {
            detailedRows.push({
              firstName: group.firstName,
              lastName: group.lastName,
              employeeId: group.employeeId,
              date: format(new Date(date), 'M/d/yy'),
              projectId: group.projectId,
              costCode: group.costCode,
              hoursType: 'Overtime',
              hours: groupOvertime / 60,
              profileId: group.profileId,
              departmentId: group.departmentId,
            });
          }
        } else {
          // All regular hours
          detailedRows.push({
            firstName: group.firstName,
            lastName: group.lastName,
            employeeId: group.employeeId,
            date: format(new Date(date), 'M/d/yy'),
            projectId: group.projectId,
            costCode: group.costCode,
            hoursType: 'Regular',
            hours: groupMinutes / 60,
            profileId: group.profileId,
            departmentId: group.departmentId,
          });
        }
      });
      
      // Sort by last name, first name, date
      detailedRows.sort((a, b) => {
        if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
        if (a.firstName !== b.firstName) return a.firstName.localeCompare(b.firstName);
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.hoursType !== b.hoursType) return a.hoursType === 'Regular' ? -1 : 1;
        return 0;
      });
      
      // Apply filters
      let filteredRows = detailedRows;
      if (filters.employeeId) {
        filteredRows = filteredRows.filter(r => r.profileId === filters.employeeId);
      }
      if (filters.departmentId) {
        filteredRows = filteredRows.filter(r => r.departmentId === filters.departmentId);
      }
      
      // Store detailed rows for CSV/PDF export
      (window as any).currentEmployeeDetailedRows = filteredRows;
      
      // Build summary for display table
      const employeeSummary: Record<string, { name: string; hours: number; regularHours: number; overtimeHours: number; departmentId?: string }> = {};
      filteredRows.forEach(row => {
        if (!employeeSummary[row.profileId]) {
          employeeSummary[row.profileId] = {
            name: `${row.firstName} ${row.lastName}`.trim() || 'Unknown',
            hours: 0,
            regularHours: 0,
            overtimeHours: 0,
            departmentId: row.departmentId,
          };
        }
        employeeSummary[row.profileId].hours += row.hours;
        if (row.hoursType === 'Regular') {
          employeeSummary[row.profileId].regularHours += row.hours;
        } else {
          employeeSummary[row.profileId].overtimeHours += row.hours;
        }
      });
      
      reportData = Object.entries(employeeSummary).map(([odId, data]) => ({
        name: data.name,
        hours: Math.round(data.hours * 10) / 10,
        regularHours: Math.round(data.regularHours * 10) / 10,
        overtimeHours: Math.round(data.overtimeHours * 10) / 10,
        odId,
        departmentId: data.departmentId,
      })).sort((a, b) => b.hours - a.hours);

    } else {
      const projectHours = timeEntries.reduce((acc, entry: any) => {
        const project = entry.projects;
        if (!project) return acc;

        const projectId = project.id;
        const projectName = project.name || 'No Project';
        const projectStatus = project.status;
        const hours = entry.calculated_minutes / 60;

        if (!acc[projectId]) {
          acc[projectId] = {
            name: projectName,
            hours: 0,
            projectId,
            status: projectStatus
          };
        }
        acc[projectId].hours += hours;

        return acc;
      }, {} as Record<string, any>);

      reportData = Object.values(projectHours).map((data: any) => ({
        name: data.name,
        hours: Math.round(data.hours * 10) / 10,
        projectId: data.projectId,
        status: data.status,
      })).sort((a: any, b: any) => b.hours - a.hours);
    }

    // Format date range for title
    const formatDateForTitle = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateRangeStr = start.toDateString() === end.toDateString()
      ? formatDateForTitle(start)
      : `${formatDateForTitle(start)} - ${formatDateForTitle(end)}`;

    const reportTable = buildRealTableHTML(filters.reportType === 'employee' ? 'employee' : 'project', reportData, undefined, undefined, overtimeEnabled);
    const title =
      filters.reportType === "employee"
        ? `Work Hours Per Employee — ${dateRangeStr}`
        : `Project Time Distribution — ${dateRangeStr}`;

    const style = `
      <style>
        body { font-family: sans-serif; background: #F6F6F7; margin:0;padding:24px; }
        .download-btn {
          margin-top: 24px; margin-right: 16px;
          padding: 10px 16px; border: none; border-radius:6px;
          font-size: 15px; background: #4BA0F4; color: #fff; cursor: pointer; display:inline-flex; align-items:center; gap:7px;
        }
        .download-btn:last-child { margin-right: 0; }
        h2 { margin-bottom: 18px; }
        .export-bar { margin-bottom: 20px; }
        table { background: #fff; border:1px solid #ececec; }
      </style>
    `;

    const pdfBtnId = "btn-pdf";
    const csvBtnId = "btn-csv";
    const html = `
      <html>
        <head>
          <title>${title} - Report</title>
          ${style}
        </head>
        <body>
          <h2>${title}</h2>
          <div class="export-bar">
            <button class="download-btn" id="${pdfBtnId}">
              <svg fill="none" height="18" width="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <rect width="18" height="22" x="3" y="1" stroke="#fff" fill="none" rx="2"/>
                <text x="7" y="18" font-size="9" fill="#fff">PDF</text>
              </svg> Save as PDF
            </button>
            <button class="download-btn" id="${csvBtnId}">
              <svg fill="none" height="18" width="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <rect width="18" height="22" x="3" y="1" stroke="#fff" fill="none" rx="2"/>
                <text x="7" y="18" font-size="9" fill="#fff">CSV</text>
              </svg> Save as CSV
            </button>
          </div>
          ${reportTable}
          <script>
              window.exportTableAsCSV = ${exportTableAsCSV.toString()};
              window.exportTableAsPDF = ${exportTableAsPDF.toString()};
              document.getElementById('${csvBtnId}').addEventListener('click', function() {
                window.opener.exportTableAsCSV && window.opener.exportTableAsCSV('${filters.reportType}');
              });
              document.getElementById('${pdfBtnId}').addEventListener('click', function() {
                window.opener.exportTableAsPDF && window.opener.exportTableAsPDF('${filters.reportType}');
              });
          </script>
        </body>
      </html>
    `;
    newWin.document.write(html);
    newWin.document.close();
    // Store real data and attach export functions to opener so popup can invoke
    (window as any).currentEmployeeProjectData = { reportData, type: filters.reportType, overtimeEnabled };
    (window as any).exportTableAsCSV = (type: string) => exportTableAsCSV(type as "employee" | "project", reportData, overtimeEnabled);
    (window as any).exportTableAsPDF = (type: string) => exportTableAsPDF(type as "employee" | "project", reportData, overtimeEnabled);
  };

  return (
    <DashboardLayout>
      {/* Reports Header */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="live">Live Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Automated Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-8">
            {/* Report Filters */}
            <ReportFilters onApply={handleGenerateReport} />

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-muted-foreground">Total Hours</div>
                  <Clock className="text-green-600" />
                </div>
                  <div className="text-2xl font-bold text-foreground">{metrics.totalHours}</div>
                  <div className="text-sm text-green-600 mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> {metrics.totalHoursChange}% vs last month
                  </div>
              </div>

              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-muted-foreground">Active Projects</div>
                  <FolderOpen className="text-primary" />
                </div>
                  <div className="text-2xl font-bold text-foreground">{metrics.activeProjects}</div>
                  <div className="text-sm text-primary mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> {metrics.activeProjectsChange} new this week
                  </div>
              </div>

              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-muted-foreground">Overtime Hours</div>
                  <Clock className="text-orange-500" />
                </div>
                  <div className="text-2xl font-bold text-foreground">{metrics.overtimeHours}</div>
                  <div className="text-sm text-orange-600 mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> {metrics.overtimeHoursChange} hours vs last month
                  </div>
              </div>
            </div>

            {/* Daily Timecard Report - defaults to today */}
            <div ref={dailyReportRef}>
              <DailyTimecardReport 
                key={`daily-${appliedFilters?.startDate?.toISOString()}-${appliedFilters?.employeeId}-${appliedFilters?.departmentId}`}
                date={appliedFilters?.reportType === 'daily' ? appliedFilters.startDate : new Date()}
                employeeId={appliedFilters?.reportType === 'daily' ? appliedFilters?.employeeId : undefined}
                departmentId={appliedFilters?.reportType === 'daily' ? appliedFilters?.departmentId : undefined}
              />
            </div>

            {/* Time Entry Details Report with Photos - defaults to today */}
            <div ref={timeEntryReportRef}>
              <TimeEntryDetailsReport 
                key={`timecard-${appliedFilters?.startDate?.toISOString()}-${appliedFilters?.endDate?.toISOString()}-${appliedFilters?.employeeId}-${appliedFilters?.departmentId}`}
                startDate={appliedFilters?.reportType === 'timecard' ? appliedFilters.startDate : new Date()} 
                endDate={appliedFilters?.reportType === 'timecard' ? appliedFilters.endDate : new Date()}
                employeeId={appliedFilters?.reportType === 'timecard' ? appliedFilters?.employeeId : undefined}
                departmentId={appliedFilters?.reportType === 'timecard' ? appliedFilters?.departmentId : undefined}
              />
            </div>

            {/* Report Content */}
            <section className="bg-card rounded-xl shadow-sm border border-border mb-8">
              <div className="border-b border-border">
                <div className="flex space-x-6 px-6">
                  <button className="px-4 py-4 text-primary border-b-2 border-primary font-semibold">
                    Metrics
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Work Hours Per Employee Table */}
                  <div className="bg-muted rounded-lg p-4 h-[300px] overflow-auto">
                    <div className="font-semibold text-foreground mb-2">Work Hours Per Employee</div>
                    <table className="min-w-full text-sm rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="py-2 px-3 text-left text-muted-foreground">Name</th>
                    <th className="py-2 px-3 text-left text-muted-foreground">Week</th>
                    <th className="py-2 px-3 text-left text-muted-foreground">Month</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeReports.slice(0, 5).map((row, i) => (
                    <tr key={row.name} className={i % 2 === 0 ? "bg-card" : "bg-muted"}>
                      <td className="py-2 px-3 text-foreground">{row.name}</td>
                      <td className="py-2 px-3 text-foreground">{row.week}</td>
                      <td className="py-2 px-3 text-foreground">{row.month}</td>
                    </tr>
                  ))}
                  {employeeReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-muted-foreground">
                        No employee data available
                      </td>
                    </tr>
                  )}
                    </tbody>
                  </table>
                </div>
                {/* Project Time Distribution Table */}
                <div className="bg-muted rounded-lg p-4 h-[300px] overflow-auto">
                  <div className="font-semibold text-foreground mb-2">Project Time Distribution</div>
                  <table className="min-w-full text-sm rounded-lg overflow-auto">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="py-2 px-3 text-left text-muted-foreground">Project Name</th>
                    <th className="py-2 px-3 text-left text-muted-foreground">Week</th>
                    <th className="py-2 px-3 text-left text-muted-foreground">Month</th>
                  </tr>
                </thead>
                <tbody>
                  {projectReports.slice(0, 5).map((row, i) => (
                    <tr key={row.name} className={i % 2 === 0 ? "bg-card" : "bg-muted"}>
                      <td className="py-2 px-3 text-foreground">{row.name}</td>
                      <td className="py-2 px-3 text-foreground">{row.week}</td>
                      <td className="py-2 px-3 text-foreground">{row.month}</td>
                    </tr>
                  ))}
                  {projectReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 px-3 text-center text-muted-foreground">
                        No project data available
                      </td>
                    </tr>
                  )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledReportsManager />
        </TabsContent>
      </Tabs>
    </section>
    </DashboardLayout>
  );
};

export default Reports;
