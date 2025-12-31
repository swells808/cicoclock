-- Drop existing recursive policies
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;

-- Create new non-recursive policies using has_role() function
CREATE POLICY "Admins can insert user roles" ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles" ON user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));