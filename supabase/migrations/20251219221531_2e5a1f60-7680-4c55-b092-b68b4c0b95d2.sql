-- Create department_schedules table for default schedules per department
CREATE TABLE public.department_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  is_day_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.department_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view department schedules in their company"
ON public.department_schedules
FOR SELECT
USING (company_id = get_current_user_company_id());

CREATE POLICY "Supervisors and admins can insert department schedules"
ON public.department_schedules
FOR INSERT
WITH CHECK (
  company_id = get_current_user_company_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
);

CREATE POLICY "Supervisors and admins can update department schedules"
ON public.department_schedules
FOR UPDATE
USING (
  company_id = get_current_user_company_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
);

CREATE POLICY "Admins can delete department schedules"
ON public.department_schedules
FOR DELETE
USING (
  company_id = get_current_user_company_id() 
  AND has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_department_schedules_updated_at
BEFORE UPDATE ON public.department_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();