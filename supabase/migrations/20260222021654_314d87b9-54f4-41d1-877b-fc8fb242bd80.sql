
-- Fix: Remove the public "Anyone can lookup a code" policy (security risk - exposes user_ids)
DROP POLICY IF EXISTS "Anyone can lookup a code" ON public.referral_codes;

-- The lookup_referral_code function already uses SECURITY DEFINER, so authenticated users
-- can look up codes via RPC without needing direct SELECT on the table.
-- We only need users to see their own code (already covered by existing policy).
