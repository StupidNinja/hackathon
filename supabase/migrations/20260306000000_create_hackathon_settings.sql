-- ============================================================
-- hackathon_settings: single-row table for T0 and demo mode
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  t0 TIMESTAMPTZ NULL,
  demo_mode BOOLEAN NOT NULL DEFAULT false,
  demo_offset_minutes INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single row on migration
INSERT INTO public.hackathon_settings DEFAULT VALUES
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.hackathon_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (needed for team UI timers)
CREATE POLICY hackathon_settings_authenticated_select
  ON public.hackathon_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update settings (t0, demo_mode, demo_offset_minutes)
CREATE POLICY hackathon_settings_admin_update
  ON public.hackathon_settings
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ============================================================
-- get_virtual_now(): returns current "virtual" time
--   demo_mode=false → returns real now()
--   demo_mode=true  → returns now() + demo_offset_minutes
-- Used inside submit/draft RPCs for server-side deadline enforcement.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_virtual_now()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN hs.demo_mode
      THEN now() + (hs.demo_offset_minutes * interval '1 minute')
    ELSE now()
  END
  FROM public.hackathon_settings hs
  WHERE hs.id = 1;
$$;

COMMENT ON TABLE public.hackathon_settings IS 'Single-row config: hackathon start time (t0), demo mode, and demo time offset';
COMMENT ON COLUMN public.hackathon_settings.t0 IS 'Hackathon start timestamp; NULL = hackathon not started yet';
COMMENT ON COLUMN public.hackathon_settings.demo_mode IS 'When true, virtual time = now() + demo_offset_minutes';
COMMENT ON COLUMN public.hackathon_settings.demo_offset_minutes IS 'Minutes added to real time when demo_mode=true';
COMMENT ON FUNCTION public.get_virtual_now() IS 'Returns virtual current time (respects demo_mode offset)';
