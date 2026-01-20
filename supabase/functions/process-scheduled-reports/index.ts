import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  break_duration_minutes: number | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department_id: string | null;
  };
  projects: {
    id: string;
    name: string;
  } | null;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
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

function generateEmployeeTimecardHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string }
): string {
  // Group entries by employee
  const byEmployee = new Map<string, { name: string; entries: TimeEntry[]; totalMinutes: number }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, entries: [], totalMinutes: 0 });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.entries.push(entry);
    emp.totalMinutes += entry.duration_minutes || 0;
  }

  let tableRows = '';
  let grandTotalMinutes = 0;

  for (const [, emp] of byEmployee) {
    grandTotalMinutes += emp.totalMinutes;
    
    for (const entry of emp.entries) {
      const projectName = entry.projects?.name || 'No Project';
      const clockIn = formatTime(entry.clock_in);
      const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
      const duration = formatDuration(entry.duration_minutes);
      const breakTime = formatDuration(entry.break_duration_minutes);
      
      tableRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${emp.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${projectName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(entry.clock_in)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockIn}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockOut}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${breakTime}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${duration}</td>
        </tr>
      `;
    }
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
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${reportName || 'Employee Timecard Report'}</h1>
          <p style="margin: 0; opacity: 0.9;">${companyName}</p>
        </div>
        
        <!-- Report Info -->
        <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Period:</strong> ${dateRange.start} - ${dateRange.end}
          </p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Total Hours:</strong> ${formatDuration(grandTotalMinutes)}
          </p>
        </div>
        
        <!-- Table -->
        <div style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Employee</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Project</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Clock In</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Clock Out</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Break</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Hours</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
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
  dateRange: { start: string; end: string }
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

  let tableRows = '';
  let grandTotalMinutes = 0;

  for (const [, proj] of byProject) {
    grandTotalMinutes += proj.totalMinutes;
    
    // Project header row
    tableRows += `
      <tr style="background: #f0f9ff;">
        <td colspan="6" style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">
          ${proj.name} - Total: ${formatDuration(proj.totalMinutes)}
        </td>
      </tr>
    `;
    
    for (const entry of proj.entries) {
      const empName = entry.profiles.display_name || 
        `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
        'Unknown';
      const clockIn = formatTime(entry.clock_in);
      const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
      const duration = formatDuration(entry.duration_minutes);
      
      tableRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; padding-left: 24px;">${empName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDate(entry.clock_in)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockIn}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${clockOut}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDuration(entry.break_duration_minutes)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${duration}</td>
        </tr>
      `;
    }
  }

  if (entries.length === 0) {
    tableRows = `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #6b7280;">
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
        
        <div style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Employee</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Date</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Clock In</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Clock Out</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Break</th>
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

function generateWeeklyPayrollHtml(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string }
): string {
  // Group entries by employee and sum totals
  const byEmployee = new Map<string, { name: string; totalMinutes: number; breakMinutes: number; days: Set<string> }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = entry.profiles.display_name || 
      `${entry.profiles.first_name || ''} ${entry.profiles.last_name || ''}`.trim() || 
      'Unknown';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, totalMinutes: 0, breakMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.breakMinutes += entry.break_duration_minutes || 0;
    emp.days.add(entry.clock_in.split('T')[0]);
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
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${formatDuration(emp.breakMinutes)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${formatDuration(emp.totalMinutes)}</td>
      </tr>
    `;
  }

  if (entries.length === 0) {
    tableRows = `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #6b7280;">
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
            <strong>Total Payable Hours:</strong> ${formatDuration(grandTotalMinutes)}
          </p>
        </div>
        
        <div style="padding: 0; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Employee</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Days Worked</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Regular Hours</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Overtime</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Breaks</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
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

function getDateRange(frequency: string, timezone: string): { startDate: Date; endDate: Date; start: string; end: string } {
  // Get current time in the company's timezone
  const now = new Date();
  
  // Calculate offset for the timezone to determine "today" in their local time
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
  
  // Create dates in UTC but representing local time boundaries
  let startDate: Date;
  let endDate: Date;

  switch (frequency) {
    case 'daily':
      // Previous day in local time
      const yesterday = new Date(Date.UTC(localYear, localMonth, localDay - 1, 0, 0, 0, 0));
      startDate = yesterday;
      endDate = new Date(Date.UTC(localYear, localMonth, localDay - 1, 23, 59, 59, 999));
      break;
    case 'weekly':
      // Previous week (Sunday to Saturday) in local time
      const todayLocal = new Date(Date.UTC(localYear, localMonth, localDay));
      const dayOfWeek = todayLocal.getUTCDay();
      const lastSaturday = new Date(Date.UTC(localYear, localMonth, localDay - dayOfWeek - 1, 23, 59, 59, 999));
      const lastSunday = new Date(Date.UTC(localYear, localMonth, localDay - dayOfWeek - 7, 0, 0, 0, 0));
      startDate = lastSunday;
      endDate = lastSaturday;
      break;
    case 'monthly':
      // Previous month in local time
      startDate = new Date(Date.UTC(localYear, localMonth - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(localYear, localMonth, 0, 23, 59, 59, 999)); // Day 0 = last day of prev month
      break;
      break;
    default:
      // Default to previous day
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay(); // 0 = Sunday
    const currentDayOfMonth = now.getUTCDate();

    console.log(`Processing scheduled reports at ${now.toISOString()}`);
    console.log(`Current UTC hour: ${currentHour}, day of week: ${currentDay}, day of month: ${currentDayOfMonth}`);

    // Get all active scheduled reports with their recipients and company timezone
    const { data: activeReports, error: reportsError } = await supabase
      .from('scheduled_reports')
      .select(`
        *,
        companies(company_name, timezone),
        scheduled_report_recipients(id, email)
      `)
      .eq('is_active', true);

    if (reportsError) {
      console.error('Error fetching reports:', reportsError);
      throw reportsError;
    }

    if (!activeReports || activeReports.length === 0) {
      console.log('No active scheduled reports found');
      return new Response(
        JSON.stringify({ message: 'No active reports to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activeReports.length} active reports`);

    // Filter reports that should run now based on company timezone
    const reportsToRun = activeReports.filter(report => {
      const companyTimezone = (report.companies as { timezone?: string })?.timezone || 'America/Los_Angeles';
      
      // Get current hour in the company's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: companyTimezone,
        hour: '2-digit',
        hour12: false,
        weekday: 'short'
      });
      
      const parts = formatter.formatToParts(now);
      const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const localDayName = parts.find(p => p.type === 'weekday')?.value || '';
      
      // Map weekday name to number (Sunday = 0)
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const localDayOfWeek = dayMap[localDayName] ?? 0;
      
      // Get day of month in local timezone
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: companyTimezone,
        day: 'numeric'
      });
      const localDayOfMonth = parseInt(dayFormatter.format(now), 10);
      
      const scheduleHour = parseInt(report.schedule_time.split(':')[0], 10);
      
      console.log(`Report ${report.name}: schedule=${scheduleHour}:00, local=${localHour}:00 (${companyTimezone})`);
      
      // Check if hour matches in company's timezone
      if (scheduleHour !== localHour) {
        return false;
      }

      // Check frequency-specific conditions
      switch (report.schedule_frequency) {
        case 'daily':
          return true;
        case 'weekly':
          return report.schedule_day_of_week === localDayOfWeek;
        case 'monthly':
          return report.schedule_day_of_month === localDayOfMonth;
        default:
          return false;
      }
    });

    console.log(`${reportsToRun.length} reports scheduled to run this hour`);

    const results = [];

    for (const report of reportsToRun) {
      console.log(`Processing report: ${report.name || report.id} (${report.report_type})`);

      try {
        // Check if this report already ran today (prevent duplicates)
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        
        const { data: existingLog } = await supabase
          .from('report_execution_log')
          .select('id')
          .eq('scheduled_report_id', report.id)
          .gte('executed_at', todayStart.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Report ${report.id} already executed today, skipping`);
          continue;
        }

        // Get date range based on frequency and company timezone
        const companyTimezone = (report.companies as { timezone?: string })?.timezone || 'America/Los_Angeles';
        const dateRange = getDateRange(report.schedule_frequency, companyTimezone);
        console.log(`Date range: ${dateRange.start} to ${dateRange.end}`);

        // Build time entries query
        let query = supabase
          .from('time_entries')
          .select(`
            id,
            clock_in,
            clock_out,
            duration_minutes,
            break_duration_minutes,
            profiles!inner(
              id,
              first_name,
              last_name,
              display_name,
              department_id
            ),
            projects(
              id,
              name
            )
          `)
          .eq('company_id', report.company_id)
          .gte('clock_in', dateRange.startDate.toISOString())
          .lte('clock_in', dateRange.endDate.toISOString())
          .order('clock_in', { ascending: true });

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
          console.error(`Error fetching entries for report ${report.id}:`, entriesError);
          throw entriesError;
        }

        console.log(`Found ${entries?.length || 0} time entries for report`);

        // Generate HTML based on report type
        const companyName = report.companies?.company_name || 'Unknown Company';
        const typedEntries = (entries || []) as unknown as TimeEntry[];
        let html: string;

        switch (report.report_type) {
          case 'employee_timecard':
            html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange);
            break;
          case 'project_timecard':
            html = generateProjectTimecardHtml(typedEntries, companyName, report.name, dateRange);
            break;
          case 'weekly_payroll':
          case 'monthly_project_billing':
            html = generateWeeklyPayrollHtml(typedEntries, companyName, report.name, dateRange);
            break;
          default:
            html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange);
        }

        // Send to all recipients
        const recipients = report.scheduled_report_recipients || [];
        const recipientEmails = recipients.map((r: { email: string }) => r.email).filter(Boolean);

        if (recipientEmails.length === 0) {
          console.log(`No recipients for report ${report.id}, skipping email`);
          
          // Log execution anyway
          await supabase.from('report_execution_log').insert({
            scheduled_report_id: report.id,
            recipients_count: 0,
            status: 'no_recipients',
            error_message: 'No recipients configured'
          });
          
          continue;
        }

        console.log(`Sending report to ${recipientEmails.length} recipients: ${recipientEmails.join(', ')}`);

        const subject = `${getReportTypeName(report.report_type)}: ${report.name || companyName} - ${dateRange.start}`;

        const emailResponse = await resend.emails.send({
          from: 'CICO Reports <reports@resend.dev>',
          to: recipientEmails,
          subject,
          html,
        });

        console.log('Email sent:', emailResponse);

        // Log successful execution
        await supabase.from('report_execution_log').insert({
          scheduled_report_id: report.id,
          recipients_count: recipientEmails.length,
          status: 'success',
          error_message: null
        });

        results.push({
          report_id: report.id,
          report_name: report.name,
          status: 'success',
          recipients: recipientEmails.length,
          entries: entries?.length || 0
        });

      } catch (reportError) {
        console.error(`Error processing report ${report.id}:`, reportError);
        
        // Log failed execution
        await supabase.from('report_execution_log').insert({
          scheduled_report_id: report.id,
          recipients_count: 0,
          status: 'failed',
          error_message: reportError instanceof Error ? reportError.message : 'Unknown error'
        });

        results.push({
          report_id: report.id,
          report_name: report.name,
          status: 'failed',
          error: reportError instanceof Error ? reportError.message : 'Unknown error'
        });
      }
    }

    console.log(`Finished processing. Results:`, results);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} reports`,
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-scheduled-reports:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
