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

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
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

function generateEmployeeTimecardCSV(entries: TimeEntry[]): string {
  let csv = 'Employee,Employee Number,Project,Date,Clock In,Clock Out,Break,Duration\n';
  
  for (const entry of entries) {
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.clock_in);
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const breakTime = formatDuration(entry.break_duration_minutes);
    const duration = formatDuration(entry.duration_minutes);
    
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    
    csv += `${escapeCsv(name)},${escapeCsv(employeeNumber)},${escapeCsv(projectName)},${escapeCsv(date)},${escapeCsv(clockIn)},${escapeCsv(clockOut)},${escapeCsv(breakTime)},${escapeCsv(duration)}\n`;
  }
  
  return csv;
}

function generateProjectTimecardCSV(entries: TimeEntry[]): string {
  let csv = 'Project,Employee,Employee Number,Date,Clock In,Clock Out,Break,Duration\n';
  
  for (const entry of entries) {
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatDate(entry.clock_in);
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const breakTime = formatDuration(entry.break_duration_minutes);
    const duration = formatDuration(entry.duration_minutes);
    
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    
    csv += `${escapeCsv(projectName)},${escapeCsv(name)},${escapeCsv(employeeNumber)},${escapeCsv(date)},${escapeCsv(clockIn)},${escapeCsv(clockOut)},${escapeCsv(breakTime)},${escapeCsv(duration)}\n`;
  }
  
  return csv;
}

function generateWeeklyPayrollCSV(entries: TimeEntry[]): string {
  const byEmployee = new Map<string, { 
    name: string; 
    employeeNumber: string;
    totalMinutes: number; 
    breakMinutes: number; 
    days: Set<string> 
  }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, employeeNumber, totalMinutes: 0, breakMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.breakMinutes += entry.break_duration_minutes || 0;
    emp.days.add(entry.clock_in.split('T')[0]);
  }
  
  let csv = 'Employee,Employee Number,Days Worked,Regular Hours,Overtime,Breaks,Total Hours\n';
  
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  
  for (const [, emp] of byEmployee) {
    const regularMinutes = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    csv += `${escapeCsv(emp.name)},${escapeCsv(emp.employeeNumber)},${emp.days.size},${escapeCsv(formatDuration(regularMinutes))},${escapeCsv(formatDuration(overtimeMinutes))},${escapeCsv(formatDuration(emp.breakMinutes))},${escapeCsv(formatDuration(emp.totalMinutes))}\n`;
  }
  
  return csv;
}

// ============= PDF Generation Functions =============

async function generateEmployeeTimecardPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612;
  const pageHeight = 792;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - 50;
  
  page.drawText(reportName || 'Employee Timecard Report', {
    x: 50,
    y: yPosition,
    size: 18,
    font: boldFont,
    color: rgb(0.23, 0.32, 0.96),
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
  
  const headers = ['Employee', 'Emp #', 'Project', 'Date', 'In', 'Out', 'Hours'];
  const colWidths = [100, 50, 90, 75, 50, 50, 50];
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
  
  for (const entry of entries) {
    if (yPosition < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }
    
    const name = getEmployeeName(entry);
    const empNumber = entry.profiles.employee_id || '-';
    const projectName = entry.projects?.name || 'No Project';
    const date = formatShortDate(entry.clock_in);
    const clockIn = formatTime(entry.clock_in);
    const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
    const duration = formatDuration(entry.duration_minutes);
    
    const rowData = [
      name.substring(0, 16),
      empNumber.substring(0, 8),
      projectName.substring(0, 14),
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
    yPosition -= 14;
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

async function generateProjectTimecardPDF(
  entries: TimeEntry[], 
  companyName: string, 
  reportName: string,
  dateRange: { start: string; end: string }
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
  
  const headers = ['Employee', 'Emp #', 'Date', 'In', 'Out', 'Break', 'Hours'];
  const colWidths = [110, 55, 80, 55, 55, 55, 55];
  
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
      const date = formatShortDate(entry.clock_in);
      const clockIn = formatTime(entry.clock_in);
      const clockOut = entry.clock_out ? formatTime(entry.clock_out) : 'Open';
      const breakTime = formatDuration(entry.break_duration_minutes);
      const duration = formatDuration(entry.duration_minutes);
      
      const rowData = [
        name.substring(0, 18),
        empNumber.substring(0, 8),
        date,
        clockIn,
        clockOut,
        breakTime,
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
  dateRange: { start: string; end: string }
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
  
  const byEmployee = new Map<string, { 
    name: string; 
    employeeNumber: string;
    totalMinutes: number; 
    breakMinutes: number; 
    days: Set<string> 
  }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    const employeeNumber = entry.profiles.employee_id || '';
    
    if (!byEmployee.has(profileId)) {
      byEmployee.set(profileId, { name, employeeNumber, totalMinutes: 0, breakMinutes: 0, days: new Set() });
    }
    
    const emp = byEmployee.get(profileId)!;
    emp.totalMinutes += entry.duration_minutes || 0;
    emp.breakMinutes += entry.break_duration_minutes || 0;
    emp.days.add(entry.clock_in.split('T')[0]);
  }
  
  const headers = ['Employee', 'Emp #', 'Days', 'Regular', 'Overtime', 'Breaks', 'Total'];
  const colWidths = [130, 60, 45, 65, 65, 60, 60];
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
  
  const sortedEmployees = Array.from(byEmployee.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  
  for (const [, emp] of sortedEmployees) {
    if (yPosition < 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - 50;
    }
    
    grandTotalMinutes += emp.totalMinutes;
    const regularMinutes = Math.min(emp.totalMinutes, 40 * 60);
    const overtimeMinutes = Math.max(0, emp.totalMinutes - 40 * 60);
    
    const rowData = [
      emp.name.substring(0, 22),
      emp.employeeNumber.substring(0, 10) || '-',
      String(emp.days.size),
      formatDuration(regularMinutes),
      formatDuration(overtimeMinutes),
      formatDuration(emp.breakMinutes),
      formatDuration(emp.totalMinutes)
    ];
    
    xPos = 50;
    for (let i = 0; i < rowData.length; i++) {
      const isOvertime = i === 4 && overtimeMinutes > 0;
      page.drawText(rowData[i], {
        x: xPos,
        y: yPosition,
        size: 8,
        font: i === 6 ? boldFont : font,
        color: isOvertime ? rgb(0.86, 0.15, 0.15) : rgb(0.2, 0.2, 0.2),
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
    color: rgb(0.6, 0.6, 0.6),
  });
  
  page.drawText(`Grand Total: ${formatDuration(grandTotalMinutes)}`, {
    x: 50,
    y: yPosition - 5,
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
  dateRange: { start: string; end: string }
): string {
  const byEmployee = new Map<string, { name: string; entries: TimeEntry[]; totalMinutes: number }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    
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
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px; color: white;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">${reportName || 'Employee Timecard Report'}</h1>
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
        
        <div style="padding: 12px 24px; background: #eff6ff; border-bottom: 1px solid #dbeafe;">
          <p style="margin: 0; color: #1e40af; font-size: 13px;">
            📎 <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
          </p>
        </div>
        
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
    
    tableRows += `
      <tr style="background: #f0f9ff;">
        <td colspan="6" style="padding: 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">
          ${proj.name} - Total: ${formatDuration(proj.totalMinutes)}
        </td>
      </tr>
    `;
    
    for (const entry of proj.entries) {
      const empName = getEmployeeName(entry);
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
        
        <div style="padding: 12px 24px; background: #ecfdf5; border-bottom: 1px solid #d1fae5;">
          <p style="margin: 0; color: #065f46; font-size: 13px;">
            📎 <strong>Attachments:</strong> PDF and CSV files are attached to this email for download.
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
  const byEmployee = new Map<string, { name: string; totalMinutes: number; breakMinutes: number; days: Set<string> }>();
  
  for (const entry of entries) {
    const profileId = entry.profiles.id;
    const name = getEmployeeName(entry);
    
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
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Breaks</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #f9fafb;">
                <td colspan="5" style="padding: 12px; font-weight: 600; border-top: 2px solid #e5e7eb;">Grand Total</td>
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

    // Build time entries query
    let query = supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_out,
        duration_minutes,
        break_duration_minutes,
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
        html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange);
        csvContent = generateEmployeeTimecardCSV(typedEntries);
        pdfBytes = await generateEmployeeTimecardPDF(typedEntries, companyName, report.name, dateRange);
        attachmentPrefix = 'employee-timecard';
        break;
      case 'project_timecard':
        html = generateProjectTimecardHtml(typedEntries, companyName, report.name, dateRange);
        csvContent = generateProjectTimecardCSV(typedEntries);
        pdfBytes = await generateProjectTimecardPDF(typedEntries, companyName, report.name, dateRange);
        attachmentPrefix = 'project-timecard';
        break;
      case 'weekly_payroll':
      case 'monthly_project_billing':
        html = generateWeeklyPayrollHtml(typedEntries, companyName, report.name, dateRange);
        csvContent = generateWeeklyPayrollCSV(typedEntries);
        pdfBytes = await generateWeeklyPayrollPDF(typedEntries, companyName, report.name, dateRange);
        attachmentPrefix = 'payroll';
        break;
      default:
        html = generateEmployeeTimecardHtml(typedEntries, companyName, report.name, dateRange);
        csvContent = generateEmployeeTimecardCSV(typedEntries);
        pdfBytes = await generateEmployeeTimecardPDF(typedEntries, companyName, report.name, dateRange);
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
