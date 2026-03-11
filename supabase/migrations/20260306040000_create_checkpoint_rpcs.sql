-- ============================================================
-- RPCs: save_checkpoint_draft / submit_checkpoint
-- Both are SECURITY DEFINER to enforce server-side deadline checks.
-- ============================================================

-- save_checkpoint_draft: upserts payload as 'draft'
-- Does NOT downgrade an already-submitted submission back to draft.
-- Validates: caller is captain, team not disqualified, deadline not passed.
CREATE OR REPLACE FUNCTION public.save_checkpoint_draft(
  p_team_id        UUID,
  p_checkpoint_code TEXT,
  p_payload        JSONB
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team      public.teams;
  v_cp        public.checkpoints;
  v_settings  public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time   TIMESTAMPTZ;
  v_due_time    TIMESTAMPTZ;
  v_result      public.submissions;
BEGIN
  -- 1. Caller must be captain of the team
  SELECT * INTO v_team
    FROM public.teams
   WHERE id = p_team_id AND captain_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized: you are not the captain of this team'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Team must not be disqualified
  IF v_team.status = 'disqualified' THEN
    RAISE EXCEPTION 'Team is disqualified and cannot submit checkpoints'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Checkpoint must exist and be active
  SELECT * INTO v_cp
    FROM public.checkpoints
   WHERE code = p_checkpoint_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint "%" not found or is inactive', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Hackathon must have started (t0 must be set)
  SELECT * INTO v_settings FROM public.hackathon_settings WHERE id = 1;
  IF v_settings.t0 IS NULL THEN
    RAISE EXCEPTION 'Hackathon has not started yet (T0 not configured)'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Compute virtual "now"
  v_virtual_now := CASE
    WHEN v_settings.demo_mode
      THEN now() + (v_settings.demo_offset_minutes * interval '1 minute')
    ELSE now()
  END;

  -- 6. Compute open / due times
  v_open_time := v_settings.t0 + (v_cp.open_offset_minutes * interval '1 minute');
  v_due_time  := v_settings.t0 + (v_cp.due_offset_minutes  * interval '1 minute');

  -- 7. Must be within the open window
  IF v_virtual_now < v_open_time THEN
    RAISE EXCEPTION 'Checkpoint "%" is not yet open', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;
  IF v_virtual_now > v_due_time THEN
    RAISE EXCEPTION 'Deadline for checkpoint "%" has passed', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  -- 8. Upsert draft; never downgrade from "submitted" to "draft"
  INSERT INTO public.submissions (team_id, checkpoint_code, payload, status, updated_at)
  VALUES (p_team_id, p_checkpoint_code, p_payload, 'draft', now())
  ON CONFLICT (team_id, checkpoint_code) DO UPDATE
    SET payload    = EXCLUDED.payload,
        status     = CASE
                       WHEN submissions.status = 'submitted' THEN 'submitted'
                       ELSE 'draft'
                     END,
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- submit_checkpoint: upserts payload as 'submitted'
-- Preserves original submitted_at if team re-submits before deadline.
-- Validates: caller is captain, team not disqualified, deadline not passed.
CREATE OR REPLACE FUNCTION public.submit_checkpoint(
  p_team_id        UUID,
  p_checkpoint_code TEXT,
  p_payload        JSONB
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team      public.teams;
  v_cp        public.checkpoints;
  v_settings  public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time   TIMESTAMPTZ;
  v_due_time    TIMESTAMPTZ;
  v_result      public.submissions;
BEGIN
  -- 1. Caller must be captain of the team
  SELECT * INTO v_team
    FROM public.teams
   WHERE id = p_team_id AND captain_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized: you are not the captain of this team'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Team must not be disqualified
  IF v_team.status = 'disqualified' THEN
    RAISE EXCEPTION 'Team is disqualified and cannot submit checkpoints'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Checkpoint must exist and be active
  SELECT * INTO v_cp
    FROM public.checkpoints
   WHERE code = p_checkpoint_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint "%" not found or is inactive', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Hackathon must have started (t0 must be set)
  SELECT * INTO v_settings FROM public.hackathon_settings WHERE id = 1;
  IF v_settings.t0 IS NULL THEN
    RAISE EXCEPTION 'Hackathon has not started yet (T0 not configured)'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Compute virtual "now"
  v_virtual_now := CASE
    WHEN v_settings.demo_mode
      THEN now() + (v_settings.demo_offset_minutes * interval '1 minute')
    ELSE now()
  END;

  -- 6. Compute open / due times
  v_open_time := v_settings.t0 + (v_cp.open_offset_minutes * interval '1 minute');
  v_due_time  := v_settings.t0 + (v_cp.due_offset_minutes  * interval '1 minute');

  -- 7. Must be within the open window
  IF v_virtual_now < v_open_time THEN
    RAISE EXCEPTION 'Checkpoint "%" is not yet open', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;
  IF v_virtual_now > v_due_time THEN
    RAISE EXCEPTION 'Deadline for checkpoint "%" has passed', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  -- 8. Upsert submission; preserve original submitted_at on re-submit
  INSERT INTO public.submissions (team_id, checkpoint_code, payload, status, submitted_at, updated_at)
  VALUES (p_team_id, p_checkpoint_code, p_payload, 'submitted', v_virtual_now, now())
  ON CONFLICT (team_id, checkpoint_code) DO UPDATE
    SET payload      = EXCLUDED.payload,
        status       = 'submitted',
        submitted_at = COALESCE(submissions.submitted_at, EXCLUDED.submitted_at),
        updated_at   = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.save_checkpoint_draft IS 'Save a draft submission for a checkpoint. Enforces deadline, captain check, and disqualification check. Never downgrades a submitted status back to draft.';
COMMENT ON FUNCTION public.submit_checkpoint IS 'Submit a checkpoint officially. Enforces deadline, captain check, and disqualification check. Re-submission before deadline is allowed; submitted_at is preserved.';
