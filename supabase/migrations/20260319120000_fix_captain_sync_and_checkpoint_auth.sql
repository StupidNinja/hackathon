-- ============================================================
-- Fix captain sync bugs and prevent future mismatch between:
--   - public.teams.captain_id
--   - public.team_members(user_id, is_captain=true)
-- Also harden checkpoint RPC auth to allow synced captain member rows.
-- ============================================================

-- 1) Normalize captain rows: keep only one captain per team.
WITH ranked_captains AS (
  SELECT
    tm.id,
    tm.team_id,
    ROW_NUMBER() OVER (
      PARTITION BY tm.team_id
      ORDER BY (tm.user_id IS NULL), tm.id
    ) AS rn
  FROM public.team_members tm
  WHERE tm.is_captain = true
)
UPDATE public.team_members tm
SET is_captain = false
FROM ranked_captains rc
WHERE tm.id = rc.id
  AND rc.rn > 1;

-- 2) A captain row without user_id cannot be used for auth checks.
UPDATE public.team_members
SET is_captain = false
WHERE is_captain = true
  AND user_id IS NULL;

-- 3) Backfill teams.captain_id from captain member rows when available.
WITH captain_source AS (
  SELECT DISTINCT ON (tm.team_id)
    tm.team_id,
    tm.user_id
  FROM public.team_members tm
  WHERE tm.is_captain = true
    AND tm.user_id IS NOT NULL
  ORDER BY tm.team_id, tm.id
)
UPDATE public.teams t
SET captain_id = cs.user_id
FROM captain_source cs
WHERE t.id = cs.team_id
  AND t.captain_id IS DISTINCT FROM cs.user_id;

-- 4) Helper: ensure a captain member row exists and is synced from teams.captain_id.
CREATE OR REPLACE FUNCTION public.ensure_team_captain_member_row(
  p_team_id UUID,
  p_captain_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_existing_captain_row_id UUID;
  v_first_name TEXT;
  v_last_name  TEXT;
  v_email      TEXT;
  v_phone      TEXT;
  v_telegram   TEXT;
BEGIN
  IF p_team_id IS NULL OR p_captain_id IS NULL THEN
    RETURN;
  END IF;

  SELECT tm.id
    INTO v_existing_captain_row_id
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.is_captain = true
  ORDER BY tm.id
  LIMIT 1;

  IF v_existing_captain_row_id IS NOT NULL THEN
    UPDATE public.team_members
    SET user_id = p_captain_id,
        is_captain = true
    WHERE id = v_existing_captain_row_id;
  ELSE
    SELECT p.first_name, p.last_name, p.email, p.phone, p.telegram
      INTO v_first_name, v_last_name, v_email, v_phone, v_telegram
    FROM public.profiles p
    WHERE p.id = p_captain_id;

    INSERT INTO public.team_members (
      team_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      telegram,
      is_captain
    )
    VALUES (
      p_team_id,
      p_captain_id,
      COALESCE(v_first_name, ''),
      COALESCE(v_last_name, ''),
      v_email,
      v_phone,
      v_telegram,
      true
    );
  END IF;

  -- Ensure there is only one captain row.
  UPDATE public.team_members
  SET is_captain = false
  WHERE team_id = p_team_id
    AND id <> COALESCE(v_existing_captain_row_id, (
      SELECT tm2.id
      FROM public.team_members tm2
      WHERE tm2.team_id = p_team_id
        AND tm2.is_captain = true
      ORDER BY tm2.id
      LIMIT 1
    ))
    AND is_captain = true;
END;
$$;

-- 5) Trigger: when teams.captain_id changes, sync captain row in team_members.
CREATE OR REPLACE FUNCTION public.sync_captain_member_from_team_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.captain_id IS DISTINCT FROM OLD.captain_id
  THEN
    PERFORM public.ensure_team_captain_member_row(NEW.id, NEW.captain_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teams_sync_captain_member_trg ON public.teams;
CREATE TRIGGER teams_sync_captain_member_trg
AFTER INSERT OR UPDATE OF captain_id
ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.sync_captain_member_from_team_trigger();

-- 6) Trigger: when team_members captain row changes, sync teams.captain_id.
CREATE OR REPLACE FUNCTION public.sync_team_captain_from_member_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_captain_user_id UUID;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);
  IF v_team_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT tm.user_id
    INTO v_captain_user_id
  FROM public.team_members tm
  WHERE tm.team_id = v_team_id
    AND tm.is_captain = true
    AND tm.user_id IS NOT NULL
  ORDER BY tm.id
  LIMIT 1;

  IF v_captain_user_id IS NOT NULL THEN
    UPDATE public.teams
    SET captain_id = v_captain_user_id
    WHERE id = v_team_id
      AND captain_id IS DISTINCT FROM v_captain_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS team_members_sync_team_captain_trg ON public.team_members;
CREATE TRIGGER team_members_sync_team_captain_trg
AFTER INSERT OR UPDATE OF is_captain, user_id, team_id OR DELETE
ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_team_captain_from_member_trigger();

-- 7) Final one-time pass after triggers are in place.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, captain_id FROM public.teams LOOP
    PERFORM public.ensure_team_captain_member_row(r.id, r.captain_id);
  END LOOP;
END;
$$;

-- 8) Guardrails against bad states.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_captain_requires_user'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
      ADD CONSTRAINT team_members_captain_requires_user
      CHECK (NOT is_captain OR user_id IS NOT NULL);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_members_one_captain_per_team
  ON public.team_members(team_id)
  WHERE is_captain = true;

-- 9) Harden RPC authorization checks for captain ownership.
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
  -- Caller must be captain by teams.captain_id OR by team_members captain row.
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
  v_due_time  := v_settings.t0 + (v_cp.due_offset_minutes  * interval '1 minute');

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
  -- Caller must be captain by teams.captain_id OR by team_members captain row.
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
  v_due_time  := v_settings.t0 + (v_cp.due_offset_minutes  * interval '1 minute');

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
    SET payload      = EXCLUDED.payload,
        status       = 'submitted',
        submitted_at = COALESCE(submissions.submitted_at, EXCLUDED.submitted_at),
        updated_at   = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
