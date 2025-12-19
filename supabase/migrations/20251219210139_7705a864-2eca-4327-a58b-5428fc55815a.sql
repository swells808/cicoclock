-- Create enum types for the new tables
CREATE TYPE public.assignment_category AS ENUM ('tools', 'fleet', 'tech_assets', 'equipment', 'cards');
CREATE TYPE public.time_off_type AS ENUM ('vacation', 'sick', 'personal', 'bereavement', 'other');
CREATE TYPE public.time_off_status AS ENUM ('pending', 'approved', 'denied', 'cancelled');
CREATE TYPE public.overtime_status AS ENUM ('pending', 'approved', 'denied');

-- Create employee_assignments table
CREATE TABLE public.employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category public.assignment_category NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  assigned_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create employee_schedules table
CREATE TABLE public.employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_day_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, day_of_week)
);

-- Create time_off_requests table
CREATE TABLE public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.time_off_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC,
  reason TEXT,
  status public.time_off_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create overtime_entries table
CREATE TABLE public.overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  reason TEXT,
  status public.overtime_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_assignments
CREATE POLICY "Users can view assignments in their company"
ON public.employee_assignments FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Admins can insert assignments in their company"
ON public.employee_assignments FOR INSERT
WITH CHECK (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assignments in their company"
ON public.employee_assignments FOR UPDATE
USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments in their company"
ON public.employee_assignments FOR DELETE
USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- RLS policies for employee_schedules
CREATE POLICY "Users can view schedules in their company"
ON public.employee_schedules FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Supervisors and admins can insert schedules"
ON public.employee_schedules FOR INSERT
WITH CHECK (company_id = public.get_current_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')));

CREATE POLICY "Supervisors and admins can update schedules"
ON public.employee_schedules FOR UPDATE
USING (company_id = public.get_current_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')));

CREATE POLICY "Admins can delete schedules"
ON public.employee_schedules FOR DELETE
USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- RLS policies for time_off_requests
CREATE POLICY "Users can view time off requests in their company"
ON public.time_off_requests FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can insert their own time off requests"
ON public.time_off_requests FOR INSERT
WITH CHECK (company_id = public.get_current_user_company_id() AND profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Supervisors and admins can update time off requests"
ON public.time_off_requests FOR UPDATE
USING (company_id = public.get_current_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')));

CREATE POLICY "Users can delete their own pending time off requests"
ON public.time_off_requests FOR DELETE
USING (company_id = public.get_current_user_company_id() AND profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND status = 'pending');

-- RLS policies for overtime_entries
CREATE POLICY "Users can view overtime entries in their company"
ON public.overtime_entries FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Users can insert their own overtime entries"
ON public.overtime_entries FOR INSERT
WITH CHECK (company_id = public.get_current_user_company_id() AND profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Supervisors and admins can update overtime entries"
ON public.overtime_entries FOR UPDATE
USING (company_id = public.get_current_user_company_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')));

CREATE POLICY "Admins can delete overtime entries"
ON public.overtime_entries FOR DELETE
USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_employee_assignments_updated_at
BEFORE UPDATE ON public.employee_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_schedules_updated_at
BEFORE UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at
BEFORE UPDATE ON public.time_off_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_overtime_entries_updated_at
BEFORE UPDATE ON public.overtime_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();