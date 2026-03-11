-- ============================================================
-- checkpoints: four checkpoint definitions (CP0–CP3)
-- due_offset_minutes is relative to hackathon_settings.t0
-- ============================================================

CREATE TABLE IF NOT EXISTS public.checkpoints (
  code TEXT PRIMARY KEY CHECK (code IN ('cp0', 'cp1', 'cp2', 'cp3')),
  title TEXT NOT NULL,
  due_offset_minutes INT NOT NULL,
  open_offset_minutes INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Seed the four checkpoints
INSERT INTO public.checkpoints (code, title, due_offset_minutes, open_offset_minutes) VALUES
  ('cp0', 'CP0: Подтверждение участия',  120,  0),
  ('cp1', 'CP1: Описание решения',        480,  0),
  ('cp2', 'CP2: Git и реализация',        960,  0),
  ('cp3', 'CP3: Финальная сдача',        1440,  0)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read checkpoint definitions
CREATE POLICY checkpoints_authenticated_select
  ON public.checkpoints
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.checkpoints IS 'Checkpoint definitions: code, title, deadline offset from T0';
COMMENT ON COLUMN public.checkpoints.due_offset_minutes IS 'Minutes after T0 when this checkpoint closes (deadline)';
COMMENT ON COLUMN public.checkpoints.open_offset_minutes IS 'Minutes after T0 when this checkpoint opens (default 0 = at T0)';
