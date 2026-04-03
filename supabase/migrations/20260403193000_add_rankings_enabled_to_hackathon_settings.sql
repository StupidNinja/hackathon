-- Add launch toggle for admin ranking page.
ALTER TABLE public.hackathon_settings
ADD COLUMN IF NOT EXISTS rankings_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hackathon_settings.rankings_enabled IS 'Feature toggle for admin ranking page visibility';
