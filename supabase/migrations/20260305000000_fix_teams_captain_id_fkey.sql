-- Fix teams.captain_id foreign key — was incorrectly pointing to public.teams(id)
-- (self-referencing). Drop it. captain_id references auth.users(id) semantically
-- but that FK lives in a different schema and is not suitable for PostgREST joins.
-- Queries that need captain profile data fetch profiles separately by ID.
alter table public.teams
  drop constraint if exists teams_captain_id_fkey;
