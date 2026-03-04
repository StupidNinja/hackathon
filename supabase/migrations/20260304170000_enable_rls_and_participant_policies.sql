-- ============================================================
-- Enable RLS on all public tables + add participant policies
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================

-- Participant: read own row
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Participant: insert own row (onboarding first step)
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
CREATE POLICY profiles_self_insert
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- profiles_admin_select_all: SELECT for admin role (already exists)
-- profiles_self_update:      UPDATE own row (already exists)

-- ============================================================
-- schools
-- ============================================================

-- All authenticated users can read active schools (onboarding search)
DROP POLICY IF EXISTS schools_authenticated_select ON public.schools;
CREATE POLICY schools_authenticated_select
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================
-- teams
-- ============================================================

-- Participant: read own team
DROP POLICY IF EXISTS teams_captain_select ON public.teams;
CREATE POLICY teams_captain_select
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (captain_id = auth.uid());

-- Participant: create own team
DROP POLICY IF EXISTS teams_captain_insert ON public.teams;
CREATE POLICY teams_captain_insert
  ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (captain_id = auth.uid());

-- Participant: update own team
DROP POLICY IF EXISTS teams_captain_update ON public.teams;
CREATE POLICY teams_captain_update
  ON public.teams
  FOR UPDATE
  TO authenticated
  USING (captain_id = auth.uid())
  WITH CHECK (captain_id = auth.uid());

-- teams_admin_select_all: SELECT for admin role (already exists)

-- ============================================================
-- team_members
-- ============================================================

-- Participant: read members of own team
DROP POLICY IF EXISTS team_members_captain_select ON public.team_members;
CREATE POLICY team_members_captain_select
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  );

-- Participant: add members to own team
DROP POLICY IF EXISTS team_members_captain_insert ON public.team_members;
CREATE POLICY team_members_captain_insert
  ON public.team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  );

-- Participant: update members of own team
DROP POLICY IF EXISTS team_members_captain_update ON public.team_members;
CREATE POLICY team_members_captain_update
  ON public.team_members
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  );

-- Participant: delete members from own team
DROP POLICY IF EXISTS team_members_captain_delete ON public.team_members;
CREATE POLICY team_members_captain_delete
  ON public.team_members
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  );

-- team_members_admin_select_all: SELECT for admin role (already exists)
