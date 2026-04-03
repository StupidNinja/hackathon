-- Prevent submitting later checkpoints without submitting the immediate previous checkpoint.
-- Legacy compatibility: teams that already submitted CP1 before this fix can keep updating CP1.

CREATE OR REPLACE FUNCTION public.save_checkpoint_draft(p_team_id uuid, p_checkpoint_code text, p_payload jsonb)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_team public.teams;
  v_cp public.checkpoints;
  v_settings public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time TIMESTAMPTZ;
  v_due_time TIMESTAMPTZ;
  v_prev_checkpoint_code TEXT;
  v_has_prev_submitted BOOLEAN;
  v_has_current_submitted BOOLEAN;
  v_result public.submissions;
BEGIN
  SELECT * INTO v_team
    FROM public.teams t
   WHERE t.id = p_team_id
     AND (
       t.captain_id = auth.uid()
       OR EXISTS (
         SELECT 1
         FROM public.team_members tm
         WHERE tm.team_id = t.id
           AND tm.is_captain = true
           AND tm.user_id = auth.uid()
       )
     );
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

  IF p_checkpoint_code <> 'cp0' THEN
    SELECT cp_prev.code
      INTO v_prev_checkpoint_code
      FROM public.checkpoints cp_prev
     WHERE cp_prev.is_active = true
       AND cp_prev.due_offset_minutes < v_cp.due_offset_minutes
     ORDER BY cp_prev.due_offset_minutes DESC
     LIMIT 1;

    IF v_prev_checkpoint_code IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.submissions s_prev
        WHERE s_prev.team_id = p_team_id
          AND s_prev.checkpoint_code = v_prev_checkpoint_code
          AND s_prev.status = 'submitted'
      ) INTO v_has_prev_submitted;

      IF NOT v_has_prev_submitted THEN
        IF p_checkpoint_code = 'cp1' THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.submissions s_cur
            WHERE s_cur.team_id = p_team_id
              AND s_cur.checkpoint_code = 'cp1'
              AND s_cur.status = 'submitted'
          ) INTO v_has_current_submitted;

          IF NOT v_has_current_submitted THEN
            RAISE EXCEPTION 'Previous checkpoint "%" must be submitted before "%"', v_prev_checkpoint_code, p_checkpoint_code
              USING ERRCODE = 'P0001';
          END IF;
        ELSE
          RAISE EXCEPTION 'Previous checkpoint "%" must be submitted before "%"', v_prev_checkpoint_code, p_checkpoint_code
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.submit_checkpoint(p_team_id uuid, p_checkpoint_code text, p_payload jsonb)
RETURNS public.submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_team public.teams;
  v_cp public.checkpoints;
  v_settings public.hackathon_settings;
  v_virtual_now TIMESTAMPTZ;
  v_open_time TIMESTAMPTZ;
  v_due_time TIMESTAMPTZ;
  v_prev_checkpoint_code TEXT;
  v_has_prev_submitted BOOLEAN;
  v_has_current_submitted BOOLEAN;
  v_result public.submissions;
BEGIN
  SELECT * INTO v_team
    FROM public.teams t
   WHERE t.id = p_team_id
     AND (
       t.captain_id = auth.uid()
       OR EXISTS (
         SELECT 1
         FROM public.team_members tm
         WHERE tm.team_id = t.id
           AND tm.is_captain = true
           AND tm.user_id = auth.uid()
       )
     );
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

  IF p_checkpoint_code <> 'cp0' THEN
    SELECT cp_prev.code
      INTO v_prev_checkpoint_code
      FROM public.checkpoints cp_prev
     WHERE cp_prev.is_active = true
       AND cp_prev.due_offset_minutes < v_cp.due_offset_minutes
     ORDER BY cp_prev.due_offset_minutes DESC
     LIMIT 1;

    IF v_prev_checkpoint_code IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.submissions s_prev
        WHERE s_prev.team_id = p_team_id
          AND s_prev.checkpoint_code = v_prev_checkpoint_code
          AND s_prev.status = 'submitted'
      ) INTO v_has_prev_submitted;

      IF NOT v_has_prev_submitted THEN
        IF p_checkpoint_code = 'cp1' THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.submissions s_cur
            WHERE s_cur.team_id = p_team_id
              AND s_cur.checkpoint_code = 'cp1'
              AND s_cur.status = 'submitted'
          ) INTO v_has_current_submitted;

          IF NOT v_has_current_submitted THEN
            RAISE EXCEPTION 'Previous checkpoint "%" must be submitted before "%"', v_prev_checkpoint_code, p_checkpoint_code
              USING ERRCODE = 'P0001';
          END IF;
        ELSE
          RAISE EXCEPTION 'Previous checkpoint "%" must be submitted before "%"', v_prev_checkpoint_code, p_checkpoint_code
            USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_virtual_now < v_open_time THEN
    RAISE EXCEPTION 'Checkpoint "%" is not yet open', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;
  IF v_virtual_now > v_due_time THEN
    RAISE EXCEPTION 'Deadline for checkpoint "%" has passed', p_checkpoint_code
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.submissions (team_id, checkpoint_code, payload, status, submitted_at, updated_at)
  VALUES (p_team_id, p_checkpoint_code, p_payload, 'submitted', v_virtual_now, now())
  ON CONFLICT (team_id, checkpoint_code) DO UPDATE
    SET payload = EXCLUDED.payload,
        status = 'submitted',
        submitted_at = COALESCE(submissions.submitted_at, EXCLUDED.submitted_at),
        updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;
