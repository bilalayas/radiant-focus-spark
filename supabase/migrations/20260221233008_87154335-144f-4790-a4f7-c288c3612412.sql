
-- Allow teachers to view their accepted students' sessions (read only)
CREATE POLICY "Teachers can view student sessions" ON public.sessions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.coach_relationships cr
      WHERE cr.teacher_id = auth.uid()
        AND cr.student_id = sessions.user_id
        AND cr.status = 'accepted'
    )
  );

-- Allow teachers to view their accepted students' tasks (read only)
CREATE POLICY "Teachers can view student tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.coach_relationships cr
      WHERE cr.teacher_id = auth.uid()
        AND cr.student_id = tasks.user_id
        AND cr.status = 'accepted'
    )
  );

-- Drop old restrictive select policies and recreate
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
