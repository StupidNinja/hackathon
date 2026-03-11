-- ============================================================
-- checkpoint_decisions: admin decisions per (team, checkpoint)
-- decision ∈ {under_review, advanced, rejected}
-- rejected → also sets teams.status = 'disqualified' (handled in API)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.checkpoint_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  checkpoint_code TEXT NOT NULL REFERENCES public.checkpoints(code),
  decision TEXT NOT NULL CHECK (decision IN ('under_review', 'advanced', 'rejected')),
  decided_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason_code TEXT,
  admin_comment TEXT,
  UNIQUE (team_id, checkpoint_code)
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_decisions_team_id        ON public.checkpoint_decisions(team_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_decisions_checkpoint_code ON public.checkpoint_decisions(checkpoint_code);
CREATE INDEX IF NOT EXISTS idx_checkpoint_decisions_decided_at      ON public.checkpoint_decisions(decided_at DESC);

-- Enable RLS
ALTER TABLE public.checkpoint_decisions ENABLE ROW LEVEL SECURITY;

-- Team captains can read their own decisions (to see if they passed/failed)
CREATE POLICY checkpoint_decisions_captain_select
  ON public.checkpoint_decisions
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE captain_id = auth.uid())
  );

-- Admins can read all decisions
CREATE POLICY checkpoint_decisions_admin_select
  ON public.checkpoint_decisions
  FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can insert new decisions (decided_by must match auth.uid())
CREATE POLICY checkpoint_decisions_admin_insert
  ON public.checkpoint_decisions
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    AND decided_by = auth.uid()
  );

-- Admins can update existing decisions (decided_by must match auth.uid())
CREATE POLICY checkpoint_decisions_admin_update
  ON public.checkpoint_decisions
  FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND decided_by = auth.uid()
  );

COMMENT ON TABLE public.checkpoint_decisions IS 'Admin classification of teams per checkpoint: under_review, advanced, or rejected';
COMMENT ON COLUMN public.checkpoint_decisions.decision IS 'under_review = still evaluating; advanced = passed this CP; rejected = disqualified at this CP';
COMMENT ON COLUMN public.checkpoint_decisions.reason_code IS 'CP-specific reason template code (e.g. no_confirmation, invalid_repo)';
COMMENT ON COLUMN public.checkpoint_decisions.admin_comment IS 'Admin explanation shown to team captain';
