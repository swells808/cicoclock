-- Add name column to scheduled_reports table
ALTER TABLE scheduled_reports 
ADD COLUMN name text;

-- Set default names for existing reports based on report_type
UPDATE scheduled_reports 
SET name = CASE 
  WHEN report_type = 'employee_timecard' THEN 'Employee Timecard Report'
  WHEN report_type = 'project_timecard' THEN 'Project Timecard Report'
  WHEN report_type = 'weekly_payroll' THEN 'Weekly Payroll Report'
  WHEN report_type = 'monthly_project_billing' THEN 'Monthly Project Billing Report'
  ELSE report_type
END
WHERE name IS NULL;