-- Backfill profiles + roles for any auth.users that are missing them.
-- Mirrors public.handle_new_user() so accounts created before the trigger
-- existed (or whose trigger failed) stop hanging on "Loading your portfolio…".

-- 1. Create a profile row for every auth user that doesn't have one yet.
INSERT INTO public.profiles (id, email, full_name, phone, country, referral_code, referrer_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'country',
  substr(md5(u.id::text), 1, 8),
  NULL
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Resolve referrers now that all profiles (and their referral codes) exist.
UPDATE public.profiles p
SET referrer_id = ref.id
FROM auth.users u
JOIN public.profiles ref
  ON ref.referral_code = (u.raw_user_meta_data->>'referral_code')
WHERE p.id = u.id
  AND p.referrer_id IS NULL
  AND (u.raw_user_meta_data->>'referral_code') IS NOT NULL
  AND ref.id <> p.id;

-- 3. Ensure every auth user has the default 'user' role.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
