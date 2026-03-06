
-- Resources/Blog table for admin-created content
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  url text,
  category text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Everyone can read resources
CREATE POLICY "Anyone can view resources"
  ON public.resources FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage resources
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add description field to tasks for links/videos
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
