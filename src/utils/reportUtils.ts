import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { format } from "date-fns";

// Type definitions to avoid circular imports
export interface ReportUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  department?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  employeeId?: string;
}

export interface ReportEmployeeData {
  name: string;
  week: number;
  month: number;
}

export interface ReportProjectData {
  name: string;
  week: number;
  month: number;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildRealTableHTML(
  type: "employee" | "project",
  data: ReportEmployeeData[] | ReportProjectData[],
  title?: string,
  dateRange?: { start: Date; end: Date }
) {
  const columns = ["Name", "Week", "Month"];

  let html = title ? `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 10px; }
        .date-range { color: #666; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; }
        td { padding: 12px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #fafafa; }
        .total-row { font-weight: bold; background-color: #e8f5e9 !important; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
  ` : '';

  if (dateRange && title) {
    html += `<div class="date-range">Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}</div>`;
  }

  let table =
    "<table border='1' style='border-collapse:collapse;width:100%;font-family:sans-serif;'>" +
    "<thead><tr>" +
    columns.map((col) => `<th style='padding:8px;background:#F6F6F7;'>${col}</th>`).join("") +
    "</tr></thead><tbody>";

  let totalWeek = 0;
  let totalMonth = 0;

  table += data
    .map(
      (row) => {
        totalWeek += row.week || 0;
        totalMonth += row.month || 0;
        return "<tr>" +
          columns
            .map((col) => `<td style='padding:8px;'>${(row as any)[col.toLowerCase()] ?? ""}</td>`)
            .join("") +
          "</tr>";
      }
    )
    .join("");

  if (title) {
    table += `<tr style='font-weight:bold;background-color:#e8f5e9;'>
      <td style='padding:8px;'>Total</td>
      <td style='padding:8px;'>${totalWeek.toFixed(1)}</td>
      <td style='padding:8px;'>${totalMonth.toFixed(1)}</td>
    </tr>`;
  }

  table += "</tbody></table>";

  if (title) {
    html += table + "</body></html>";
    return html;
  }

  return table;
}

export function generateReportFilename(
  reportType: string,
  fileFormat: 'csv' | 'pdf',
  dateRange?: { start: Date; end: Date }
): string {
  const dateStr = dateRange 
    ? `_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}`
    : `_${format(new Date(), 'yyyy-MM-dd')}`;
  
  return `${reportType}_report${dateStr}.${fileFormat}`;
}

export function formatHoursDisplay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function calculateTotalHours(entries: { duration_minutes?: number | null }[]): number {
  return entries.reduce((total, entry) => {
    return total + (entry.duration_minutes || 0) / 60;
  }, 0);
}

export function exportRealDataAsCSV(type: "employee" | "project", data: ReportEmployeeData[] | ReportProjectData[]) {
  const columns = ["Name", "Week", "Month"];
  let csv =
    columns.join(",") +
    "\n" +
    data.map((row) => columns.map((col) => String((row as any)[col.toLowerCase()])).join(",")).join("\n");
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

export function exportUsersAsCSV(users: ReportUser[], filename?: string) {
  const columns = [
    "Name", "Email", "Role", "Status", "Department", "Phone", "Employee ID", "First Name", "Last Name"
  ];

  const csvData = users.map(user => [
    user.name || "", user.email || "", user.role || "", user.status || "",
    user.department || "", user.phone || "", user.employeeId || "",
    user.first_name || "", user.last_name || ""
  ]);

  let csv = columns.join(",") + "\n";
  csv += csvData.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(blob, filename || `employees_export_${timestamp}.csv`);
}

async function downloadImageAsBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch (error) {
    console.error("Error downloading image:", error);
    return null;
  }
}

export async function exportUserProfilePictures(users: ReportUser[], onProgress?: (progress: number) => void) {
  const zip = new JSZip();
  const usersWithPictures = users.filter(u => u.avatar);

  for (let i = 0; i < usersWithPictures.length; i++) {
    const user = usersWithPictures[i];
    if (user.avatar) {
      const blob = await downloadImageAsBlob(user.avatar);
      if (blob) {
        const sanitizedName = sanitizeFilename(user.name);
        zip.file(`${sanitizedName}_profile.png`, blob);
      }
    }
    onProgress?.(((i + 1) / usersWithPictures.length) * 100);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(zipBlob, `profile_pictures_${timestamp}.zip`);
}

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

export async function downloadUserAssets(user: ReportUser): Promise<void> {
  const zip = new JSZip();
  const sanitizedName = sanitizeFilename(user.name);
  
  // Add employee photo if available
  if (user.avatar) {
    const photoBlob = await downloadImageAsBlob(user.avatar);
    if (photoBlob) {
      zip.file(`${sanitizedName}_photo.png`, photoBlob);
    }
  }
  
  // Generate and add QR code
  const badgeUrl = `${window.location.origin}/badge/${user.id}`;
  const qrDataURL = await generateQRCodeDataURL(badgeUrl);
  const qrResponse = await fetch(qrDataURL);
  const qrBlob = await qrResponse.blob();
  zip.file(`${sanitizedName}_qrcode.png`, qrBlob);
  
  // Download the zip
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${sanitizedName}_assets.zip`);
}

export async function exportStandaloneQRCodes(users: ReportUser[], onProgress?: (progress: number) => void) {
  const zip = new JSZip();

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const badgeUrl = `${window.location.origin}/badge/${user.id}`;
    const qrDataURL = await generateQRCodeDataURL(badgeUrl);
    const response = await fetch(qrDataURL);
    const blob = await response.blob();
    const sanitizedName = sanitizeFilename(user.name);
    zip.file(`${sanitizedName}_qrcode.png`, blob);
    onProgress?.(((i + 1) / users.length) * 100);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(zipBlob, `qr_codes_${timestamp}.zip`);
}

export async function exportUserBadges(
  users: ReportUser[],
  renderBadgeElement: (user: ReportUser) => Promise<HTMLElement>,
  onProgress?: (progress: number) => void
) {
  const zip = new JSZip();

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const element = await renderBadgeElement(user);
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: 'white', logging: false
      });
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      const sanitizedName = sanitizeFilename(user.name);
      zip.file(`${sanitizedName}_badge.png`, blob);
      element.remove();
    } catch (error) {
      console.error(`Error generating badge for ${user.name}:`, error);
    }
    onProgress?.(((i + 1) / users.length) * 100);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(zipBlob, `employee_badges_${timestamp}.zip`);
}
