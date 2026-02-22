
-- Allow admins to read all profiles (for admin panel)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_roles (needed for admin panel user list)
-- The existing "Only admins can manage roles" policy is for ALL which includes SELECT
-- So admins already can select. But it's RESTRICTIVE. Let's check...
-- Actually the existing policies are RESTRICTIVE (not permissive), so we need PERMISSIVE ones.
-- Let's drop the restrictive ones and create permissive ones.

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recreate as permissive
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
