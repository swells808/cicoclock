-- Face Verifications table (Phase 1-3 complete schema)
CREATE TABLE public.face_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clock_photo_url TEXT,
  profile_photo_url TEXT,
  confidence_score NUMERIC(4,3),
  is_match BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'no_face', 'error', 'skipped')),
  error_message TEXT,
  verified_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT CHECK (review_decision IN ('approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_face_verifications_time_entry ON public.face_verifications (time_entry_id);
CREATE INDEX idx_face_verifications_company ON public.face_verifications (company_id);
CREATE INDEX idx_face_verifications_status ON public.face_verifications (company_id, status);

-- RLS
ALTER TABLE public.face_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view face verifications for their company"
  ON public.face_verifications FOR SELECT
  USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Admins can update face verifications for their company"
  ON public.face_verifications FOR UPDATE
  USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));

-- Add face_verification toggle to company_features
ALTER TABLE public.company_features ADD COLUMN face_verification BOOLEAN NOT NULL DEFAULT false;
