import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface ReportFiltersValues {
  reportType: 'employee' | 'project' | 'daily' | 'timecard';
  startDate?: Date;
  endDate?: Date;
  departmentId?: string;
  employeeId?: string;
}

interface Employee {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  onApply: (filters: ReportFiltersValues) => void;
  loading?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({ onApply, loading }) => {
  const { company } = useCompany();
  const [reportType, setReportType] = useState<'employee' | 'project' | 'daily' | 'timecard'>('employee');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Fetch employees and departments
  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) return;

      const [employeesRes, departmentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .order('first_name'),
        supabase
          .from('departments')
          .select('id, name')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .order('name')
      ]);

      if (employeesRes.data) setEmployees(employeesRes.data);
      if (departmentsRes.data) setDepartments(departmentsRes.data);
    };

    fetchData();
  }, [company?.id]);

  const handleApply = () => {
    onApply({
      reportType,
      startDate,
      endDate,
      employeeId: selectedEmployeeId === 'all' ? undefined : selectedEmployeeId,
      departmentId: selectedDepartmentId === 'all' ? undefined : selectedDepartmentId,
    });
  };

  const getEmployeeName = (emp: Employee) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return fullName || emp.display_name || 'Unknown';
  };

  const showEmployeeFilter = reportType === 'employee';
  const showDepartmentFilter = reportType === 'employee';

  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Report Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee Hours</SelectItem>
              <SelectItem value="project">Project Hours</SelectItem>
              <SelectItem value="daily">Daily Timecard</SelectItem>
              <SelectItem value="timecard">Time Entry Details</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {showDepartmentFilter && (
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showEmployeeFilter && (
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {getEmployeeName(emp)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end">
          <Button onClick={handleApply} className="w-full" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>
    </div>
  );
};
