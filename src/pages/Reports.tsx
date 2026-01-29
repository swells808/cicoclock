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

// --- Export Utility Functions ---

// Export Daily Timecard as CSV
function exportDailyTimecardAsCSV(entries: any[]) {
  const columns = ["Employee", "Project", "Clock In", "Clock Out", "Duration"];
  let csv = columns.join(",") + "\n";
  csv += entries.map(entry => {
    const clockIn = entry.start_time ? format(new Date(entry.start_time), 'h:mm a') : '-';
    const clockOut = entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active';
    const duration = entry.duration_minutes 
      ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
      : '-';
    return [
      `"${entry.employeeName}"`,
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
  const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration", "Clock In Address", "Clock Out Address"];
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

// Export Time Entry Details as PDF
function exportTimeEntryDetailsAsPDF(entries: any[], dateRange: string) {
  // @ts-ignore
  import("jspdf").then(jsPDFImport => {
    // @ts-ignore
    import("jspdf-autotable").then(() => {
      const { jsPDF } = jsPDFImport;
      const doc = new jsPDF('landscape');
      const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration"];
      
      doc.setFontSize(16);
      doc.text(`Time Entry Details - ${dateRange}`, 14, 16);
      
      // @ts-ignore
      doc.autoTable({
        startY: 25,
        head: [columns],
        body: entries.map(entry => [
          entry.employeeName,
          format(new Date(entry.start_time), 'MMM d, yyyy'),
          entry.projectName || 'No Project',
          format(new Date(entry.start_time), 'h:mm a'),
          entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active',
          entry.duration_minutes 
            ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` 
            : '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });
      
      doc.save(`time-entry-details-${dateRange.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    });
  });
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

// Build Time Entry Details HTML table
function buildTimeEntryDetailsHTML(entries: any[]): string {
  const columns = ["Employee", "Date", "Project", "Clock In", "Clock Out", "Duration", "Location"];
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
        <td style='padding:10px;'>${format(new Date(entry.start_time), 'MMM d, yyyy')}</td>
        <td style='padding:10px;'>${entry.projectName || 'No Project'}</td>
        <td style='padding:10px;'>${format(new Date(entry.start_time), 'h:mm a')}</td>
        <td style='padding:10px;'>${entry.end_time ? format(new Date(entry.end_time), 'h:mm a') : 'Active'}</td>
        <td style='padding:10px;'>${entry.duration_minutes ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : '-'}</td>
        <td style='padding:10px;'>${entry.clock_in_address || '-'}</td>
      </tr>`;
    }).join("");
  }
  
  table += "</tbody></table>";
  return table;
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

// --- Legacy Report Export Utilities ---
const sampleEmployeeRows = [
  { name: "Jane Doe", week: 42, month: 172 },
  { name: "Alex Lee", week: 39, month: 165 },
  { name: "John Smith", week: 36, month: 159 },
  { name: "Taylor Morgan", week: 27, month: 143 },
  { name: "Chris Evans", week: 20, month: 128 },
];

const sampleProjectRows = [
  { name: "Redesign Q3", week: 41, month: 160 },
  { name: "Project Alpha", week: 37, month: 149 },
  { name: "Mobile App", week: 31, month: 137 },
  { name: "New Onboarding", week: 24, month: 111 },
  { name: "Remote HR", week: 15, month: 97 },
];

function exportTableAsCSV(type: "employee" | "project") {
  const rows = type === "employee" ? sampleEmployeeRows : sampleProjectRows;
  const columns = ["Name", "Week", "Month"];
  let csv =
    columns.join(",") +
    "\n" +
    rows.map((row) => columns.map((col) => String((row as any)[col.toLowerCase()])).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.csv`;
  document.body.appendChild(a);
  a.click();
  url && window.URL.revokeObjectURL(url);
  a.remove();
}

function exportTableAsPDF(type: "employee" | "project") {
  // @ts-ignore
  import("jspdf").then(jsPDFImport => {
    // @ts-ignore
    import("jspdf-autotable").then(() => {
      const { jsPDF } = jsPDFImport;
      const doc = new jsPDF();
      const rows = type === "employee" ? sampleEmployeeRows : sampleProjectRows;
      const columns = ["Name", "Week", "Month"];
      doc.text(`${type === "employee" ? "Employee" : "Project"} Report`, 14, 16);
      // @ts-ignore
      doc.autoTable({
        head: [columns],
        body: rows.map((row) => columns.map((col) => (row as any)[col.toLowerCase()])),
        startY: 20,
      });
      doc.save(`${type}-report.pdf`);
    });
  });
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
      .select('id, user_id, display_name, first_name, last_name, department_id, company_id');

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

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(`id, user_id, profile_id, start_time, end_time, duration_minutes, clock_in_address, clock_out_address, projects(name)`)
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

      const formatDateForTitle = (d: Date) => format(d, 'MMM d, yyyy');
      const dateRangeStr = start.toDateString() === end.toDateString()
        ? formatDateForTitle(start)
        : `${formatDateForTitle(start)} - ${formatDateForTitle(end)}`;
      
      const title = `Time Entry Details — ${dateRangeStr}`;
      const reportTable = buildTimeEntryDetailsHTML(entries);
      
      renderReportPopup(newWin, title, reportTable, 'timecard', dateRangeStr, entries);
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

    // Calculate minutes for each entry
    const timeEntries = rawTimeEntries?.map(entry => {
      let minutes = entry.duration_minutes;
      if (!minutes && entry.start_time) {
        const startTime = new Date(entry.start_time).getTime();
        const endTime = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
        minutes = Math.floor((endTime - startTime) / 1000 / 60);
      }
      return { ...entry, calculated_minutes: minutes || 0 };
    }) || [];

    // Build employee or project reports from fresh data
    let reportData: any[] = [];

    if (filters.reportType === 'employee') {
      const employeeHours = timeEntries.reduce((acc, entry: any) => {
        const profile = entry.profile_id 
          ? userProfiles[entry.profile_id] 
          : userProfiles[entry.user_id];
        const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                    profile?.display_name ||
                    'Unknown User';
        const hours = entry.calculated_minutes / 60;
        
        const entryKey = entry.profile_id || entry.user_id || 'unknown';

        if (!acc[entryKey]) {
          acc[entryKey] = {
            name,
            hours: 0,
            odId: entryKey,
            departmentId: profile?.department_id
          };
        }
        acc[entryKey].hours += hours;

        return acc;
      }, {} as Record<string, any>);

      let employeeReportData = Object.values(employeeHours).map((data: any) => ({
        name: data.name,
        hours: Math.round(data.hours * 10) / 10,
        odId: data.odId,
        departmentId: data.departmentId,
      })).sort((a: any, b: any) => b.hours - a.hours);

      if (filters.employeeId) {
        employeeReportData = employeeReportData.filter(e => e.odId === filters.employeeId);
      }
      if (filters.departmentId) {
        employeeReportData = employeeReportData.filter(e => e.departmentId === filters.departmentId);
      }

      reportData = employeeReportData;

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

    const reportTable = buildRealTableHTML(filters.reportType === 'employee' ? 'employee' : 'project', reportData);
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
    // attach utility functions to opener so popup can invoke
    (window as any).exportTableAsCSV = exportTableAsCSV;
    (window as any).exportTableAsPDF = exportTableAsPDF;
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
