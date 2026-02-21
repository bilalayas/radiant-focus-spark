
-- 1. App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'user');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Referral codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can lookup a code" ON public.referral_codes
  FOR SELECT USING (true);

-- Function to generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  new_code := 'CT-' || upper(substr(md5(random()::text), 1, 6));
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.referral_codes WHERE code = new_code) LOOP
    new_code := 'CT-' || upper(substr(md5(random()::text), 1, 6));
  END LOOP;
  INSERT INTO public.referral_codes (user_id, code) VALUES (NEW.user_id, new_code);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_generate_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- 4. Coach relationships table
CREATE TABLE public.coach_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  initiated_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);
ALTER TABLE public.coach_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relationships" ON public.coach_relationships
  FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Users can create relationship requests" ON public.coach_relationships
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "Participants can update relationship" ON public.coach_relationships
  FOR UPDATE USING (auth.uid() = teacher_id OR auth.uid() = student_id);

-- 5. Pending plans table (teacher creates plan for student)
CREATE TABLE public.pending_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their plans" ON public.pending_plans
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view and update their plans" ON public.pending_plans
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can accept/reject plans" ON public.pending_plans
  FOR UPDATE USING (auth.uid() = student_id);

-- 6. Add active_role to profiles for role switching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_role text DEFAULT 'student';

-- 7. Function to lookup user by referral code and create relationship
CREATE OR REPLACE FUNCTION public.lookup_referral_code(_code text)
RETURNS TABLE(user_id uuid, display_name text, has_teacher_role boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.user_id, p.display_name, public.has_role(rc.user_id, 'teacher') as has_teacher_role
  FROM public.referral_codes rc
  JOIN public.profiles p ON p.user_id = rc.user_id
  WHERE rc.code = _code;
$$;

-- Trigger to update updated_at on coach_relationships
CREATE TRIGGER update_coach_relationships_updated_at
  BEFORE UPDATE ON public.coach_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_plans_updated_at
  BEFORE UPDATE ON public.pending_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
