import React, { useState, useEffect } from "react";
import { Clock, FolderOpen, ArrowUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardHeader } from "@/components/layout/StandardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const { signOut } = useAuth();
  const { company } = useCompany();
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    activeProjects: 0,
    overtimeHours: 0,
  });
  const [employeeReports, setEmployeeReports] = useState<any[]>([]);
  const [projectReports, setProjectReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      try {
        const currentMonth = new Date();
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select(`duration_minutes, start_time, end_time, user_id, projects(id, name)`)
          .eq('company_id', company.id)
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString());

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, display_name')
          .eq('company_id', company.id);

        const { data: activeProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('company_id', company.id)
          .eq('is_active', true);

        const userProfiles = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});

        let totalMinutes = 0;
        const employeeHours: Record<string, any> = {};
        const projectHours: Record<string, any> = {};

        (timeEntries || []).forEach((entry: any) => {
          let minutes = entry.duration_minutes;
          if (!minutes && entry.start_time) {
            const startTime = new Date(entry.start_time).getTime();
            const endTime = entry.end_time ? new Date(entry.end_time).getTime() : Date.now();
            minutes = Math.floor((endTime - startTime) / 1000 / 60);
          }
          totalMinutes += minutes || 0;

          const profile = userProfiles[entry.user_id];
          const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.display_name || 'Unknown';
          if (!employeeHours[entry.user_id]) {
            employeeHours[entry.user_id] = { name, week: 0, month: 0 };
          }
          employeeHours[entry.user_id].month += (minutes || 0) / 60;

          if (entry.projects) {
            const project = entry.projects;
            if (!projectHours[project.id]) {
              projectHours[project.id] = { name: project.name, week: 0, month: 0 };
            }
            projectHours[project.id].month += (minutes || 0) / 60;
          }
        });

        setMetrics({
          totalHours: Math.round(totalMinutes / 60),
          activeProjects: activeProjects?.length || 0,
          overtimeHours: Math.max(0, Math.round(totalMinutes / 60) - 160),
        });

        setEmployeeReports(Object.values(employeeHours).map((e: any) => ({
          ...e,
          week: Math.round(e.week),
          month: Math.round(e.month)
        })).sort((a: any, b: any) => b.month - a.month));

        setProjectReports(Object.values(projectHours).map((p: any) => ({
          ...p,
          week: Math.round(p.week),
          month: Math.round(p.month)
        })).sort((a: any, b: any) => b.month - a.month));

      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [company?.id]);

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
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Total Hours</div>
                    <Clock className="text-[#008000]" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalHours}</div>
                  <div className="text-sm text-green-600 mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> 12% vs last month
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Active Projects</div>
                    <FolderOpen className="text-[#4BA0F4]" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.activeProjects}</div>
                  <div className="text-sm text-blue-600 mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> 3 new this week
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500">Overtime Hours</div>
                    <Clock className="text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold">{metrics.overtimeHours}</div>
                  <div className="text-sm text-orange-600 mt-2 flex items-center">
                    <ArrowUp className="w-4 h-4 mr-1" /> 2 hours vs last month
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Employee Hours */}
                    <div className="bg-gray-50 rounded-lg p-4 h-[300px] overflow-auto">
                      <div className="font-semibold text-gray-700 mb-2">Work Hours Per Employee</div>
                      <table className="min-w-full text-sm rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-white border-b border-gray-200">
                            <th className="py-2 px-3 text-left text-gray-500">Name</th>
                            <th className="py-2 px-3 text-left text-gray-500">Week</th>
                            <th className="py-2 px-3 text-left text-gray-500">Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeReports.slice(0, 5).map((row, i) => (
                            <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                              <td className="py-2 px-3">{row.name}</td>
                              <td className="py-2 px-3">{row.week}</td>
                              <td className="py-2 px-3">{row.month}</td>
                            </tr>
                          ))}
                          {employeeReports.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-4 px-3 text-center text-gray-500">
                                No employee data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Project Hours */}
                    <div className="bg-gray-50 rounded-lg p-4 h-[300px] overflow-auto">
                      <div className="font-semibold text-gray-700 mb-2">Project Time Distribution</div>
                      <table className="min-w-full text-sm rounded-lg overflow-auto">
                        <thead>
                          <tr className="bg-white border-b border-gray-200">
                            <th className="py-2 px-3 text-left text-gray-500">Project Name</th>
                            <th className="py-2 px-3 text-left text-gray-500">Week</th>
                            <th className="py-2 px-3 text-left text-gray-500">Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectReports.slice(0, 5).map((row, i) => (
                            <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                              <td className="py-2 px-3">{row.name}</td>
                              <td className="py-2 px-3">{row.week}</td>
                              <td className="py-2 px-3">{row.month}</td>
                            </tr>
                          ))}
                          {projectReports.length === 0 && (
                            <tr>
                              <td colSpan={3} className="py-4 px-3 text-center text-gray-500">
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
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">Scheduled reports coming soon</p>
              </div>
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
