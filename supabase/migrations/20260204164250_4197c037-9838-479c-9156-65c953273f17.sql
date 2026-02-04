-- ============================================
-- Security Fix: Restrict PII Access in Profiles
-- ============================================

-- Step 1: Create a public view that excludes sensitive PII fields
-- This view will be used for general employee lookups where full PII is not needed
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  company_id,
  first_name,
  last_name,
  display_name,
  employee_id,
  avatar_url,
  status,
  department_id,
  date_of_hire,
  trade_number,
  face_enrollment_status,
  created_at,
  updated_at
  -- EXCLUDED for privacy: email, phone, pin, address_*, face_embedding
FROM public.profiles;

-- Step 2: Drop the overly permissive company-wide SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;

-- Step 3: Create new granular SELECT policies for profiles table

-- Policy: Users can view their own profile (full access to own data)
-- This already exists but we'll ensure it's there
-- "Users can view own profile" policy exists - no change needed

-- Policy: Admins, Supervisors, Managers, and Foremen can view all profiles in their company
-- These roles need full access for time tracking, reporting, and employee management
CREATE POLICY "Privileged roles can view all profiles in their company"
ON public.profiles
FOR SELECT
USING (
  company_id = get_current_user_company_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'foreman'::app_role)
  )
);

-- Policy: Regular employees can only see basic profile info via the view
-- They can SELECT from profiles table only for their own profile (covered by existing policy)
-- For other employees, they must use the profiles_public view

-- Step 4: Grant appropriate permissions on the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Step 5: Add a comment documenting the security decision
COMMENT ON VIEW public.profiles_public IS 
'Public view of profiles that excludes sensitive PII fields (email, phone, addresses, PIN, face_embedding). 
Use this view for general employee lookups. Full profile access requires admin/supervisor/manager/foreman role or viewing own profile.';