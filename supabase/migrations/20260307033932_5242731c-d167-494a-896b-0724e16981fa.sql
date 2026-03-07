-- Clean up reversed coach relationships where non-teachers are in teacher_id
DELETE FROM coach_relationships 
WHERE id IN (
  SELECT cr.id FROM coach_relationships cr
  WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = cr.teacher_id AND ur.role = 'teacher')
);

-- Add validation trigger to ensure teacher_id always has teacher role
CREATE OR REPLACE FUNCTION public.validate_coach_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure the teacher_id user actually has teacher role
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.teacher_id AND role = 'teacher') THEN
    RAISE EXCEPTION 'teacher_id must reference a user with teacher role';
  END IF;
  -- Ensure teacher and student are different
  IF NEW.teacher_id = NEW.student_id THEN
    RAISE EXCEPTION 'teacher_id and student_id must be different';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_coach_relationship_trigger ON coach_relationships;
CREATE TRIGGER validate_coach_relationship_trigger
  BEFORE INSERT OR UPDATE ON coach_relationships
  FOR EACH ROW EXECUTE FUNCTION validate_coach_relationship();