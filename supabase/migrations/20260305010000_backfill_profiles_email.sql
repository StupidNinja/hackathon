-- Backfill profiles.email from auth.users for all existing users who have no email set.
-- This fixes team captain profiles that were created before the email column was added.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;
