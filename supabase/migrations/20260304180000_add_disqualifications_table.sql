-- Create disqualifications table to track team disqualifications with audit trail
CREATE TABLE IF NOT EXISTS public.disqualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('invalid_data', 'spam', 'duplicate_team', 'other')),
  admin_comment TEXT NOT NULL CHECK (char_length(admin_comment) >= 5),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_disqualifications_team_id ON public.disqualifications(team_id);
CREATE INDEX IF NOT EXISTS idx_disqualifications_created_at ON public.disqualifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disqualifications_created_by ON public.disqualifications(created_by);

-- Enable RLS
ALTER TABLE public.disqualifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all disqualifications
CREATE POLICY disqualifications_admin_select_all
  ON public.disqualifications
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Policy: Admins can insert disqualifications (created_by must match auth.uid())
CREATE POLICY disqualifications_admin_insert
  ON public.disqualifications
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND
    created_by = auth.uid()
  );

-- Policy: Team captains can read their own team's disqualification
CREATE POLICY disqualifications_team_select_own
  ON public.disqualifications
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE captain_id = auth.uid()
    )
  );

-- Add admin UPDATE policy for teams table (required for status changes)
CREATE POLICY teams_admin_update
  ON public.teams
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Comment for documentation
COMMENT ON TABLE public.disqualifications IS 'Tracks team disqualifications with reason codes, admin comments, and audit trail';
COMMENT ON COLUMN public.disqualifications.reason_code IS 'Standardized reason: invalid_data, spam, duplicate_team, or other';
COMMENT ON COLUMN public.disqualifications.admin_comment IS 'Admin explanation shown to team captain (minimum 5 characters)';
COMMENT ON COLUMN public.disqualifications.created_by IS 'Admin user who performed the disqualification';
