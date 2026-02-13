import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, getDay, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface TimecardRow {
  firstName: string;
  lastName: string;
  employeeId: string;
  date: string;
  projectName: string;
  costCode: string;
  materialHandling: number;
  processingCutting: number;
  fabricationFitupWeld: number;
  finishes: number;
  other: number;
  hoursType: 'Regular' | 'Overtime';
  hours: number;
  injured: string;
}

function formatHoursMinutes(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours % 1) * 60);
  return `${h}h${m}m`;
}

interface DailyTimecardReportProps {
  date?: Date;
  employeeId?: string;
  departmentId?: string;
}

export const DailyTimecardReport: React.FC<DailyTimecardReportProps> = ({ 
  date: propDate,
  employeeId,
  departmentId
}) => {
  const { company } = useCompany();
  const [rows, setRows] = useState<TimecardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const date = useMemo(() => propDate ?? new Date(), [propDate]);
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = getDay(date);

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) { setLoading(false); return; }

      try {
        setLoading(true);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch time entries
        const { data: entries, error: entriesError } = await supabase
          .from('time_entries')
          .select('id, user_id, profile_id, start_time, end_time, duration_minutes, injury_reported, projects(name)')
          .eq('company_id', company.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: false });

        if (entriesError) throw entriesError;
        if (!entries || entries.length === 0) { setRows([]); setLoading(false); return; }

        const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))];
        const profileIds = [...new Set(entries.map(e => e.profile_id).filter(Boolean))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, display_name, department_id, employee_id')
          .or(`user_id.in.(${userIds.join(',')}),id.in.(${profileIds.join(',')})`);

        const profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p;
          if (p.user_id) acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>);

        // Fetch task_types for category-to-code mapping
        const { data: taskTypesData } = await supabase
          .from('task_types')
          .select('name, code')
          .eq('company_id', company.id)
          .eq('is_active', true);

        const categoryCodeMap: Record<string, string> = {};
        (taskTypesData || []).forEach((tt: any) => {
          const normalizedName = tt.name?.toLowerCase().replace(/[^a-z]/g, '') || '';
          if (normalizedName.includes('materialhandling')) categoryCodeMap['material_handling'] = tt.code;
          else if (normalizedName.includes('processingcutting') || normalizedName.includes('processing')) categoryCodeMap['processing_cutting'] = tt.code;
          else if (normalizedName.includes('fabrication') || normalizedName.includes('fitup')) categoryCodeMap['fabrication_fitup_weld'] = tt.code;
          else if (normalizedName.includes('finishes') || normalizedName.includes('finish')) categoryCodeMap['finishes'] = tt.code;
          else if (normalizedName.includes('other')) categoryCodeMap['other'] = tt.code;
        });

        const getDominantCostCode = (mh: number, pc: number, ffw: number, fin: number, oth: number): string => {
          const cats: [string, number][] = [
            ['material_handling', mh], ['processing_cutting', pc], ['fabrication_fitup_weld', ffw], ['finishes', fin], ['other', oth]
          ];
          const dominant = cats.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
          if (dominant) return categoryCodeMap[dominant[0]] || '';
          return '';
        };

        // Fetch allocations
        const entryIds = entries.map(e => e.id);
        let allocationsMap: Record<string, any[]> = {};
        if (entryIds.length > 0) {
          const { data: allocs } = await supabase
            .from('timecard_allocations')
            .select('time_entry_id, project_id, material_handling, processing_cutting, fabrication_fitup_weld, finishes, other, projects:project_id(name)')
            .in('time_entry_id', entryIds);
          (allocs || []).forEach(a => {
            if (!allocationsMap[a.time_entry_id]) allocationsMap[a.time_entry_id] = [];
            allocationsMap[a.time_entry_id].push(a);
          });
        }

        // Fetch task codes
        let taskCodes: Record<string, string> = {};
        if (entryIds.length > 0) {
          const { data: tas } = await supabase
            .from('task_activities')
            .select('time_entry_id, task_types(code)')
            .in('time_entry_id', entryIds);
          (tas || []).forEach((ta: any) => {
            if (ta.time_entry_id && !taskCodes[ta.time_entry_id]) {
              taskCodes[ta.time_entry_id] = ta.task_types?.code || '';
            }
          });
        }

        // Fetch overtime settings
        const { data: features } = await supabase
          .from('company_features')
          .select('overtime_enabled, overtime_daily_threshold_hours')
          .eq('company_id', company.id)
          .maybeSingle();

        const overtimeEnabled = features?.overtime_enabled ?? false;
        const thresholdMins = (features?.overtime_daily_threshold_hours ?? 8) * 60;

        // Fetch employee schedules
        const relevantPids = [...new Set(entries.map(e => e.profile_id || profileMap[e.user_id]?.id).filter(Boolean))] as string[];
        const { data: empScheds } = await supabase
          .from('employee_schedules')
          .select('profile_id, start_time, end_time, is_day_off')
          .in('profile_id', relevantPids.length > 0 ? relevantPids : ['none'])
          .eq('day_of_week', dayOfWeek);

        const empSchedMap: Record<string, any> = {};
        (empScheds || []).forEach(s => { empSchedMap[s.profile_id] = s; });

        const deptIds = [...new Set((profiles || []).map(p => p.department_id).filter(Boolean))] as string[];
        let deptSchedMap: Record<string, any> = {};
        if (deptIds.length > 0) {
          const { data: ds } = await supabase
            .from('department_schedules')
            .select('department_id, start_time, end_time, is_day_off')
            .in('department_id', deptIds)
            .eq('day_of_week', dayOfWeek);
          (ds || []).forEach(s => { deptSchedMap[s.department_id] = s; });
        }

        const getSchedMins = (pid: string, deptId?: string | null): number => {
          const e = empSchedMap[pid];
          if (e) {
            if (e.is_day_off) return 0;
            if (e.start_time && e.end_time) {
              const [sh, sm] = e.start_time.split(':').map(Number);
              const [eh, em] = e.end_time.split(':').map(Number);
              return (eh * 60 + em) - (sh * 60 + sm);
            }
          }
          if (deptId) {
            const d = deptSchedMap[deptId];
            if (d) {
              if (d.is_day_off) return 0;
              if (d.start_time && d.end_time) {
                const [sh, sm] = d.start_time.split(':').map(Number);
                const [eh, em] = d.end_time.split(':').map(Number);
                return (eh * 60 + em) - (sh * 60 + sm);
              }
            }
          }
          return thresholdMins;
        };

        // Compute daily totals per employee
        const empDailyMins: Record<string, number> = {};
        entries.forEach(entry => {
          const profile = entry.profile_id ? profileMap[entry.profile_id] : profileMap[entry.user_id];
          const pid = entry.profile_id || profile?.id || 'unknown';
          let mins = entry.duration_minutes;
          if (mins === null && entry.start_time) {
            const endT = entry.end_time ? new Date(entry.end_time) : new Date();
            mins = Math.floor((endT.getTime() - new Date(entry.start_time).getTime()) / 60000);
          }
          empDailyMins[pid] = (empDailyMins[pid] || 0) + (mins || 0);
        });

        const fmtDate = format(date, 'M/d/yy');
        const result: TimecardRow[] = [];

        for (const entry of entries) {
          const profile = entry.profile_id ? profileMap[entry.profile_id] : profileMap[entry.user_id];
          if (!profile) continue;
          const pid = entry.profile_id || profile.id;

          if (employeeId && pid !== employeeId) continue;
          if (departmentId && profile.department_id !== departmentId) continue;

          let entryMins = entry.duration_minutes;
          if (entryMins === null && entry.start_time) {
            const endT = entry.end_time ? new Date(entry.end_time) : new Date();
            entryMins = Math.floor((endT.getTime() - new Date(entry.start_time).getTime()) / 60000);
          }
          entryMins = entryMins || 0;

          const costCode = taskCodes[entry.id] || '';
          const allocs = allocationsMap[entry.id];

          const injuredVal = (entry as any).injury_reported ? 'Y' : 'N';

          const addRow = (projName: string, cc: string, mh: number, pc: number, ffw: number, fin: number, oth: number, mins: number) => {
            const totalDaily = empDailyMins[pid] || mins;
            const schedMins = getSchedMins(pid, profile.department_id);

            if (overtimeEnabled && totalDaily > schedMins && schedMins > 0) {
              const ratio = mins / totalDaily;
              const regMins = Math.min(totalDaily, schedMins) * ratio;
              const otMins = Math.max(0, totalDaily - schedMins) * ratio;
              if (regMins > 0) {
                result.push({
                  firstName: profile.first_name || '', lastName: profile.last_name || '',
                  employeeId: profile.employee_id || '', date: fmtDate,
                  projectName: projName, costCode: cc,
                  materialHandling: mh, processingCutting: pc, fabricationFitupWeld: ffw, finishes: fin, other: oth,
                  hoursType: 'Regular', hours: regMins / 60, injured: injuredVal,
                });
              }
              if (otMins > 0) {
                result.push({
                  firstName: profile.first_name || '', lastName: profile.last_name || '',
                  employeeId: profile.employee_id || '', date: fmtDate,
                  projectName: projName, costCode: cc,
                  materialHandling: mh, processingCutting: pc, fabricationFitupWeld: ffw, finishes: fin, other: oth,
                  hoursType: 'Overtime', hours: otMins / 60, injured: injuredVal,
                });
              }
            } else {
              result.push({
                firstName: profile.first_name || '', lastName: profile.last_name || '',
                employeeId: profile.employee_id || '', date: fmtDate,
                projectName: projName, costCode: cc,
                materialHandling: mh, processingCutting: pc, fabricationFitupWeld: ffw, finishes: fin, other: oth,
                hoursType: 'Regular', hours: mins / 60, injured: injuredVal,
              });
            }
          };

          if (allocs && allocs.length > 0) {
            for (const a of allocs) {
              const p = a.projects as any;
              const projName = p?.name || (entry as any).projects?.name || '';
              const mh = a.material_handling || 0;
              const pc = a.processing_cutting || 0;
              const ffw = a.fabrication_fitup_weld || 0;
              const fin = a.finishes || 0;
              const oth = a.other || 0;
              const allocTotal = mh + pc + ffw + fin + oth;
              const allocMins = allocTotal * 60;
              const derivedCostCode = getDominantCostCode(mh, pc, ffw, fin, oth) || costCode;
              addRow(projName, derivedCostCode, mh, pc, ffw, fin, oth, allocMins > 0 ? allocMins : entryMins);
            }
          } else {
            const projName = (entry as any).projects?.name || '';
            addRow(projName, costCode, 0, 0, 0, 0, 0, entryMins);
          }
        }

        result.sort((a, b) => {
          if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName);
          if (a.firstName !== b.firstName) return a.firstName.localeCompare(b.firstName);
          return a.hoursType === 'Regular' ? -1 : 1;
        });

        setRows(result);
      } catch (error) {
        console.error('Error fetching daily timecard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company?.id, dateStr, dayOfWeek, employeeId, departmentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Timecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Timecard - {format(date, 'MMMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No time entries for this date
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Emp ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Mat. Handling</TableHead>
                  <TableHead className="text-right">Process/Cut</TableHead>
                  <TableHead className="text-right">Fitup/Weld</TableHead>
                  <TableHead className="text-right">Finishes</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead>Hours Type</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Injured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.firstName}</TableCell>
                    <TableCell>{row.lastName}</TableCell>
                    <TableCell>{row.employeeId}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.costCode}</TableCell>
                    <TableCell className="text-right">{row.materialHandling.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.processingCutting.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.fabricationFitupWeld.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.finishes.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{row.other.toFixed(1)}</TableCell>
                    <TableCell>
                      {row.hoursType === 'Overtime' ? (
                        <span className="text-orange-600 dark:text-orange-400 font-medium">{row.hoursType}</span>
                      ) : row.hoursType}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {row.hoursType === 'Overtime' ? (
                        <span className="text-orange-600 dark:text-orange-400">{formatHoursMinutes(row.hours)}</span>
                      ) : formatHoursMinutes(row.hours)}
                    </TableCell>
                    <TableCell>{row.injured}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
