-- Allow authenticated users to update their own profile row.
-- Needed for staff to clear must_change_password after setting a new password.
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
