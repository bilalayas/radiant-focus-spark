
-- Add source column to tasks to distinguish teacher-assigned vs self-created
ALTER TABLE public.tasks ADD COLUMN source text NOT NULL DEFAULT 'self';

-- Add rejection_reason and messages to pending_plans
ALTER TABLE public.pending_plans ADD COLUMN rejection_reason text;
ALTER TABLE public.pending_plans ADD COLUMN messages jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Allow teachers to view profiles of their students (needed for plan management)
CREATE POLICY "Teachers can view student profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.coach_relationships cr
    WHERE cr.teacher_id = auth.uid()
    AND cr.student_id = profiles.user_id
    AND cr.status = 'accepted'
  )
);

-- Allow students to view teacher profiles
CREATE POLICY "Students can view teacher profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.coach_relationships cr
    WHERE cr.student_id = auth.uid()
    AND cr.teacher_id = profiles.user_id
    AND cr.status = 'accepted'
  )
);
