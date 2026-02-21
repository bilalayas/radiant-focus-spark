
-- Generate referral codes for existing users
INSERT INTO public.referral_codes (user_id, code)
SELECT p.user_id, 'CT-' || upper(substr(md5(random()::text), 1, 6))
FROM public.profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM public.referral_codes)
ON CONFLICT (user_id) DO NOTHING;
