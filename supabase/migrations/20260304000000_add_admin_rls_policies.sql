begin;

-- =======================================================================================
-- Migration: RLS policies for admin role
-- =======================================================================================
-- Allows admin users (identified by app_metadata.role = 'admin') to:
--   - SELECT all records from staff_invites, profiles, teams, team_members
--   - UPDATE staff_invites (revoke: set status to 'revoked')
-- =======================================================================================

-- -----------------------------------------------
-- 1. staff_invites — admin can read all invites
-- -----------------------------------------------
drop policy if exists staff_invites_admin_select on public.staff_invites;
create policy staff_invites_admin_select
  on public.staff_invites
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- admin can revoke pending invites (set status = 'revoked')
drop policy if exists staff_invites_admin_update on public.staff_invites;
create policy staff_invites_admin_update
  on public.staff_invites
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (status = 'revoked');

-- -----------------------------------------------
-- 2. profiles — admin can read all profiles
-- -----------------------------------------------
drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all
  on public.profiles
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- -----------------------------------------------
-- 3. teams — admin can read all teams
-- -----------------------------------------------
drop policy if exists teams_admin_select_all on public.teams;
create policy teams_admin_select_all
  on public.teams
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- -----------------------------------------------
-- 4. team_members — admin can read all members
-- -----------------------------------------------
drop policy if exists team_members_admin_select_all on public.team_members;
create policy team_members_admin_select_all
  on public.team_members
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;
