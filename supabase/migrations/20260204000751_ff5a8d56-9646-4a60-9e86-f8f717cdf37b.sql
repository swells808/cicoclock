-- Allow users to insert face_verifications for their company
CREATE POLICY "Users can insert face verifications for their company"
ON public.face_verifications
FOR INSERT
WITH CHECK (company_id = get_current_user_company_id());