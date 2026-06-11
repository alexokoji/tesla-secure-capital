-- Ensure the signup -> profile trigger exists on the remote DB.
-- Safe to run repeatedly: recreates the function and the trigger, then
-- backfills any auth.users that are currently missing a profile/role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_code text;
  ref_user uuid;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF ref_code IS NOT NULL THEN
    SELECT id INTO ref_user FROM public.profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, country, referral_code, referrer_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    substr(md5(NEW.id::text),1,8),
    ref_user
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger so it definitely points at the current function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill anyone already created without a profile.
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

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
