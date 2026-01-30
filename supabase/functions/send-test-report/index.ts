import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface ReportConfig {
  scope?: string;
  department_ids?: string[];
  project_ids?: string[];
}

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_break: boolean;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_address: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_address: string | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
    employee_id: string | null;
  };
  projects: {
    id: string;
    name: string;
  } | null;
}

// ============= Utility Functions =============

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(dateString: string, timezone: string = 'America/Los_Angeles'): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
}

function formatDate(dateString: string, timezone: string = 'America/Los_Angeles'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  });
}

function formatShortDate(dateString: string, timezone: string = 'America/Los_Angeles'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: timezone
  });
}

function formatLongDate(dateString: string, timezone: string = 'America/Los_Angeles'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  });
}

function getReportTypeName(type: string): string {
  const names: Record<string, string> = {
    'employee_timecard': 'Employee Timecard',
    'project_timecard': 'Project Timecard',
    'weekly_payroll': 'Weekly Payroll',
    'monthly_project_billing': 'Monthly Project Billing'
  };
  return names[type] || type;
}

function getEmployeeName(entry: TimeEntry): string {
  return entry.profiles.display_name || 
    `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
    'Unknown';
}

// ============= CSV Generation Functions =============

function generateEmployeeTimecardCSV(entries: TimeEntry[], timezone: string): string {
  let csv = 'Employee,Employee Number,Project,Date,Clock In,Clock Out,Duration,Type,Clock In Address,Clock Out Address\n';
  
  for (const entry of entries) {
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.start_time, timezone);
    const clockIn = formatTime(entry.start_time, timezone);
    const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Open';
    const duration = formatDuration(entry.duration_minutes);
    const entryType = entry.is_break ? 'Break' : 'Work';
    const clockInAddr = entry.clock_in_address || '';
    const clockOutAddr = entry.clock_out_address || '';
    
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    
    csv += `${escapeCsv(name)},${escapeCsv(employeeNumber)},${escapeCsv(projectName)},${escapeCsv(date)},${escapeCsv(clockIn)},${escapeCsv(clockOut)},${escapeCsv(duration)},${escapeCsv(entryType)},${escapeCsv(clockInAddr)},${escapeCsv(clockOutAddr)}\n`;
  }
  
  return csv;
}

function generateProjectTimecardCSV(entries: TimeEntry[], timezone: string): string {
  let csv = 'Project,Employee,Employee Number,Date,Clock In,Clock Out,Duration\n';
  
  for (const entry of entries) {
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.start_time, timezone);
    const clockIn = formatTime(entry.start_time, timezone);
    const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Open';
    const duration = formatDuration(entry.duration_minutes);
    
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    
    csv += `${escapeCsv(projectName)},${escapeCsv(name)},${escapeCsv(employeeNumber)},${escapeCsv(date)},${escapeCsv(clockIn)},${escapeCsv(clockOut)},${escapeCsv(duration)}\n`;
  }
  
  return csv;
}

function generateWeeklyPayrollCSV(entries: TimeEntry[]): string {
  const byEmployee = new Map<string, { 
    name: string; 
    employeeNumber: string;
    totalMinutes: number; 
    days: Set<string> 
  }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, employeeNumber, totalMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.days.add(entry.start_time.split('T')[0]);
  }
  
  let csv = 'Employee,Employee Number,Days Worked,Regular Hours,Overtime,Total Hours\n';
  
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  
  for (const [, emp] of byEmployee) {
    const regularMinutes = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    csv += `${escapeCsv(emp.name)},${escapeCsv(emp.employeeNumber)},${emp.days.size},${escapeCsv(formatDuration(regularMinutes))},${escapeCsv(formatDuration(overtimeMinutes))},${escapeCsv(formatDuration(emp.totalMinutes))}\n`;
  }
  
  return csv;
}

// ============= Time Entry Details PDF Generation (Card-based layout matching TimeEntryTimelineCard) =============

// Segment colors matching the React TimeEntryTimelineCard component
const SEGMENT_COLORS = {
  regular: rgb(0.23, 0.51, 0.96),   // blue-500
  late: rgb(0.98, 0.57, 0.21),      // orange-500
  overtime: rgb(0.94, 0.27, 0.27),  // red-500
  break: rgb(0.25, 0.71, 0.71),     // teal-500
};

// Timeline configuration matching React component
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 20;
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 14 hours
const SCHEDULED_START_HOUR = 8;
const SCHEDULED_END_HOUR = 17;

interface TimeSegment {
  type: 'regular' | 'late' | 'overtime' | 'break';
  startHour: number;
  endHour: number;
}

function getHourFromDate(dateStr: string, timezone: string): number {
  const date = new Date(dateStr);
  // Get hours and minutes in the specified timezone
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

function calculateSegments(
  entry: TimeEntry, 
  timezone: string,
  scheduledStartHour = SCHEDULED_START_HOUR, 
  scheduledEndHour = SCHEDULED_END_HOUR
): TimeSegment[] {
  const clockInHour = getHourFromDate(entry.start_time, timezone);
  const clockOutHour = entry.end_time 
    ? getHourFromDate(entry.end_time, timezone) 
    : getHourFromDate(new Date().toISOString(), timezone);
  
  const segments: TimeSegment[] = [];
  
  // Check if late (>10 min after scheduled start)
  const scheduledStartMinutes = scheduledStartHour * 60;
  const clockInMinutes = clockInHour * 60;
  const isLate = clockInMinutes > scheduledStartMinutes + 10;
  
  if (isLate && !entry.is_break) {
    segments.push({ type: 'late', startHour: scheduledStartHour, endHour: clockInHour });
  }
  
  // Determine main segment type based on overtime
  const scheduledEndMinutes = scheduledEndHour * 60;
  const clockOutMinutes = clockOutHour * 60;
  
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
}

function getPositionPercent(hour: number): number {
  return ((hour - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
}

function getTimelineX(percent: number, timelineX: number, timelineWidth: number): number {
  return timelineX + (percent / 100) * timelineWidth;
}

function wrapAddress(address: string, maxCharsPerLine: number = 20): string[] {
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
  
  return lines.slice(0, 4); // Max 4 lines
}

async function generateTimeEntryDetailsPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 40;
  const cardHeight = 185; // Increased height for new layout
  const cardSpacing = 15;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;
  
  // ===== Page Header =====
  page.drawText(reportName || 'Time Entry Details Report', {
    x: margin,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.23, 0.32, 0.96),
  });
  yPosition -= 22;
  
  page.drawText(companyName, {
    x: margin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 18;
  
  page.drawText(`Period: ${dateRange.start} - ${dateRange.end}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 30;
  
  // Hour labels for timeline
  const hourLabels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];
  const hourValues = [6, 8, 10, 12, 14, 16, 18, 20];
  
  // ===== Draw Time Entry Cards =====
  for (const entry of entries) {
    // Check if we need a new page
    if (yPosition - cardHeight < margin + 30) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
    
    const cardTop = yPosition;
    const cardWidth = pageWidth - (margin * 2);
    
    // --- Card Border ---
    page.drawRectangle({
      x: margin,
      y: cardTop - cardHeight,
      width: cardWidth,
      height: cardHeight,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    
    // --- Card Header Background ---
    page.drawRectangle({
      x: margin,
      y: cardTop - 32,
      width: cardWidth,
      height: 32,
      color: rgb(0.97, 0.97, 0.98),
    });
    
    // --- Header Content ---
    const employeeName = getEmployeeName(entry);
    const projectName = entry.projects?.name || 'No Project';
    const dateStr = formatLongDate(entry.start_time, timezone);
    const isComplete = entry.end_time !== null;
    const isBreak = entry.is_break;
    const duration = formatDuration(entry.duration_minutes);
    
    // Date and Employee Name
    page.drawText(`${dateStr}  |  ${employeeName}  |  ${projectName}`, {
      x: margin + 12,
      y: cardTop - 20,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Status badges (right side of header)
    const badgeY = cardTop - 22;
    let badgeX = margin + cardWidth - 12;
    
    // Duration badge
    const durationText = `Duration: ${duration}`;
    const durationWidth = font.widthOfTextAtSize(durationText, 8) + 12;
    badgeX -= durationWidth;
    page.drawRectangle({
      x: badgeX,
      y: badgeY - 5,
      width: durationWidth,
      height: 16,
      color: rgb(0.9, 0.95, 1),
      borderColor: rgb(0.7, 0.85, 1),
      borderWidth: 0.5,
    });
    page.drawText(durationText, {
      x: badgeX + 6,
      y: badgeY,
      size: 8,
      font: font,
      color: rgb(0.2, 0.4, 0.8),
    });
    badgeX -= 8;
    
    // Complete/Active badge
    const statusText = isComplete ? 'Complete' : 'Active';
    const statusWidth = font.widthOfTextAtSize(statusText, 8) + 12;
    badgeX -= statusWidth;
    page.drawRectangle({
      x: badgeX,
      y: badgeY - 5,
      width: statusWidth,
      height: 16,
      color: isComplete ? rgb(0.9, 1, 0.9) : rgb(1, 0.95, 0.9),
      borderColor: isComplete ? rgb(0.6, 0.9, 0.6) : rgb(1, 0.8, 0.6),
      borderWidth: 0.5,
    });
    page.drawText(statusText, {
      x: badgeX + 6,
      y: badgeY,
      size: 8,
      font: font,
      color: isComplete ? rgb(0.2, 0.6, 0.2) : rgb(0.8, 0.5, 0.2),
    });
    badgeX -= 8;
    
    // Work/Break badge
    const typeText = isBreak ? 'Break' : 'Work';
    const typeWidth = font.widthOfTextAtSize(typeText, 8) + 12;
    badgeX -= typeWidth;
    page.drawRectangle({
      x: badgeX,
      y: badgeY - 5,
      width: typeWidth,
      height: 16,
      color: isBreak ? rgb(1, 0.95, 0.85) : rgb(0.85, 0.9, 1),
      borderColor: isBreak ? rgb(0.9, 0.7, 0.4) : rgb(0.6, 0.7, 1),
      borderWidth: 0.5,
    });
    page.drawText(typeText, {
      x: badgeX + 6,
      y: badgeY,
      size: 8,
      font: font,
      color: isBreak ? rgb(0.7, 0.4, 0.1) : rgb(0.3, 0.4, 0.8),
    });
    
    // --- Main Content Area ---
    const contentTop = cardTop - 42;
    const panelWidth = 110;
    const panelHeight = 120;
    const timelineSectionWidth = cardWidth - (panelWidth * 2) - 40;
    
    // === Clock In Panel (Green theme) ===
    const clockInX = margin + 10;
    const clockInY = contentTop - panelHeight;
    
    // Green background for Clock In
    page.drawRectangle({
      x: clockInX,
      y: clockInY,
      width: panelWidth,
      height: panelHeight,
      color: rgb(0.9, 0.98, 0.9),
      borderColor: rgb(0.7, 0.9, 0.7),
      borderWidth: 0.5,
    });
    
    // "Clock In" header
    page.drawText('Clock In', {
      x: clockInX + 8,
      y: clockInY + panelHeight - 16,
      size: 10,
      font: boldFont,
      color: rgb(0.13, 0.55, 0.13),
    });
    
    // Clock in time (larger)
    const clockInTime = formatTime(entry.start_time, timezone);
    page.drawText(clockInTime, {
      x: clockInX + 8,
      y: clockInY + panelHeight - 36,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Photo and Map indicators
    const indicatorY = clockInY + panelHeight - 62;
    
    // Photo box
    const hasClockInPhoto = !!entry.clock_in_photo_url;
    page.drawRectangle({
      x: clockInX + 8,
      y: indicatorY - 20,
      width: 40,
      height: 20,
      color: hasClockInPhoto ? rgb(0.85, 0.92, 0.85) : rgb(0.95, 0.95, 0.95),
      borderColor: hasClockInPhoto ? rgb(0.5, 0.7, 0.5) : rgb(0.8, 0.8, 0.8),
      borderWidth: hasClockInPhoto ? 1 : 0.5,
    });
    page.drawText('Photo', {
      x: clockInX + 17,
      y: indicatorY - 15,
      size: 8,
      font: hasClockInPhoto ? boldFont : font,
      color: hasClockInPhoto ? rgb(0.3, 0.5, 0.3) : rgb(0.6, 0.6, 0.6),
    });
    
    // Map box
    const hasClockInLocation = !!(entry.clock_in_latitude && entry.clock_in_longitude);
    page.drawRectangle({
      x: clockInX + 54,
      y: indicatorY - 20,
      width: 40,
      height: 20,
      color: hasClockInLocation ? rgb(0.85, 0.92, 0.85) : rgb(0.95, 0.95, 0.95),
      borderColor: hasClockInLocation ? rgb(0.5, 0.7, 0.5) : rgb(0.8, 0.8, 0.8),
      borderWidth: hasClockInLocation ? 1 : 0.5,
    });
    page.drawText('Map', {
      x: clockInX + 65,
      y: indicatorY - 15,
      size: 8,
      font: hasClockInLocation ? boldFont : font,
      color: hasClockInLocation ? rgb(0.3, 0.5, 0.3) : rgb(0.6, 0.6, 0.6),
    });
    
    // Multi-line address
    const clockInAddrLines = wrapAddress(entry.clock_in_address || '');
    let addrY = indicatorY - 34;
    for (const line of clockInAddrLines) {
      page.drawText(line, {
        x: clockInX + 8,
        y: addrY,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      addrY -= 10;
    }
    
    // === Timeline Section (Center) ===
    const timelineX = clockInX + panelWidth + 15;
    const timelineWidth = timelineSectionWidth;
    const timelineBarY = clockInY + panelHeight - 60;
    const timelineBarHeight = 24;
    
    // Hour labels above timeline
    for (let i = 0; i < hourLabels.length; i++) {
      const percent = getPositionPercent(hourValues[i]);
      const x = getTimelineX(percent, timelineX, timelineWidth);
      page.drawText(hourLabels[i], {
        x: x - 8,
        y: timelineBarY + timelineBarHeight + 8,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // Timeline background bar
    page.drawRectangle({
      x: timelineX,
      y: timelineBarY,
      width: timelineWidth,
      height: timelineBarHeight,
      color: rgb(0.94, 0.94, 0.94),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
    });
    
    // Tick marks for each hour
    for (let i = 0; i < hourValues.length; i++) {
      const percent = getPositionPercent(hourValues[i]);
      const x = getTimelineX(percent, timelineX, timelineWidth);
      page.drawLine({
        start: { x, y: timelineBarY },
        end: { x, y: timelineBarY + timelineBarHeight },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }
    
    // Scheduled window indicators (8am and 5pm dashed lines)
    const scheduledStartX = getTimelineX(getPositionPercent(SCHEDULED_START_HOUR), timelineX, timelineWidth);
    const scheduledEndX = getTimelineX(getPositionPercent(SCHEDULED_END_HOUR), timelineX, timelineWidth);
    
    // Draw dashed vertical lines for scheduled window
    for (let y = timelineBarY; y < timelineBarY + timelineBarHeight; y += 4) {
      page.drawLine({
        start: { x: scheduledStartX, y },
        end: { x: scheduledStartX, y: y + 2 },
        thickness: 1.5,
        color: rgb(0.3, 0.5, 0.9),
        opacity: 0.5,
      });
      page.drawLine({
        start: { x: scheduledEndX, y },
        end: { x: scheduledEndX, y: y + 2 },
        thickness: 1.5,
        color: rgb(0.3, 0.5, 0.9),
        opacity: 0.5,
      });
    }
    
    // Calculate and draw segments
    const segments = calculateSegments(entry, timezone);
    for (const segment of segments) {
      const startPercent = getPositionPercent(Math.max(segment.startHour, TIMELINE_START_HOUR));
      const endPercent = getPositionPercent(Math.min(segment.endHour, TIMELINE_END_HOUR));
      const segmentStartX = getTimelineX(startPercent, timelineX, timelineWidth);
      const segmentEndX = getTimelineX(endPercent, timelineX, timelineWidth);
      const segmentWidth = Math.max(segmentEndX - segmentStartX, 0);
      
      if (segmentWidth > 0) {
        page.drawRectangle({
          x: segmentStartX,
          y: timelineBarY + 3,
          width: segmentWidth,
          height: timelineBarHeight - 6,
          color: SEGMENT_COLORS[segment.type],
        });
      }
    }
    
    // Legend below timeline
    const legendY = timelineBarY - 20;
    const legendItems = [
      { label: 'Regular', color: SEGMENT_COLORS.regular },
      { label: 'Late', color: SEGMENT_COLORS.late },
      { label: 'Overtime', color: SEGMENT_COLORS.overtime },
      { label: 'Break', color: SEGMENT_COLORS.break },
    ];
    
    let legendX = timelineX;
    for (const item of legendItems) {
      // Colored square
      page.drawRectangle({
        x: legendX,
        y: legendY - 3,
        width: 8,
        height: 8,
        color: item.color,
      });
      // Label
      page.drawText(item.label, {
        x: legendX + 11,
        y: legendY - 2,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      legendX += font.widthOfTextAtSize(item.label, 7) + 22;
    }
    
    // === Clock Out Panel (Red/Coral theme) ===
    const clockOutX = timelineX + timelineWidth + 15;
    const clockOutTime = entry.end_time ? formatTime(entry.end_time, timezone) : 'Active';
    
    // Red/coral background for Clock Out
    const clockOutBgColor = isComplete ? rgb(1, 0.95, 0.95) : rgb(0.98, 0.96, 0.94);
    page.drawRectangle({
      x: clockOutX,
      y: clockInY,
      width: panelWidth,
      height: panelHeight,
      color: clockOutBgColor,
      borderColor: isComplete ? rgb(0.9, 0.7, 0.7) : rgb(0.9, 0.85, 0.8),
      borderWidth: 0.5,
    });
    
    // "Clock Out" header
    page.drawText('Clock Out', {
      x: clockOutX + 8,
      y: clockInY + panelHeight - 16,
      size: 10,
      font: boldFont,
      color: isComplete ? rgb(0.8, 0.2, 0.2) : rgb(0.6, 0.5, 0.4),
    });
    
    // Clock out time (larger)
    page.drawText(clockOutTime, {
      x: clockOutX + 8,
      y: clockInY + panelHeight - 36,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Photo and Map indicators for clock out
    const outIndicatorY = clockInY + panelHeight - 62;
    
    // Photo box
    const hasClockOutPhoto = !!entry.clock_out_photo_url;
    page.drawRectangle({
      x: clockOutX + 8,
      y: outIndicatorY - 20,
      width: 40,
      height: 20,
      color: hasClockOutPhoto ? rgb(0.92, 0.85, 0.85) : rgb(0.95, 0.95, 0.95),
      borderColor: hasClockOutPhoto ? rgb(0.7, 0.5, 0.5) : rgb(0.8, 0.8, 0.8),
      borderWidth: hasClockOutPhoto ? 1 : 0.5,
    });
    page.drawText('Photo', {
      x: clockOutX + 17,
      y: outIndicatorY - 15,
      size: 8,
      font: hasClockOutPhoto ? boldFont : font,
      color: hasClockOutPhoto ? rgb(0.5, 0.3, 0.3) : rgb(0.6, 0.6, 0.6),
    });
    
    // Map box
    const hasClockOutLocation = !!(entry.clock_out_latitude && entry.clock_out_longitude);
    page.drawRectangle({
      x: clockOutX + 54,
      y: outIndicatorY - 20,
      width: 40,
      height: 20,
      color: hasClockOutLocation ? rgb(0.92, 0.85, 0.85) : rgb(0.95, 0.95, 0.95),
      borderColor: hasClockOutLocation ? rgb(0.7, 0.5, 0.5) : rgb(0.8, 0.8, 0.8),
      borderWidth: hasClockOutLocation ? 1 : 0.5,
    });
    page.drawText('Map', {
      x: clockOutX + 65,
      y: outIndicatorY - 15,
      size: 8,
      font: hasClockOutLocation ? boldFont : font,
      color: hasClockOutLocation ? rgb(0.5, 0.3, 0.3) : rgb(0.6, 0.6, 0.6),
    });
    
    // Multi-line address for clock out
    const clockOutAddrLines = wrapAddress(entry.clock_out_address || (isComplete ? '' : '-'));
    let outAddrY = outIndicatorY - 34;
    for (const line of clockOutAddrLines) {
      page.drawText(line, {
        x: clockOutX + 8,
        y: outAddrY,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      outAddrY -= 10;
    }
    
    // Move to next card position
    yPosition = cardTop - cardHeight - cardSpacing;
  }
  
  // ===== Handle empty state =====
  if (entries.length === 0) {
    page.drawText('No time entries found for this period.', {
      x: margin,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  // ===== Footer on all pages =====
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`Generated by CICO on ${new Date().toLocaleString()} | Page ${i + 1} of ${pages.length}`, {
      x: margin,
      y: 20,
      size: 8,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }
  
  return await pdfDoc.save();
}

// ============= Other PDF Generation Functions =============

async function generateProjectTimecardPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612;
  const pageHeight = 792;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - 50;
  
  page.drawText(reportName || 'Project Timecard Report', {
    x: 50,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.06, 0.72, 0.51),
  });
  yPosition -= 22;
  
  page.drawText(companyName, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 18;
  
  page.drawText(`Period: ${dateRange.start} - ${dateRange.end}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 30;
  
  const byProject = new Map<string, { name: string; entries: TimeEntry[]; totalMinutes: number }>();
  
  for (const entry of entries) {
    const projectId = entry.projects?.id || 'no-project';
    const projectName = entry.projects?.name || 'No Project';
    
    if (!byProject.has(projectId)) {
      byProject.set(projectId, { name: projectName, entries: [], totalMinutes: 0 });
    }
    
    const proj = byProject.get(projectId)!;
    proj.entries.push(entry);
    proj.totalMinutes += entry.duration_minutes || 0;
  }
  
  const headers = ['Employee', 'Emp #', 'Date', 'In', 'Out', 'Hours'];
  const colWidths = [120, 60, 90, 60, 60, 65];
  
  for (const [, proj] of byProject) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }
    
    page.drawRectangle({
      x: 50,
      y: yPosition - 4,
      width: pageWidth - 100,
      height: 18,
      color: rgb(0.94, 0.98, 1),
    });
    
    page.drawText(`${proj.name} - Total: ${formatDuration(proj.totalMinutes)}`, {
      x: 55,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 25;
    
    let xPos = 50;
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], {
        x: xPos,
        y: yPosition,
        size: 8,
        font: boldFont,
        color: rgb(0.4, 0.4, 0.4),
      });
      xPos += colWidths[i];
    }
    yPosition -= 14;
    
    for (const entry of proj.entries) {
      if (yPosition < 60) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - 50;
      }
      
      const name = getEmployeeName(entry);
      const empNumber = entry.profiles.employee_id || '-';
      const date = formatShortDate(entry.start_time, timezone);
      const clockIn = formatTime(entry.start_time, timezone);
      const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Open';
      const duration = formatDuration(entry.duration_minutes);
      
      const rowData = [
        name.substring(0, 20),
        empNumber.substring(0, 8),
        date,
        clockIn,
        clockOut,
        duration
      ];
      
      xPos = 50;
      for (let i = 0; i < rowData.length; i++) {
        page.drawText(rowData[i], {
          x: xPos,
          y: yPosition,
          size: 8,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
        xPos += colWidths[i];
      }
      yPosition -= 13;
    }
    
    yPosition -= 10;
  }
  
  if (entries.length === 0) {
    page.drawText('No time entries found for this period.', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  lastPage.drawText(`Generated by CICO on ${new Date().toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  return await pdfDoc.save();
}

async function generateWeeklyPayrollPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  _timezone: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612;
  const pageHeight = 792;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - 50;
  
  page.drawText(reportName || 'Weekly Payroll Report', {
    x: 50,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.55, 0.36, 0.96),
  });
  yPosition -= 22;
  
  page.drawText(companyName, {
    x: 50,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 18;
  
  page.drawText(`Pay Period: ${dateRange.start} - ${dateRange.end}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 30;
  
  const byEmployee = new Map<string, { name: string; employeeNumber: string; totalMinutes: number; days: Set<string> }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, employeeNumber, totalMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.days.add(entry.start_time.split('T')[0]);
  }
  
  const headers = ['Employee', 'Emp #', 'Days', 'Regular', 'Overtime', 'Total'];
  const colWidths = [140, 70, 50, 80, 80, 80];
  let xPos = 50;
  
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: xPos,
      y: yPosition,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    xPos += colWidths[i];
  }
  yPosition -= 15;
  
  page.drawLine({
    start: { x: 50, y: yPosition + 5 },
    end: { x: pageWidth - 50, y: yPosition + 5 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  yPosition -= 8;
  
  let grandTotalMinutes = 0;
  
  for (const [, emp] of byEmployee) {
    if (yPosition < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }
    
    grandTotalMinutes += emp.totalMinutes;
    const regularMinutes = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    const rowData = [
      emp.name.substring(0, 22),
      emp.employeeNumber.substring(0, 10),
      emp.days.size.toString(),
      formatDuration(regularMinutes),
      formatDuration(overtimeMinutes),
      formatDuration(emp.totalMinutes)
    ];
    
    xPos = 50;
    for (let i = 0; i < rowData.length; i++) {
      page.drawText(rowData[i], {
        x: xPos,
        y: yPosition,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      xPos += colWidths[i];
    }
    yPosition -= 14;
  }
  
  // Grand total
  yPosition -= 5;
  page.drawLine({
    start: { x: 50, y: yPosition + 10 },
    end: { x: pageWidth - 50, y: yPosition + 10 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  
  page.drawText('Grand Total:', {
    x: 50,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  page.drawText(formatDuration(grandTotalMinutes), {
    x: 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
    y: yPosition,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  if (entries.length === 0) {
    page.drawText('No time entries found for this period.', {
      x: 50,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  lastPage.drawText(`Generated by CICO on ${new Date().toLocaleString()}`, {
    x: 50,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  return await pdfDoc.save();
}

// ============= HTML Generation Functions =============

function generateEmployeeTimecardHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): string {
  let tableRows = '';
  let totalMinutes = 0;

  for (const entry of entries) {
    const name = getEmployeeName(entry);
    const projectName = entry.projects?.name || 'No Project';
    const date = formatShortDate(entry.start_time, timezone);
    const clockIn = formatTime(entry.start_time, timezone);
    const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Open';
    const duration = formatDuration(entry.duration_minutes);
    const entryType = entry.is_break ? 'Break' : 'Work';
    const typeColor = entry.is_break ? '#f59e0b' : '#3b82f6';
    totalMinutes += entry.duration_minutes || 0;
    
    tableRows += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${projectName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${date}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockIn}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockOut}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><span style="color: ${typeColor}; font-weight: 500;">${entryType}</span></td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${duration}</td>
      </tr>
    `;
  }

  if (entries.length === 0) {
    tableRows = `
      <tr>
        <td colspan="7" style="padding: 24px; text-align: center; color: #6b7280;">
          No time entries found for this period.
        </td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${reportName || 'Employee Timecard Report'}</h1>
          <p style="margin: 0; opacity: 0.9;">${companyName}</p>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Period:</strong> ${dateRange.start} - ${dateRange.end}
          </p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Total Hours:</strong> ${formatDuration(totalMinutes)}
          </p>
        </div>
        
        <div style="padding: 12px 24px; background: #eff6ff; border-bottom: 1px solid #bfdbfe;">
          <p style="margin: 0; color: #1d4ed8; font-size: 13px;">
            📎 <strong>Attachments:</strong> Detailed PDF (Time Entry Cards) and CSV files are attached.
          </p>
        </div>
        
        <div style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Employee</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Project</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">In</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Out</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Type</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Hours</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Generated by CICO on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateProjectTimecardHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): string {
  // Group entries by project
  const byProject = new Map<string, { name: string; entries: TimeEntry[]; totalMinutes: number }>();
  
  for (const entry of entries) {
    const projectId = entry.projects?.id || 'no-project';
    const projectName = entry.projects?.name || 'No Project';
    
    if (!byProject.has(projectId)) {
      byProject.set(projectId, { name: projectName, entries: [], totalMinutes: 0 });
    }
    
    const proj = byProject.get(projectId)!;
    proj.entries.push(entry);
    proj.totalMinutes += entry.duration_minutes || 0;
  }

  let projectSections = '';
  let grandTotalMinutes = 0;

  for (const [, proj] of byProject) {
    grandTotalMinutes += proj.totalMinutes;
    
    let rows = '';
    for (const entry of proj.entries) {
      const name = getEmployeeName(entry);
      const date = formatShortDate(entry.start_time, timezone);
      const clockIn = formatTime(entry.start_time, timezone);
      const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Open';
      const duration = formatDuration(entry.duration_minutes);
      
      rows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${date}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${clockIn}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${clockOut}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${duration}</td>
        </tr>
      `;
    }

    projectSections += `
      <div style="margin-bottom: 24px;">
        <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px 6px 0 0; border: 1px solid #bbf7d0;">
          <h3 style="margin: 0; font-size: 16px; color: #166534;">${proj.name}</h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #15803d;">Total: ${formatDuration(proj.totalMinutes)}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e5e7eb; border-top: none;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Employee</th>
              <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Date</th>
              <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">In</th>
              <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Out</th>
              <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  if (entries.length === 0) {
    projectSections = `
      <div style="padding: 24px; text-align: center; color: #6b7280;">
        No time entries found for this period.
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${reportName || 'Project Timecard Report'}</h1>
          <p style="margin: 0; opacity: 0.9;">${companyName}</p>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Period:</strong> ${dateRange.start} - ${dateRange.end}
          </p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Total Hours:</strong> ${formatDuration(grandTotalMinutes)}
          </p>
        </div>
        
        <div style="padding: 12px 24px; background: #ecfdf5; border-bottom: 1px solid #a7f3d0;">
          <p style="margin: 0; color: #047857; font-size: 13px;">
            📎 <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
          </p>
        </div>
        
        <div style="padding: 24px;">
          ${projectSections}
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Generated by CICO on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateWeeklyPayrollHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  _timezone: string
): string {
  const byEmployee = new Map<string, { name: string; totalMinutes: number; days: Set<string> }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, totalMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.days.add(entry.start_time.split('T')[0]);
  }

  let tableRows = '';
  let grandTotalMinutes = 0;

  const sortedEmployees = Array.from(byEmployee.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));

  for (const [, emp] of sortedEmployees) {
    grandTotalMinutes += emp.totalMinutes;
    const regularHours = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    tableRows += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${emp.days.size}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDuration(regularHours)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${overtimeMinutes > 0 ? '#dc2626' : '#6b7280'};">${formatDuration(overtimeMinutes)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatDuration(emp.totalMinutes)}</td>
      </tr>
    `;
  }

  if (entries.length === 0) {
    tableRows = `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: #6b7280;">
          No time entries found for this period.
        </td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${reportName || 'Weekly Payroll Report'}</h1>
          <p style="margin: 0; opacity: 0.9;">${companyName}</p>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Pay Period:</strong> ${dateRange.start} - ${dateRange.end}
          </p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Total Hours:</strong> ${formatDuration(grandTotalMinutes)}
          </p>
        </div>
        
        <div style="padding: 12px 24px; background: #f5f3ff; border-bottom: 1px solid #e9d5ff;">
          <p style="margin: 0; color: #6d28d9; font-size: 13px;">
            📎 <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
          </p>
        </div>
        
        <div style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Employee</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Days</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Regular</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Overtime</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #f9fafb;">
                <td colspan="4" style="padding: 12px; font-weight: 600; border-top: 2px solid #e5e7eb;">Grand Total</td>
                <td style="padding: 12px; font-weight: 700; border-top: 2px solid #e5e7eb;">${formatDuration(grandTotalMinutes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Generated by CICO on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============= Date Range Function =============

function getDateRange(frequency: string, timezone: string): { startDate: Date; endDate: Date; start: string; end: string } {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const localYear = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
  const localMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const localDay = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  let startDate: Date;
  let endDate: Date;

  switch (frequency) {
    case 'daily':
      const yesterday = new Date(Date.UTC(localYear, localMonth, localDay - 1, 0, 0, 0, 0));
      startDate = yesterday;
      endDate = new Date(Date.UTC(localYear, localMonth, localDay - 1, 23, 59, 59, 999));
      break;
    case 'weekly':
      const todayLocal = new Date(Date.UTC(localYear, localMonth, localDay));
      const dayOfWeek = todayLocal.getUTCDay();
      const lastSaturday = new Date(Date.UTC(localYear, localMonth, localDay - dayOfWeek - 1, 23, 59, 59, 999));
      const lastSunday = new Date(Date.UTC(localYear, localMonth, localDay - dayOfWeek - 7, 0, 0, 0, 0));
      startDate = lastSunday;
      endDate = lastSaturday;
      break;
    case 'monthly':
      startDate = new Date(Date.UTC(localYear, localMonth - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(localYear, localMonth, 0, 23, 59, 59, 999));
      break;
    default:
      startDate = new Date(now);
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setUTCHours(23, 59, 59, 999);
  }

  return {
    startDate,
    endDate,
    start: formatDate(startDate.toISOString()),
    end: formatDate(endDate.toISOString())
  };
}

// Helper to encode binary data to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============= Main Handler =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const scheduled_report_id = body.scheduled_report_id || body.report_id;
    const recipient_email = body.recipient_email || body.test_email;
    const preview_only = body.preview_only || false;

    if (!scheduled_report_id) {
      return new Response(
        JSON.stringify({ error: 'report_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the report with company info
    const { data: report, error: reportError } = await supabase
      .from('scheduled_reports')
      .select('*, companies(company_name, timezone)')
      .eq('id', scheduled_report_id)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing test report: ${report.name || report.id} (${report.report_type})`);

    // Get date range based on frequency and company timezone
    const companyTimezone = (report.companies as { timezone?: string })?.timezone || 'America/Los_Angeles';
    const companyName = (report.companies as { company_name?: string })?.company_name || 'Unknown Company';
    const dateRange = getDateRange(report.schedule_frequency, companyTimezone);
    
    console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);

    // Build time entries query with expanded fields for Time Entry Details
    let query = supabase
      .from('time_entries')
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
        profiles!time_entries_profile_id_fkey(
          id,
          first_name,
          last_name,
          display_name,
          department_id,
          employee_id
        ),
        projects(
          id,
          name
        )
      `)
      .eq('company_id', report.company_id)
      .gte('start_time', dateRange.startDate.toISOString())
      .lte('start_time', dateRange.endDate.toISOString())
      .order('start_time', { ascending: true });

    // Apply department filter if scope is "department"
    const config = report.report_config as ReportConfig;
    if (config?.scope === 'department' && config.department_ids?.length) {
      query = query.in('profiles.department_id', config.department_ids);
    }

    // Apply project filter if applicable
    if (config?.project_ids?.length) {
      query = query.in('project_id', config.project_ids);
    }

    const { data: entries, error: entriesError } = await query;

    if (entriesError) {
      console.error(`Error fetching entries:`, entriesError);
      throw entriesError;
    }

    console.log(`Found ${entries?.length || 0} time entries`);

    // Generate HTML, CSV, and PDF based on report type
    const typedEntries = (entries || []) as unknown as TimeEntry[];
    
    let html: string;
    let csvContent: string;
    let pdfBytes: Uint8Array;
    let attachmentPrefix: string;

    switch (report.report_type) {
      case 'employee_timecard':
        html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange, companyTimezone);
        csvContent = generateEmployeeTimecardCSV(typedEntries, companyTimezone);
        // Use the new Time Entry Details PDF generator for employee timecard
        pdfBytes = await generateTimeEntryDetailsPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
        attachmentPrefix = 'employee-timecard';
        break;
      case 'project_timecard':
        html = generateProjectTimecardHtml(typedEntries, companyName, report.name, dateRange, companyTimezone);
        csvContent = generateProjectTimecardCSV(typedEntries, companyTimezone);
        pdfBytes = await generateProjectTimecardPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
        attachmentPrefix = 'project-timecard';
        break;
      case 'weekly_payroll':
      case 'monthly_project_billing':
        html = generateWeeklyPayrollHtml(typedEntries, companyName, report.name, dateRange, companyTimezone);
        csvContent = generateWeeklyPayrollCSV(typedEntries);
        pdfBytes = await generateWeeklyPayrollPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
        attachmentPrefix = 'payroll';
        break;
      default:
        html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange, companyTimezone);
        csvContent = generateEmployeeTimecardCSV(typedEntries, companyTimezone);
        pdfBytes = await generateTimeEntryDetailsPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
        attachmentPrefix = 'timecard';
    }

    // If preview only, return the HTML without sending
    if (preview_only) {
      return new Response(
        JSON.stringify({ success: true, html }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient email - either from request or fetch first recipient from report
    let emailTo = recipient_email;
    if (!emailTo) {
      const { data: recipients } = await supabase
        .from('scheduled_report_recipients')
        .select('email')
        .eq('scheduled_report_id', scheduled_report_id)
        .limit(1);
      
      if (recipients && recipients.length > 0) {
        emailTo = recipients[0].email;
      }
    }

    if (!emailTo) {
      return new Response(
        JSON.stringify({ error: 'No recipient email provided and no recipients configured for this report' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert PDF bytes to base64
    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

    // Create filename with date
    const dateStr = dateRange.start.replace(/[^a-zA-Z0-9]/g, '-');
    const csvFilename = `${attachmentPrefix}-${dateStr}.csv`;
    const pdfFilename = `${attachmentPrefix}-${dateStr}.pdf`;

    const subject = `[TEST] ${getReportTypeName(report.report_type)}: ${report.name || companyName} - ${dateRange.start}`;

    const emailResponse = await resend.emails.send({
      from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
      to: [emailTo],
      subject,
      html,
      attachments: [
        {
          filename: csvFilename,
          content: csvContent,
        },
        {
          filename: pdfFilename,
          content: pdfBase64,
        }
      ],
    });

    console.log('Test email sent with attachments:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_response: emailResponse,
        entries_count: entries?.length || 0,
        date_range: dateRange,
        attachments: [csvFilename, pdfFilename]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-test-report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
