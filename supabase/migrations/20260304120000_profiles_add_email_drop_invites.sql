begin;

-- Add email column to profiles for staff user management
alter table public.profiles
  add column if not exists email text;

-- Drop the invite-based staff onboarding system
drop table if exists public.staff_invites cascade;

commit;
