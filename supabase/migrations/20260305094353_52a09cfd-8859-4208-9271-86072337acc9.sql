
-- Add student_field to profiles (sayisal, sozel, esit_agirlik, yabanci_dil)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_field text;

-- Create tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  topic text,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  blank_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  solve_duration integer DEFAULT 0,
  analysis_duration integer DEFAULT 0,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tests" ON public.tests FOR ALL TO authenticated
USING (auth.uid() = user_id OR auth.uid() = created_by)
WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Teachers can view student tests" ON public.tests FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_relationships cr 
  WHERE cr.teacher_id = auth.uid() AND cr.student_id = tests.user_id AND cr.status = 'accepted'
));
