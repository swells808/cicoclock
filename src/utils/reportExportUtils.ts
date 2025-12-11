import { EmployeeReport, ProjectReport } from '@/hooks/useLiveReports';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  employeeReports: EmployeeReport[];
  projectReports: ProjectReport[];
  dateRange: { from: Date; to: Date };
  companyName?: string;
}

export const exportReportsToCSV = (data: ExportData) => {
  const dateRangeStr = `${format(data.dateRange.from, 'yyyy-MM-dd')}_to_${format(data.dateRange.to, 'yyyy-MM-dd')}`;

  // Employee Hours CSV
  if (data.employeeReports.length > 0) {
    const employeeData = data.employeeReports.map((e) => ({
      Name: e.name,
      Hours: e.hours,
    }));
    const employeeCsv = Papa.unparse(employeeData);
    const employeeBlob = new Blob([employeeCsv], { type: 'text/csv;charset=utf-8' });
    saveAs(employeeBlob, `employee_hours_${dateRangeStr}.csv`);
  }

  // Project Hours CSV
  if (data.projectReports.length > 0) {
    const projectData = data.projectReports.map((p) => ({
      Project: p.name,
      Hours: p.hours,
    }));
    const projectCsv = Papa.unparse(projectData);
    const projectBlob = new Blob([projectCsv], { type: 'text/csv;charset=utf-8' });
    saveAs(projectBlob, `project_hours_${dateRangeStr}.csv`);
  }
};

export const exportReportsToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const dateRangeStr = `${format(data.dateRange.from, 'MMM d, yyyy')} - ${format(data.dateRange.to, 'MMM d, yyyy')}`;

  // Title
  doc.setFontSize(20);
  doc.text('Time Report', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(data.companyName || 'Company Report', 14, 28);
  doc.text(`Period: ${dateRangeStr}`, 14, 35);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 42);

  let yPosition = 55;

  // Employee Hours Table
  if (data.employeeReports.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Employee Hours', 14, yPosition);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Employee Name', 'Total Hours']],
      body: data.employeeReports.map((e) => [e.name, e.hours.toFixed(1)]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Project Hours Table
  if (data.projectReports.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Project Hours', 14, yPosition);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Project Name', 'Total Hours']],
      body: data.projectReports.map((p) => [p.name, p.hours.toFixed(1)]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 10 },
    });
  }

  // Summary
  const totalEmployeeHours = data.employeeReports.reduce((sum, e) => sum + e.hours, 0);
  const totalProjectHours = data.projectReports.reduce((sum, p) => sum + p.hours, 0);
  
  const summaryY = (doc as any).lastAutoTable?.finalY + 20 || yPosition + 50;
  if (summaryY < 270) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Employee Hours: ${totalEmployeeHours.toFixed(1)}`, 14, summaryY);
    doc.text(`Total Project Hours: ${totalProjectHours.toFixed(1)}`, 14, summaryY + 7);
  }

  const fileName = `time_report_${format(data.dateRange.from, 'yyyy-MM-dd')}_to_${format(data.dateRange.to, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
