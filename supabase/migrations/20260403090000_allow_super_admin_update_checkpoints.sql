-- ============================================================
-- Allow super-admins to edit checkpoint timing offsets
-- ============================================================

DROP POLICY IF EXISTS checkpoints_super_admin_update ON public.checkpoints;

CREATE POLICY checkpoints_super_admin_update
  ON public.checkpoints
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());
