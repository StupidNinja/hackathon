-- ============================================================
-- Fix broken RLS policies and add missing ones for full operation.
-- ============================================================

-- ============================================================
-- 1. Drop broken / duplicate policies
-- ============================================================

-- checkpoint_decisions_admin_insert used wrong jwt path (without app_metadata).
-- Replaced by checkpoint_decisions_jury_insert (created in previous session).
DROP POLICY IF EXISTS checkpoint_decisions_admin_insert  ON public.checkpoint_decisions;

-- Duplicate of disqualifications_admin_select (wrong jwt path).
DROP POLICY IF EXISTS disqualifications_admin_select_all ON public.disqualifications;

-- Wrong jwt path — recreated below.
DROP POLICY IF EXISTS teams_admin_update ON public.teams;

-- ============================================================
-- 2. Fix teams_admin_update (was using auth.jwt() ->> 'role' without app_metadata)
-- ============================================================
CREATE POLICY teams_admin_update ON public.teams
  FOR UPDATE TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================
-- 3-6. Helper function to get team_ids for current user.
-- SECURITY DEFINER bypasses RLS on team_members, preventing infinite
-- recursion in policies that subquery team_members.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;

-- Non-captain team members — SELECT their team
--    (captains are already covered by teams_captain_select)
CREATE POLICY teams_member_select ON public.teams
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_team_ids()));

-- Non-captain team members — SELECT all members of their team
--    (captains are already covered by team_members_captain_select)
CREATE POLICY team_members_member_select ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_my_team_ids()));

-- Team members — SELECT submissions for their team
--    (captains are already covered by submissions_captain_select)
CREATE POLICY submissions_team_member_select ON public.submissions
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_my_team_ids()));

-- Team members — SELECT checkpoint decisions for their team
--    (captains are already covered by checkpoint_decisions_captain_select)
CREATE POLICY checkpoint_decisions_team_member_select ON public.checkpoint_decisions
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_my_team_ids()));

-- ============================================================
-- 7. Admin — UPDATE any profile (for role changes, banning, etc.)
-- ============================================================
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING     ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================
-- 8. Jury — read access to all relevant tables
-- ============================================================
CREATE POLICY teams_jury_select ON public.teams
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'jury');

CREATE POLICY team_members_jury_select ON public.team_members
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'jury');

CREATE POLICY profiles_jury_select ON public.profiles
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'jury');

CREATE POLICY submissions_jury_select ON public.submissions
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'jury');

CREATE POLICY checkpoint_decisions_jury_select ON public.checkpoint_decisions
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'jury');
