-- Create function to lookup employee by phone or employee_id
CREATE OR REPLACE FUNCTION public.lookup_employee_by_identifier(
  _company_id UUID,
  _identifier TEXT
)
RETURNS TABLE (
  profile_id UUID,
  user_id UUID,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  employee_id TEXT,
  has_pin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.phone,
    p.employee_id,
    (p.pin IS NOT NULL AND p.pin != '') as has_pin
  FROM profiles p
  WHERE p.company_id = _company_id
    AND p.status = 'active'
    AND (
      -- Match by employee_id (case insensitive, trimmed)
      LOWER(TRIM(COALESCE(p.employee_id, ''))) = LOWER(TRIM(_identifier))
      -- Or match by phone (strip non-digits for comparison)
      OR regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(_identifier, '[^0-9]', '', 'g')
    )
  LIMIT 1;
END;
$$;