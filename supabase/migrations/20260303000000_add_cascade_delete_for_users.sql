begin;

-- =======================================================================================
-- Migration: Add CASCADE DELETE for auth.users references
-- =======================================================================================
-- Purpose: Fix user deletion errors by ensuring all related rows are deleted automatically
-- when a user is removed from auth.users table.
--
-- This migration:
-- 1. Drops existing FK constraints that reference auth.users
-- 2. Recreates them with ON DELETE CASCADE
-- 3. Ensures data integrity while allowing user deletion
-- =======================================================================================

-- -----------------------------------------------
-- 1. profiles table
-- -----------------------------------------------
-- Drop existing FK constraint (if exists)
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Add new FK with CASCADE
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id)
  references auth.users(id)
  on delete cascade;

-- -----------------------------------------------
-- 2. teams table (captain_id)
-- -----------------------------------------------
-- Drop existing FK constraint (if exists)
alter table public.teams
  drop constraint if exists teams_captain_id_fkey;

-- Add new FK with CASCADE
alter table public.teams
  add constraint teams_captain_id_fkey
  foreign key (captain_id)
  references auth.users(id)
  on delete cascade;

-- -----------------------------------------------
-- 3. team_members table (user_id)
-- -----------------------------------------------
-- Drop existing FK constraint (if exists)
alter table public.team_members
  drop constraint if exists team_members_user_id_fkey;

-- Add new FK with CASCADE (nullable, so CASCADE will just set to null or delete row)
alter table public.team_members
  add constraint team_members_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

-- -----------------------------------------------
-- 4. team_members table (team_id)
-- -----------------------------------------------
-- Ensure that when a team is deleted, all its members are deleted too
alter table public.team_members
  drop constraint if exists team_members_team_id_fkey;

alter table public.team_members
  add constraint team_members_team_id_fkey
  foreign key (team_id)
  references public.teams(id)
  on delete cascade;

-- -----------------------------------------------
-- 5. staff_invites table
-- -----------------------------------------------
-- For invited_by: Keep RESTRICT to prevent deleting users who created invites
-- (already correct in migration 20260224213000_create_staff_invites.sql)

-- For accepted_by: Already has ON DELETE SET NULL
-- (already correct in migration 20260224213000_create_staff_invites.sql)

commit;
