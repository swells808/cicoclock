
-- Create timecard_allocations table
CREATE TABLE public.timecard_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  material_handling NUMERIC NOT NULL DEFAULT 0,
  processing_cutting NUMERIC NOT NULL DEFAULT 0,
  fabrication_fitup_weld NUMERIC NOT NULL DEFAULT 0,
  finishes NUMERIC NOT NULL DEFAULT 0,
  other NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add injury_reported column to time_entries
ALTER TABLE public.time_entries ADD COLUMN injury_reported BOOLEAN;

-- Enable RLS
ALTER TABLE public.timecard_allocations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view allocations in their company
CREATE POLICY "Users can view allocations in their company"
ON public.timecard_allocations FOR SELECT
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- RLS: Users can insert allocations in their company
CREATE POLICY "Users can insert allocations in their company"
ON public.timecard_allocations FOR INSERT
WITH CHECK (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- RLS: Admins can update allocations in their company
CREATE POLICY "Admins can manage allocations in their company"
ON public.timecard_allocations FOR ALL
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_timecard_allocations_time_entry ON public.timecard_allocations(time_entry_id);
CREATE INDEX idx_timecard_allocations_company ON public.timecard_allocations(company_id);
