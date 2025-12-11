import React, { useState, useEffect } from "react";
import { Clock, FolderOpen, ArrowUp, Download, Calendar, FileText, FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { ScheduledReportsList } from "@/components/reports/ScheduledReportsList";
import { useLiveReports, getPresetDateRange, DateRange } from "@/hooks/useLiveReports";
import { exportReportsToCSV, exportReportsToPDF } from "@/utils/reportExportUtils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last7Days', label: 'Last 7 Days' },
  { value: 'last30Days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const Reports = () => {
  const { signOut } = useAuth();
  const { company } = useCompany();
  const { metrics, employeeReports, projectReports, loading, fetchReports } = useLiveReports();
  
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('thisMonth'));
  const [customDateOpen, setCustomDateOpen] = useState(false);

  useEffect(() => {
    fetchReports(dateRange);
  }, [dateRange, fetchReports]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      setDateRange(getPresetDateRange(preset));
    } else {
      setCustomDateOpen(true);
    }
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      setCustomDateOpen(false);
    }
  };

  const handleExportCSV = () => {
    exportReportsToCSV({
      employeeReports,
      projectReports,
      dateRange,
      companyName: company?.company_name,
    });
  };

  const handleExportPDF = () => {
    exportReportsToPDF({
      employeeReports,
      projectReports,
      dateRange,
      companyName: company?.company_name,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <StandardHeader />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          </div>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="live">Live Reports</TabsTrigger>
              <TabsTrigger value="scheduled">Automated Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-8">
              {/* Date Range & Export Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Date Range:</span>
                  </div>
                  
                  <Select value={datePreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {datePreset === 'custom' && (
                    <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={handleCustomDateSelect}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  )}

                  {datePreset !== 'custom' && (
                    <span className="text-sm text-muted-foreground">
                      {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                    </span>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={loading || (employeeReports.length === 0 && projectReports.length === 0)}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Total Hours</div>
                    <Clock className="text-[#008000]" />
                  </div>
                  <div className="text-2xl font-bold">{loading ? '...' : metrics.totalHours}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Active Projects</div>
                    <FolderOpen className="text-[#4BA0F4]" />
                  </div>
                  <div className="text-2xl font-bold">{loading ? '...' : metrics.activeProjects}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    With time entries
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Overtime Hours</div>
                    <Clock className="text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">{loading ? '...' : metrics.overtimeHours}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Over standard 160h/month
                  </div>
                </div>
              </div>

              {/* Report Tables */}
              <section className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="border-b border-gray-100">
                  <div className="flex space-x-6 px-6">
                    <button className="px-4 py-4 text-[#4BA0F4] border-b-2 border-[#4BA0F4] font-semibold">
                      Metrics
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className={cn("grid gap-6", loading && "opacity-50")}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Employee Hours */}
                      <div className="bg-gray-50 rounded-lg p-4 h-[300px] overflow-auto">
                        <div className="font-semibold text-gray-700 mb-2">Work Hours Per Employee</div>
                        <table className="min-w-full text-sm rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-white border-b border-gray-200">
                              <th className="py-2 px-3 text-left text-gray-500">Name</th>
                              <th className="py-2 px-3 text-right text-gray-500">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employeeReports.map((row, i) => (
                              <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                                <td className="py-2 px-3">{row.name}</td>
                                <td className="py-2 px-3 text-right font-medium">{row.hours}</td>
                              </tr>
                            ))}
                            {employeeReports.length === 0 && !loading && (
                              <tr>
                                <td colSpan={2} className="py-4 px-3 text-center text-gray-500">
                                  No employee data for selected period
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Project Hours */}
                      <div className="bg-gray-50 rounded-lg p-4 h-[300px] overflow-auto">
                        <div className="font-semibold text-gray-700 mb-2">Project Time Distribution</div>
                        <table className="min-w-full text-sm rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-white border-b border-gray-200">
                              <th className="py-2 px-3 text-left text-gray-500">Project Name</th>
                              <th className="py-2 px-3 text-right text-gray-500">Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectReports.map((row, i) => (
                              <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                                <td className="py-2 px-3">{row.name}</td>
                                <td className="py-2 px-3 text-right font-medium">{row.hours}</td>
                              </tr>
                            ))}
                            {projectReports.length === 0 && !loading && (
                              <tr>
                                <td colSpan={2} className="py-4 px-3 text-center text-gray-500">
                                  No project data for selected period
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="scheduled">
              <ScheduledReportsList />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="fixed bottom-0 w-full bg-background border-t border-border shadow-sm z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex space-x-6">
              <a href="#" className="hover:text-primary">Support</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
            </div>
            <button onClick={signOut} className="text-destructive hover:text-destructive/80">Logout</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Reports;
