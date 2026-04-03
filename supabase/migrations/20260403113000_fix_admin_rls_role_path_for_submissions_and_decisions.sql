-- Fix admin RLS role path for submissions/checkpoint decisions.
-- Admin role is stored in JWT app_metadata.role, not in top-level role.

alter policy "submissions_admin_select" on public.submissions
using (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

alter policy "checkpoint_decisions_admin_select" on public.checkpoint_decisions
using (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text);

alter policy "checkpoint_decisions_admin_update" on public.checkpoint_decisions
using (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
with check (
  (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)
  and (decided_by = auth.uid())
);
