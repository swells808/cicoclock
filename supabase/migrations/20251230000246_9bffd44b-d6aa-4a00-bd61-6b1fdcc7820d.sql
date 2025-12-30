-- Allow admins to insert profiles in their company
CREATE POLICY "Admins can insert profiles in their company"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (company_id = get_current_user_company_id()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);