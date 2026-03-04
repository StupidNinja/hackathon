-- Add must_change_password flag to profiles for staff accounts (jury/admin).
-- This replaces the user_metadata approach so there's a clear DB-backed source of truth.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
