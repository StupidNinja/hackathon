-- ============================================================
-- Constructor-driven CP0 topics, rejection templates,
-- and jury scoring.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles
     WHERE id = auth.uid()
       AND role = 'admin'
       AND is_super_admin = true
  );
$$;

COMMENT ON FUNCTION public.is_super_admin_user() IS
  'Returns true when the authenticated user is an admin with is_super_admin=true.';

CREATE OR REPLACE FUNCTION public.is_team_jury_eligible(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.teams t
      JOIN public.submissions s
        ON s.team_id = t.id
       AND s.checkpoint_code = 'cp3'
       AND s.status = 'submitted'
      JOIN public.checkpoint_decisions d
        ON d.team_id = t.id
       AND d.checkpoint_code = 'cp3'
       AND d.decision = 'advanced'
     WHERE t.id = p_team_id
       AND t.status <> 'disqualified'
  );
$$;

COMMENT ON FUNCTION public.is_team_jury_eligible(UUID) IS
  'Returns true when a team is a CP3 finalist and can be scored by jury.';

DROP POLICY IF EXISTS hackathon_settings_admin_update ON public.hackathon_settings;
DROP POLICY IF EXISTS hackathon_settings_super_admin_update ON public.hackathon_settings;

CREATE POLICY hackathon_settings_super_admin_update
  ON public.hackathon_settings
  FOR UPDATE
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());

CREATE TABLE IF NOT EXISTS public.cp0_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_cp0_topics_updated_at
  BEFORE UPDATE ON public.cp0_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assert_valid_cp0_topic(
  p_checkpoint_code TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic TEXT;
BEGIN
  IF p_checkpoint_code <> 'cp0' THEN
    RETURN;
  END IF;

  v_topic := NULLIF(BTRIM(COALESCE(p_payload ->> 'topic', '')), '');

  IF v_topic IS NULL THEN
    RAISE EXCEPTION 'CP0 topic is required'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.cp0_topics
     WHERE label = v_topic
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid CP0 topic'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_valid_cp0_topic(TEXT, JSONB) IS
  'Validates that CP0 payload topic exists in the active topic constructor.';

CREATE TABLE IF NOT EXISTS public.checkpoint_rejection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_code TEXT NOT NULL REFERENCES public.checkpoints(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  default_comment TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checkpoint_rejection_templates_checkpoint_code_code_key
    UNIQUE (checkpoint_code, code)
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_rejection_templates_checkpoint_code
  ON public.checkpoint_rejection_templates(checkpoint_code);

CREATE OR REPLACE TRIGGER set_checkpoint_rejection_templates_updated_at
  BEFORE UPDATE ON public.checkpoint_rejection_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.jury_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  max_points INT NOT NULL CHECK (max_points > 0),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_jury_criteria_updated_at
  BEFORE UPDATE ON public.jury_criteria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.jury_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  jury_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jury_assessments_team_id_jury_id_key UNIQUE (team_id, jury_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_assessments_team_id
  ON public.jury_assessments(team_id);

CREATE INDEX IF NOT EXISTS idx_jury_assessments_jury_id
  ON public.jury_assessments(jury_id);

CREATE OR REPLACE TRIGGER set_jury_assessments_updated_at
  BEFORE UPDATE ON public.jury_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.jury_assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.jury_assessments(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.jury_criteria(id) ON DELETE RESTRICT,
  score INT NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jury_assessment_scores_assessment_id_criterion_id_key
    UNIQUE (assessment_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_jury_assessment_scores_assessment_id
  ON public.jury_assessment_scores(assessment_id);

CREATE INDEX IF NOT EXISTS idx_jury_assessment_scores_criterion_id
  ON public.jury_assessment_scores(criterion_id);

CREATE OR REPLACE FUNCTION public.lock_checkpoint_rejection_template_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code <> OLD.code OR NEW.checkpoint_code <> OLD.checkpoint_code THEN
    RAISE EXCEPTION 'Template code and checkpoint cannot be changed after creation'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER lock_checkpoint_rejection_template_identity_trigger
  BEFORE UPDATE ON public.checkpoint_rejection_templates
  FOR EACH ROW EXECUTE FUNCTION public.lock_checkpoint_rejection_template_identity();

CREATE OR REPLACE FUNCTION public.prevent_used_checkpoint_rejection_template_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.checkpoint_decisions
     WHERE checkpoint_code = OLD.checkpoint_code
       AND reason_code = OLD.code
  ) THEN
    RAISE EXCEPTION 'Cannot delete a rejection template that is already used in checkpoint decisions'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER prevent_used_checkpoint_rejection_template_delete_trigger
  BEFORE DELETE ON public.checkpoint_rejection_templates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_used_checkpoint_rejection_template_delete();

CREATE OR REPLACE FUNCTION public.prevent_jury_criteria_changes_after_assessments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.jury_assessments LIMIT 1) THEN
    RAISE EXCEPTION 'Jury criteria cannot be changed after scoring has started'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER prevent_jury_criteria_changes_after_assessments_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.jury_criteria
  FOR EACH ROW EXECUTE FUNCTION public.prevent_jury_criteria_changes_after_assessments();

INSERT INTO public.cp0_topics (label, sort_order, is_active)
VALUES
  ('Решение задач ИИ', 10, true),
  ('Чат-боты и голосовые помощники', 20, true),
  ('Компьютерное зрение', 30, true),
  ('Умный город и IoT', 40, true),
  ('Образование и EdTech', 50, true),
  ('Медицина и здоровье', 60, true),
  ('Другое', 70, true)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.checkpoint_rejection_templates (
  checkpoint_code,
  code,
  label,
  default_comment,
  sort_order,
  is_active
)
VALUES
  ('cp0', 'no_confirmation', 'Не подтверждено участие', 'Не подтверждено участие', 10, true),
  ('cp0', 'invalid_topic', 'Некорректная тема', 'Некорректная тема', 20, true),
  ('cp0', 'other', 'Другое', 'Другое', 30, true),
  ('cp1', 'incomplete_description', 'Нет описания/не соответствует формату', 'Нет описания/не соответствует формату', 10, true),
  ('cp1', 'missing_audience', 'Не указана аудитория', 'Не указана аудитория', 20, true),
  ('cp1', 'other', 'Другое', 'Другое', 30, true),
  ('cp2', 'invalid_repo', 'Нет репозитория/нет доступа', 'Нет репозитория/нет доступа', 10, true),
  ('cp2', 'no_implementation', 'Нет реализации', 'Нет реализации', 20, true),
  ('cp2', 'other', 'Другое', 'Другое', 30, true),
  ('cp3', 'no_build_or_presentation', 'Нет финальной сборки/презентации', 'Нет финальной сборки/презентации', 10, true),
  ('cp3', 'incomplete', 'Неполная сдача', 'Неполная сдача', 20, true),
  ('cp3', 'other', 'Другое', 'Другое', 30, true)
ON CONFLICT (checkpoint_code, code) DO NOTHING;

ALTER TABLE public.cp0_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_rejection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_assessment_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY cp0_topics_authenticated_select
  ON public.cp0_topics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY cp0_topics_super_admin_insert
  ON public.cp0_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY cp0_topics_super_admin_update
  ON public.cp0_topics
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY cp0_topics_super_admin_delete
  ON public.cp0_topics
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin_user());

CREATE POLICY checkpoint_rejection_templates_authenticated_select
  ON public.checkpoint_rejection_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY checkpoint_rejection_templates_super_admin_insert
  ON public.checkpoint_rejection_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY checkpoint_rejection_templates_super_admin_update
  ON public.checkpoint_rejection_templates
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY checkpoint_rejection_templates_super_admin_delete
  ON public.checkpoint_rejection_templates
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin_user());

CREATE POLICY jury_criteria_authenticated_select
  ON public.jury_criteria
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY jury_criteria_super_admin_insert
  ON public.jury_criteria
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY jury_criteria_super_admin_update
  ON public.jury_criteria
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());

CREATE POLICY jury_criteria_super_admin_delete
  ON public.jury_criteria
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin_user());

CREATE POLICY jury_assessments_admin_select
  ON public.jury_assessments
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY jury_assessments_jury_select
  ON public.jury_assessments
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    AND jury_id = auth.uid()
  );

CREATE POLICY jury_assessments_jury_insert
  ON public.jury_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    AND jury_id = auth.uid()
    AND public.is_team_jury_eligible(team_id)
  );

CREATE POLICY jury_assessments_jury_update
  ON public.jury_assessments
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    AND jury_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    AND jury_id = auth.uid()
    AND public.is_team_jury_eligible(team_id)
  );

CREATE POLICY jury_assessment_scores_admin_select
  ON public.jury_assessment_scores
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY jury_assessment_scores_jury_select
  ON public.jury_assessment_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.jury_assessments ja
       WHERE ja.id = assessment_id
         AND ja.jury_id = auth.uid()
         AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    )
  );

CREATE POLICY jury_assessment_scores_jury_insert
  ON public.jury_assessment_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.jury_assessments ja
       WHERE ja.id = assessment_id
         AND ja.jury_id = auth.uid()
         AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    )
  );

CREATE POLICY jury_assessment_scores_jury_update
  ON public.jury_assessment_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.jury_assessments ja
       WHERE ja.id = assessment_id
         AND ja.jury_id = auth.uid()
         AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.jury_assessments ja
       WHERE ja.id = assessment_id
         AND ja.jury_id = auth.uid()
         AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    )
  );

CREATE POLICY jury_assessment_scores_jury_delete
  ON public.jury_assessment_scores
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.jury_assessments ja
       WHERE ja.id = assessment_id
         AND ja.jury_id = auth.uid()
         AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'jury'
    )
  );

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

  PERFORM public.assert_valid_cp0_topic(p_checkpoint_code, p_payload);

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

  PERFORM public.assert_valid_cp0_topic(p_checkpoint_code, p_payload);

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

COMMENT ON FUNCTION public.save_checkpoint_draft IS
  'Save a draft submission for a checkpoint. Enforces captain, disqualification, sequential time-window checks, and CP0 topic validation.';

COMMENT ON FUNCTION public.submit_checkpoint IS
  'Submit a checkpoint officially. Enforces captain, disqualification, sequential time-window checks, and CP0 topic validation.';
