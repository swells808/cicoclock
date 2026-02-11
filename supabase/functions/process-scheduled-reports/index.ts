import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate cron secret for automated job authentication
function validateCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.warn('[SECURITY] CRON_SECRET not configured - allowing request for backwards compatibility');
    return true;
  }
  
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === cronSecret) return true;
  }
  
  const cronHeader = req.headers.get('X-Cron-Secret');
  if (cronHeader === cronSecret) return true;
  
  return false;
}

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

// HTML escape function to prevent XSS attacks
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

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

// ============= Image URL Helpers =============

async function getSignedUrl(supabase: any, bucket: string, path: string): Promise<string | null> {
  let cleanPath = path;
  if (path.startsWith(`${bucket}/`)) {
    cleanPath = path.replace(`${bucket}/`, '');
  }
  
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, 3600);
  if (error) {
    console.error(`Failed to sign ${bucket}/${cleanPath}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

async function resolvePhotoUrl(supabase: any, photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  
  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }
  
  return getSignedUrl(supabase, 'timeclock-photos', photoUrl);
}

function getMapUrl(latitude: number | null, longitude: number | null, isClockIn: boolean): string | null {
  if (!latitude || !longitude) return null;
  
  const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
  if (!mapboxToken) {
    console.warn('MAPBOX_PUBLIC_TOKEN not configured');
    return null;
  }
  
  const pinColor = isClockIn ? '22c55e' : 'ef4444';
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+${pinColor}(${longitude},${latitude})/${longitude},${latitude},15/80x80@2x?access_token=${mapboxToken}`;
}

// ============= Timeline Calculation for HTML =============

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 20;
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
const SCHEDULED_START_HOUR = 8;
const SCHEDULED_END_HOUR = 17;

function getHourFromDate(dateStr: string, timezone: string): number {
  const date = new Date(dateStr);
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

function getPositionPercent(hour: number): number {
  return ((hour - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
}

interface TimeSegment {
  type: 'regular' | 'late' | 'overtime' | 'break';
  startPercent: number;
  widthPercent: number;
}

function calculateHtmlSegments(entry: TimeEntry, timezone: string): TimeSegment[] {
  const clockInHour = getHourFromDate(entry.start_time, timezone);
  const clockOutHour = entry.end_time 
    ? getHourFromDate(entry.end_time, timezone) 
    : getHourFromDate(new Date().toISOString(), timezone);
  
  const segments: TimeSegment[] = [];
  
  const scheduledStartMinutes = SCHEDULED_START_HOUR * 60;
  const clockInMinutes = clockInHour * 60;
  const isLate = clockInMinutes > scheduledStartMinutes + 10;
  
  if (isLate && !entry.is_break) {
    segments.push({ 
      type: 'late', 
      startPercent: getPositionPercent(SCHEDULED_START_HOUR), 
      widthPercent: getPositionPercent(clockInHour) - getPositionPercent(SCHEDULED_START_HOUR) 
    });
  }
  
  const scheduledEndMinutes = SCHEDULED_END_HOUR * 60;
  const clockOutMinutes = clockOutHour * 60;
  
  if (entry.is_break) {
    segments.push({ 
      type: 'break', 
      startPercent: getPositionPercent(clockInHour), 
      widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour) 
    });
  } else if (clockInMinutes >= scheduledEndMinutes) {
    segments.push({ 
      type: 'overtime', 
      startPercent: getPositionPercent(clockInHour), 
      widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour) 
    });
  } else if (clockOutMinutes > scheduledEndMinutes) {
    const scheduledEndHourFloat = scheduledEndMinutes / 60;
    segments.push({ 
      type: 'regular', 
      startPercent: getPositionPercent(clockInHour), 
      widthPercent: getPositionPercent(scheduledEndHourFloat) - getPositionPercent(clockInHour) 
    });
    segments.push({ 
      type: 'overtime', 
      startPercent: getPositionPercent(scheduledEndHourFloat), 
      widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(scheduledEndHourFloat) 
    });
  } else {
    segments.push({ 
      type: 'regular', 
      startPercent: getPositionPercent(clockInHour), 
      widthPercent: getPositionPercent(clockOutHour) - getPositionPercent(clockInHour) 
    });
  }
  
  return segments;
}

// ============= Rich HTML Generation for Time Entry Details (Matching Web UI) =============

async function generateTimeEntryDetailsHtml(
  entries: TimeEntry[],
  companyName: string,
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string,
  supabase: any
): Promise<string> {
  let totalMinutes = 0;
  let cardHtml = '';
  
  const segmentColors = {
    regular: '#3b82f6',
    late: '#f97316',
    overtime: '#ef4444',
    break: '#14b8a6',
  };
  
  for (const entry of entries) {
    totalMinutes += entry.duration_minutes || 0;
    
    // Escape all user-controlled values to prevent XSS
    const employeeName = escapeHtml(getEmployeeName(entry));
    const projectName = escapeHtml(entry.projects?.name || 'No Project');
    const clockInAddress = escapeHtml(entry.clock_in_address);
    const clockOutAddress = escapeHtml(entry.clock_out_address);
    const dateStr = formatLongDate(entry.start_time, timezone);
    const clockInTime = formatTime(entry.start_time, timezone);
    const clockOutTime = entry.end_time ? formatTime(entry.end_time, timezone) : 'Active';
    const duration = formatDuration(entry.duration_minutes);
    const isComplete = entry.end_time !== null;
    const isBreak = entry.is_break;
    
    const clockInPhotoUrl = await resolvePhotoUrl(supabase, entry.clock_in_photo_url);
    const clockOutPhotoUrl = await resolvePhotoUrl(supabase, entry.clock_out_photo_url);
    
    const clockInMapUrl = getMapUrl(entry.clock_in_latitude, entry.clock_in_longitude, true);
    const clockOutMapUrl = getMapUrl(entry.clock_out_latitude, entry.clock_out_longitude, false);
    
    const segments = calculateHtmlSegments(entry, timezone);
    
    let segmentsHtml = '';
    for (const seg of segments) {
      segmentsHtml += `<div style="position: absolute; top: 2px; bottom: 2px; left: ${seg.startPercent}%; width: ${Math.max(seg.widthPercent, 0.5)}%; background: ${segmentColors[seg.type]}; border-radius: 3px;"></div>`;
    }
    
    let ticksHtml = '';
    let labelsHtml = '';
    for (let hour = TIMELINE_START_HOUR; hour <= TIMELINE_END_HOUR; hour += 2) {
      const percent = getPositionPercent(hour);
      ticksHtml += `<div style="position: absolute; left: ${percent}%; top: 0; bottom: 0; width: 1px; background: #d1d5db;"></div>`;
      const labelText = hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`;
      labelsHtml += `<span style="position: absolute; left: ${percent}%; transform: translateX(-50%); font-size: 10px; color: #6b7280;">${labelText}</span>`;
    }
    
    const schedStartPercent = getPositionPercent(SCHEDULED_START_HOUR);
    const schedEndPercent = getPositionPercent(SCHEDULED_END_HOUR);
    const schedWindowHtml = `
      <div style="position: absolute; left: ${schedStartPercent}%; top: 0; bottom: 0; width: 2px; border-left: 2px dashed rgba(59, 130, 246, 0.4);"></div>
      <div style="position: absolute; left: ${schedEndPercent}%; top: 0; bottom: 0; width: 2px; border-left: 2px dashed rgba(59, 130, 246, 0.4);"></div>
    `;
    
    const statusBadge = isComplete
      ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px;">&#10003; Complete</span>`
      : `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 9999px;">&#9679; Active</span>`;
    
    const typeBadge = isBreak
      ? `<span style="font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px;">Break</span>`
      : `<span style="font-size: 11px; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px;">Work</span>`;
    
    const clockInPanel = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; background: #dcfce7; border-radius: 8px; min-width: 100px;">
        <span style="font-size: 11px; font-weight: 500; color: #166534;">Clock In</span>
        <span style="font-size: 14px; font-weight: 700; color: #15803d;">${clockInTime}</span>
        <div style="display: flex; gap: 4px;">
          ${clockInPhotoUrl ? `<img src="${clockInPhotoUrl}" alt="Photo" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #86efac;" />` : `<div style="width: 40px; height: 40px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #6b7280;">Photo</div>`}
          ${clockInMapUrl ? `<img src="${clockInMapUrl}" alt="Map" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #86efac;" />` : `<div style="width: 40px; height: 40px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #6b7280;">Map</div>`}
        </div>
        ${clockInAddress ? `<p style="font-size: 9px; color: #6b7280; text-align: center; margin: 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${clockInAddress}</p>` : ''}
      </div>
    `;
    
    const clockOutBgColor = isComplete ? '#fee2e2' : '#f5f5f4';
    const clockOutTextColor = isComplete ? '#dc2626' : '#78716c';
    const clockOutLabelColor = isComplete ? '#b91c1c' : '#78716c';
    const clockOutBorderColor = isComplete ? '#fecaca' : '#d6d3d1';
    
    const clockOutPanel = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; background: ${clockOutBgColor}; border-radius: 8px; min-width: 100px;">
        <span style="font-size: 11px; font-weight: 500; color: ${clockOutLabelColor};">Clock Out</span>
        <span style="font-size: 14px; font-weight: 700; color: ${clockOutTextColor};">${clockOutTime}</span>
        <div style="display: flex; gap: 4px;">
          ${clockOutPhotoUrl ? `<img src="${clockOutPhotoUrl}" alt="Photo" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid ${clockOutBorderColor};" />` : `<div style="width: 40px; height: 40px; background: ${isComplete ? '#fef2f2' : '#fafaf9'}; border: 1px dashed ${clockOutBorderColor}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #6b7280;">Photo</div>`}
          ${clockOutMapUrl ? `<img src="${clockOutMapUrl}" alt="Map" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid ${clockOutBorderColor};" />` : `<div style="width: 40px; height: 40px; background: ${isComplete ? '#fef2f2' : '#fafaf9'}; border: 1px dashed ${clockOutBorderColor}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #6b7280;">Map</div>`}
        </div>
        ${clockOutAddress ? `<p style="font-size: 9px; color: #6b7280; text-align: center; margin: 0; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${clockOutAddress}</p>` : ''}
      </div>
    `;
    
    cardHtml += `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px; background: white; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-weight: 600; font-size: 13px;">${dateStr}</span>
            <span style="color: #9ca3af;">|</span>
            <span style="font-size: 13px; font-weight: 500;">${employeeName}</span>
            <span style="color: #9ca3af;">|</span>
            <span style="font-size: 13px; color: #6b7280;">${projectName}</span>
            ${typeBadge}
            ${statusBadge}
          </div>
          <span style="font-size: 13px; font-weight: 500;">Duration: ${duration}</span>
        </div>
        
        <div style="display: flex; align-items: stretch; gap: 12px; padding: 16px;">
          ${clockInPanel}
          
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 200px;">
            <div style="position: relative; height: 16px; margin-bottom: 4px;">
              ${labelsHtml}
            </div>
            
            <div style="position: relative; height: 24px; background: #f3f4f6; border-radius: 6px; overflow: hidden;">
              ${ticksHtml}
              ${schedWindowHtml}
              ${segmentsHtml}
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; border-radius: 2px; background: #3b82f6;"></div><span style="font-size: 10px; color: #6b7280;">Regular</span></div>
              <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; border-radius: 2px; background: #f97316;"></div><span style="font-size: 10px; color: #6b7280;">Late</span></div>
              <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; border-radius: 2px; background: #ef4444;"></div><span style="font-size: 10px; color: #6b7280;">Overtime</span></div>
              <div style="display: flex; align-items: center; gap: 4px;"><div style="width: 10px; height: 10px; border-radius: 2px; background: #14b8a6;"></div><span style="font-size: 10px; color: #6b7280;">Break</span></div>
            </div>
          </div>
          
          ${clockOutPanel}
        </div>
      </div>
    `;
  }
  
  if (entries.length === 0) {
    cardHtml = `
      <div style="padding: 40px; text-align: center; color: #6b7280; background: #f9fafb; border-radius: 8px;">
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
      <div style="max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${escapeHtml(reportName) || 'Time Entry Details Report'}</h1>
          <p style="margin: 0; opacity: 0.9;">${escapeHtml(companyName)}</p>
        </div>
        
        <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Period:</strong> ${dateRange.start} - ${dateRange.end}
          </p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Total Hours:</strong> ${formatDuration(totalMinutes)} &nbsp;|&nbsp; <strong>Entries:</strong> ${entries.length}
          </p>
        </div>
        
        <div style="padding: 12px 24px; background: #eff6ff; border-bottom: 1px solid #bfdbfe;">
          <p style="margin: 0; color: #1d4ed8; font-size: 13px;">
            &#128206; <strong>Attachments:</strong> A tabular PDF summary and CSV file are attached for download.
          </p>
        </div>
        
        <div style="padding: 24px;">
          ${cardHtml}
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

// ============= Simple Tabular PDF for Time Entry Details (No Images) =============

async function generateSimpleTimecardPDF(
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
  
  page.drawText(reportName || 'Time Entry Details Report', {
    x: 40,
    y: yPosition,
    size: 16,
    font: boldFont,
    color: rgb(0.23, 0.32, 0.96),
  });
  yPosition -= 20;
  
  page.drawText(companyName, {
    x: 40,
    y: yPosition,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 16;
  
  page.drawText(`Period: ${dateRange.start} - ${dateRange.end}`, {
    x: 40,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 12;
  
  page.drawText(`Total Entries: ${entries.length}`, {
    x: 40,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 25;
  
  const headers = ['Date', 'Employee', 'Project', 'In', 'Out', 'Type', 'Duration'];
  const colX = [40, 110, 200, 280, 335, 390, 430];
  
  page.drawRectangle({
    x: 38,
    y: yPosition - 4,
    width: pageWidth - 76,
    height: 16,
    color: rgb(0.95, 0.95, 0.97),
  });
  
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: colX[i],
      y: yPosition,
      size: 8,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
  yPosition -= 18;
  
  page.drawLine({
    start: { x: 38, y: yPosition + 10 },
    end: { x: pageWidth - 38, y: yPosition + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  
  let totalMinutes = 0;
  
  for (const entry of entries) {
    if (yPosition < 60) {
      page.drawText(`Page ${pdfDoc.getPageCount()}`, {
        x: pageWidth / 2 - 20,
        y: 30,
        size: 8,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
      
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
      
      page.drawRectangle({
        x: 38,
        y: yPosition - 4,
        width: pageWidth - 76,
        height: 16,
        color: rgb(0.95, 0.95, 0.97),
      });
      
      for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], {
          x: colX[i],
          y: yPosition,
          size: 8,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      yPosition -= 18;
    }
    
    totalMinutes += entry.duration_minutes || 0;
    
    const employeeName = getEmployeeName(entry);
    const projectName = entry.projects?.name || 'No Project';
    const date = formatShortDate(entry.start_time, timezone);
    const clockIn = formatTime(entry.start_time, timezone);
    const clockOut = entry.end_time ? formatTime(entry.end_time, timezone) : 'Active';
    const entryType = entry.is_break ? 'Break' : 'Work';
    const duration = formatDuration(entry.duration_minutes);
    
    const rowData = [
      date,
      employeeName.substring(0, 14),
      projectName.substring(0, 12),
      clockIn,
      clockOut,
      entryType,
      duration
    ];
    
    for (let i = 0; i < rowData.length; i++) {
      page.drawText(rowData[i], {
        x: colX[i],
        y: yPosition,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
    yPosition -= 13;
  }
  
  yPosition -= 5;
  page.drawLine({
    start: { x: 38, y: yPosition + 10 },
    end: { x: pageWidth - 38, y: yPosition + 10 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  
  page.drawText('Total Hours:', {
    x: 40,
    y: yPosition,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  page.drawText(formatDuration(totalMinutes), {
    x: colX[6],
    y: yPosition,
    size: 10,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  if (entries.length === 0) {
    page.drawText('No time entries found for this period.', {
      x: 40,
      y: yPosition,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`Generated by CICO | Page ${i + 1} of ${pages.length}`, {
      x: 40,
      y: 20,
      size: 8,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }
  
  console.info(`Generated simple tabular PDF with ${pages.length} pages for ${entries.length} entries`);
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

// ============= Other HTML Generation Functions =============

function generateProjectTimecardHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string },
  timezone: string
): string {
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
            &#128206; <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
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
            &#128206; <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
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

  // Validate cron secret for automation security
  if (!validateCronSecret(req)) {
    console.warn('[SECURITY] Unauthorized cron request to process-scheduled-reports');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid or missing cron secret' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled reports processing...');

    const now = new Date();

    // Fetch ALL active reports with their company timezone — filtering happens in code
    const { data: reports, error: reportsError } = await supabase
      .from('scheduled_reports')
      .select('*, companies(company_name, timezone)')
      .eq('is_active', true);

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      throw reportsError;
    }

    console.log(`Found ${reports?.length || 0} total active reports`);

    const results = [];

    for (const report of reports || []) {
      try {
        console.log(`Processing report: ${report.name || report.id} (${report.report_type})`);

        // Determine the company's timezone
        const companyTimezone = (report.companies as { timezone?: string })?.timezone || 'America/Los_Angeles';

        // Convert "now" to the company's local time
        const localNowStr = now.toLocaleString('en-US', { timeZone: companyTimezone });
        const localNow = new Date(localNowStr);
        const localHour = localNow.getHours();
        const localDOW = localNow.getDay();
        const localDOM = localNow.getDate();

        // Parse the report's scheduled hour from schedule_time (e.g. "00:05:00" or "08:00")
        const scheduledHour = parseInt(report.schedule_time.split(':')[0], 10);

        // Check if the current local hour matches the scheduled hour
        if (localHour !== scheduledHour) {
          console.log(`Skipping report ${report.id} - local hour ${localHour} != scheduled hour ${scheduledHour} (tz: ${companyTimezone})`);
          continue;
        }

        // Check if frequency matches the current local day
        if (report.schedule_frequency === 'weekly' && report.schedule_day_of_week !== localDOW) {
          console.log(`Skipping weekly report - scheduled for day ${report.schedule_day_of_week}, local day is ${localDOW}`);
          continue;
        }

        if (report.schedule_frequency === 'monthly' && report.schedule_day_of_month !== localDOM) {
          console.log(`Skipping monthly report - scheduled for day ${report.schedule_day_of_month}, local day is ${localDOM}`);
          continue;
        }

        // Get recipients
        const { data: recipients, error: recipientsError } = await supabase
          .from('scheduled_report_recipients')
          .select('email')
          .eq('scheduled_report_id', report.id);

        if (recipientsError) {
          console.error(`Error fetching recipients for report ${report.id}:`, recipientsError);
          continue;
        }

        if (!recipients || recipients.length === 0) {
          console.log(`No recipients for report ${report.id}, skipping`);
          continue;
        }

        const companyName = (report.companies as { company_name?: string })?.company_name || 'Unknown Company';
        const dateRange = getDateRange(report.schedule_frequency, companyTimezone);

        // Build query for time entries
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

        const config = report.report_config as ReportConfig;
        if (config?.scope === 'department' && config.department_ids?.length) {
          query = query.in('profiles.department_id', config.department_ids);
        }

        if (config?.project_ids?.length) {
          query = query.in('project_id', config.project_ids);
        }

        const { data: entries, error: entriesError } = await query;

        if (entriesError) {
          console.error(`Error fetching entries for report ${report.id}:`, entriesError);
          continue;
        }

        console.log(`Found ${entries?.length || 0} entries for report ${report.id}`);

        const typedEntries = (entries || []) as unknown as TimeEntry[];

        let html: string;
        let csvContent: string;
        let pdfBytes: Uint8Array;
        let attachmentPrefix: string;

        switch (report.report_type) {
          case 'employee_timecard':
            html = await generateTimeEntryDetailsHtml(typedEntries, companyName, report.name, dateRange, companyTimezone, supabase);
            csvContent = generateEmployeeTimecardCSV(typedEntries, companyTimezone);
            pdfBytes = await generateSimpleTimecardPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
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
            html = await generateTimeEntryDetailsHtml(typedEntries, companyName, report.name, dateRange, companyTimezone, supabase);
            csvContent = generateEmployeeTimecardCSV(typedEntries, companyTimezone);
            pdfBytes = await generateSimpleTimecardPDF(typedEntries, companyName, report.name, dateRange, companyTimezone);
            attachmentPrefix = 'timecard';
        }

        const recipientEmails = recipients.map(r => r.email);

        const { error: emailError } = await resend.emails.send({
          from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
          to: recipientEmails,
          subject: `${report.name || getReportTypeName(report.report_type)} - ${dateRange.start}`,
          html: html,
          attachments: [
            {
              filename: `${attachmentPrefix}-${dateRange.start.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
              content: uint8ArrayToBase64(pdfBytes),
            },
            {
              filename: `${attachmentPrefix}-${dateRange.start.replace(/[^a-zA-Z0-9]/g, '-')}.csv`,
              content: btoa(csvContent),
            }
          ],
        });

        if (emailError) {
          console.error(`Email error for report ${report.id}:`, emailError);
          
          await supabase.from('report_execution_log').insert({
            scheduled_report_id: report.id,
            status: 'failed',
            recipients_count: recipientEmails.length,
            error_message: emailError.message || 'Unknown email error'
          });
          
          results.push({ report_id: report.id, success: false, error: emailError.message });
          continue;
        }

        await supabase.from('report_execution_log').insert({
          scheduled_report_id: report.id,
          status: 'success',
          recipients_count: recipientEmails.length
        });

        console.log(`Successfully sent report ${report.id} to ${recipientEmails.length} recipients`);
        results.push({ report_id: report.id, success: true, recipients: recipientEmails.length });

      } catch (reportError: unknown) {
        console.error(`Error processing report ${report.id}:`, reportError);
        const errorMessage = reportError instanceof Error ? reportError.message : 'Unknown error';
        results.push({ report_id: report.id, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in process-scheduled-reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
