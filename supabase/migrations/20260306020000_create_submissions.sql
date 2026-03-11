-- ============================================================
-- submissions: one row per (team, checkpoint) for draft/submit
-- Payload stores CP-specific fields as JSONB.
-- Writes go through RPCs (submit_checkpoint / save_checkpoint_draft)
-- which enforce deadline constraints server-side.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  checkpoint_code TEXT NOT NULL REFERENCES public.checkpoints(code),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, checkpoint_code)
);

CREATE INDEX IF NOT EXISTS idx_submissions_team_id        ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_checkpoint_code ON public.submissions(checkpoint_code);
CREATE INDEX IF NOT EXISTS idx_submissions_status          ON public.submissions(status);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Team captains can read their own team's submissions
CREATE POLICY submissions_captain_select
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE captain_id = auth.uid())
  );

-- Admins can read all submissions
CREATE POLICY submissions_admin_select
  ON public.submissions
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Note: INSERT/UPDATE is done exclusively through SECURITY DEFINER RPCs
-- (save_checkpoint_draft, submit_checkpoint) that enforce deadline checks.
-- Direct INSERT/UPDATE by captains is intentionally not permitted via RLS.

COMMENT ON TABLE public.submissions IS 'Team checkpoint submissions; one row per (team, checkpoint). Writes via RPCs only.';
COMMENT ON COLUMN public.submissions.payload IS 'CP-specific fields as JSONB. CP0: {confirmed,topic}; CP1: {short_description,target_audience,doc_link?}; CP2: {git_url,implemented,run_instructions?}; CP3: {build_link?,presentation_link?,repo_url?,summary}';
COMMENT ON COLUMN public.submissions.status IS 'draft = saved but not submitted; submitted = officially submitted';
COMMENT ON COLUMN public.submissions.submitted_at IS 'Timestamp of first official submission (immutable after set)';
