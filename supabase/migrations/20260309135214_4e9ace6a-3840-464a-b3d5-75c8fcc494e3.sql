
-- Add book_name and estimated_duration to tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS book_name text;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT 0;

-- Add group_id and chain_order to tasks for chained task system
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS chain_order integer DEFAULT 0;
