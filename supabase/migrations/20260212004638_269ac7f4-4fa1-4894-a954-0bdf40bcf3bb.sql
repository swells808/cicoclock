
CREATE POLICY "Admins can delete time entries in their company"
ON public.time_entries
FOR DELETE
USING (
  (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);
