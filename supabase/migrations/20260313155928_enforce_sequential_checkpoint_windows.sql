-- ============================================================
-- Enforce non-overlapping checkpoint windows in RPCs
-- Only one checkpoint can be effectively open at a time.
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_checkpoint_draft(
  p_team_id UUID,
  p_checkpoint_code TEXT,
  p_payload JSONB
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team public.teams;
  v_cp public.checkpoints;
  v_settings public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time TIMESTAMPTZ;
  v_due_time TIMESTAMPTZ;
  v_prev_due_time TIMESTAMPTZ;
  v_result public.submissions;
BEGIN
  SELECT * INTO v_team
    FROM public.teams
   WHERE id = p_team_id AND captain_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized: you are not the captain of this team'
      USING ERRCODE = '42501';
  END IF;

  IF v_team.status = 'disqualified' THEN
    RAISE EXCEPTION 'Team is disqualified and cannot submit checkpoints'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_cp
    FROM public.checkpoints
   WHERE code = p_checkpoint_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint "%" not found or is inactive', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.hackathon_settings WHERE id = 1;
  IF v_settings.t0 IS NULL THEN
    RAISE EXCEPTION 'Hackathon has not started yet (T0 not configured)'
      USING ERRCODE = 'P0001';
  END IF;

  v_virtual_now := CASE
    WHEN v_settings.demo_mode
      THEN now() + (v_settings.demo_offset_minutes * interval '1 minute')
    ELSE now()
  END;

  v_open_time := v_settings.t0 + (v_cp.open_offset_minutes * interval '1 minute');
  v_due_time := v_settings.t0 + (v_cp.due_offset_minutes * interval '1 minute');

  SELECT MAX(v_settings.t0 + (cp_prev.due_offset_minutes * interval '1 minute'))
    INTO v_prev_due_time
    FROM public.checkpoints cp_prev
   WHERE cp_prev.is_active = true
     AND cp_prev.due_offset_minutes < v_cp.due_offset_minutes;

  IF v_prev_due_time IS NOT NULL THEN
    v_open_time := GREATEST(v_open_time, v_prev_due_time);
  END IF;

  IF v_virtual_now < v_open_time THEN
    RAISE EXCEPTION 'Checkpoint "%" is not yet open', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;
  IF v_virtual_now > v_due_time THEN
    RAISE EXCEPTION 'Deadline for checkpoint "%" has passed', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.submissions (team_id, checkpoint_code, payload, status, updated_at)
  VALUES (p_team_id, p_checkpoint_code, p_payload, 'draft', now())
  ON CONFLICT (team_id, checkpoint_code) DO UPDATE
    SET payload = EXCLUDED.payload,
        status = CASE
                   WHEN submissions.status = 'submitted' THEN 'submitted'
                   ELSE 'draft'
                 END,
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_checkpoint(
  p_team_id UUID,
  p_checkpoint_code TEXT,
  p_payload JSONB
)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team public.teams;
  v_cp public.checkpoints;
  v_settings public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time TIMESTAMPTZ;
  v_due_time TIMESTAMPTZ;
  v_prev_due_time TIMESTAMPTZ;
  v_result public.submissions;
BEGIN
  SELECT * INTO v_team
    FROM public.teams
   WHERE id = p_team_id AND captain_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized: you are not the captain of this team'
      USING ERRCODE = '42501';
  END IF;

  IF v_team.status = 'disqualified' THEN
    RAISE EXCEPTION 'Team is disqualified and cannot submit checkpoints'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_cp
    FROM public.checkpoints
   WHERE code = p_checkpoint_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkpoint "%" not found or is inactive', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.hackathon_settings WHERE id = 1;
  IF v_settings.t0 IS NULL THEN
    RAISE EXCEPTION 'Hackathon has not started yet (T0 not configured)'
      USING ERRCODE = 'P0001';
  END IF;

  v_virtual_now := CASE
    WHEN v_settings.demo_mode
      THEN now() + (v_settings.demo_offset_minutes * interval '1 minute')
    ELSE now()
  END;

  v_open_time := v_settings.t0 + (v_cp.open_offset_minutes * interval '1 minute');
  v_due_time := v_settings.t0 + (v_cp.due_offset_minutes * interval '1 minute');

  SELECT MAX(v_settings.t0 + (cp_prev.due_offset_minutes * interval '1 minute'))
    INTO v_prev_due_time
    FROM public.checkpoints cp_prev
   WHERE cp_prev.is_active = true
     AND cp_prev.due_offset_minutes < v_cp.due_offset_minutes;

  IF v_prev_due_time IS NOT NULL THEN
    v_open_time := GREATEST(v_open_time, v_prev_due_time);
  END IF;

  IF v_virtual_now < v_open_time THEN
    RAISE EXCEPTION 'Checkpoint "%" is not yet open', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;
  IF v_virtual_now > v_due_time THEN
    RAISE EXCEPTION 'Deadline for checkpoint "%" has passed', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.submissions (
    team_id,
    checkpoint_code,
    payload,
    status,
    submitted_at,
    updated_at
  )
  VALUES (p_team_id, p_checkpoint_code, p_payload, 'submitted', v_virtual_now, now())
  ON CONFLICT (team_id, checkpoint_code) DO UPDATE
    SET payload = EXCLUDED.payload,
        status = 'submitted',
        submitted_at = COALESCE(submissions.submitted_at, EXCLUDED.submitted_at),
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.save_checkpoint_draft IS 'Save a draft submission for a checkpoint. Enforces captain, disqualification, and sequential time-window checks.';
COMMENT ON FUNCTION public.submit_checkpoint IS 'Submit a checkpoint officially. Enforces captain, disqualification, and sequential time-window checks.';
