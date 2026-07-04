-- ============================================================================
-- Tesla Secure Capital — full backend bootstrap for a FRESH Supabase project.
-- Paste the whole file into the new project's SQL editor and run once.
-- Consolidates every migration in supabase/migrations/ in dependency order.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT / OR REPLACE where possible.
-- ============================================================================

-- ---------- Roles & has_role helper -----------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- Profiles --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_deposit NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_withdrawal NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  referrer_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE,
  kyc_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users update own basic info" ON public.profiles;
CREATE POLICY "Users update own basic info" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Lets a referrer see the profiles they referred (powers the Referrals page).
-- Note: row-level visibility means a referred user's other columns (e.g. balance)
-- become selectable by the referrer; acceptable here since commission is based on
-- their deposits. Use a restricted VIEW instead if stricter privacy is needed.
DROP POLICY IF EXISTS "Referrers view referred profiles" ON public.profiles;
CREATE POLICY "Referrers view referred profiles" ON public.profiles FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- Investment plans ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_amount NUMERIC(18,2) NOT NULL,
  max_amount NUMERIC(18,2) NOT NULL,
  daily_roi NUMERIC(6,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_plans TO anon, authenticated;
GRANT ALL ON public.investment_plans TO service_role;
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone views active plans" ON public.investment_plans;
CREATE POLICY "Anyone views active plans" ON public.investment_plans FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage plans" ON public.investment_plans;
CREATE POLICY "Admins manage plans" ON public.investment_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Transactions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','profit','investment','adjustment')),
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own tx" ON public.transactions;
CREATE POLICY "Users view own tx" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users create own tx" ON public.transactions;
CREATE POLICY "Users create own tx" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "Admins manage tx" ON public.transactions;
CREATE POLICY "Admins manage tx" ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Investments -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id),
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own investments" ON public.investments;
CREATE POLICY "Users view own investments" ON public.investments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users create own investments" ON public.investments;
CREATE POLICY "Users create own investments" ON public.investments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage investments" ON public.investments;
CREATE POLICY "Admins manage investments" ON public.investments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Notifications ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  broadcast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own or broadcast" ON public.notifications;
CREATE POLICY "users read own or broadcast" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR broadcast = true);
DROP POLICY IF EXISTS "users update own" ON public.notifications;
CREATE POLICY "users update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "admins manage all notifications" ON public.notifications;
CREATE POLICY "admins manage all notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- Support tickets -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets own or admin select" ON public.support_tickets;
CREATE POLICY "tickets own or admin select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "tickets insert own" ON public.support_tickets;
CREATE POLICY "tickets insert own" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "tickets update own or admin" ON public.support_tickets;
CREATE POLICY "tickets update own or admin" ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket msg read" ON public.ticket_messages;
CREATE POLICY "ticket msg read" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
DROP POLICY IF EXISTS "ticket msg insert" ON public.ticket_messages;
CREATE POLICY "ticket msg insert" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- ---------- KYC -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_type text NOT NULL,
  document_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc own or admin select" ON public.kyc_submissions;
CREATE POLICY "kyc own or admin select" ON public.kyc_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "kyc insert own" ON public.kyc_submissions;
CREATE POLICY "kyc insert own" ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "kyc admin update" ON public.kyc_submissions;
CREATE POLICY "kyc admin update" ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ---------- Watchlist -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "watchlist own" ON public.watchlist;
CREATE POLICY "watchlist own" ON public.watchlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- Site settings ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings public read" ON public.site_settings;
DROP POLICY IF EXISTS "settings authenticated read" ON public.site_settings;
CREATE POLICY "settings authenticated read" ON public.site_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings admin write" ON public.site_settings;
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.site_settings(key,value) VALUES
  ('wallets', '{"BTC":"bc1qexampleaddressreplaceme","ETH":"0xExampleAddressReplaceMe","USDT_TRC20":"TExampleAddressReplaceMe","USDT_ERC20":"0xExampleAddressReplaceMe"}'::jsonb),
  ('support_email','"support@teslasecurecapital.com"'::jsonb)
ON CONFLICT DO NOTHING;

-- ---------- Storage buckets + policies --------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('kyc-docs','kyc-docs', false),
  ('payment-proofs','payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kyc upload own" ON storage.objects;
CREATE POLICY "kyc upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "kyc read own or admin" ON storage.objects;
CREATE POLICY "kyc read own or admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
DROP POLICY IF EXISTS "kyc update own or admin" ON storage.objects;
CREATE POLICY "kyc update own or admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
DROP POLICY IF EXISTS "kyc delete own or admin" ON storage.objects;
CREATE POLICY "kyc delete own or admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
CREATE POLICY "Users upload own payment proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;
CREATE POLICY "Users read own payment proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "Users update own payment proofs" ON storage.objects;
CREATE POLICY "Users update own payment proofs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
DROP POLICY IF EXISTS "Users delete own payment proofs" ON storage.objects;
CREATE POLICY "Users delete own payment proofs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- ---------- Signup -> profile trigger ---------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- Function execute grants -----------------------------------------
-- has_role is referenced INSIDE RLS policies. Even though it is SECURITY DEFINER,
-- Postgres checks that the *querying* role may EXECUTE it while evaluating the
-- policy — so authenticated/anon MUST have EXECUTE or every policied query fails
-- with "permission denied for function has_role".
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon, service_role;
-- handle_new_user only ever runs via the trigger (as definer), never called by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---------- Seed investment plans -------------------------------------------
INSERT INTO public.investment_plans (name, min_amount, max_amount, daily_roi, duration_days, description)
SELECT * FROM (VALUES
  ('Starter', 100::numeric, 999::numeric, 2.5::numeric, 14, 'Perfect entry plan for new investors.'),
  ('Silver', 1000, 4999, 3.5, 21, 'Balanced growth for steady returns.'),
  ('Gold', 5000, 19999, 5.0, 30, 'Premium plan with high daily ROI.'),
  ('Platinum VIP', 20000, 1000000, 7.5, 45, 'Elite plan with maximum returns.')
) AS v(name, min_amount, max_amount, daily_roi, duration_days, description)
WHERE NOT EXISTS (SELECT 1 FROM public.investment_plans);

-- ---------- Automatic daily ROI accrual -------------------------------------
-- Tracks when each investment was last paid so we never double-credit.
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_payout_at timestamptz NOT NULL DEFAULT now();

-- Credits daily_roi% of each active investment to the owner's balance/profit,
-- logs a completed 'profit' transaction, advances last_payout_at by whole days,
-- and marks matured investments completed. Runs as owner so it bypasses RLS.
CREATE OR REPLACE FUNCTION public.accrue_daily_roi()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  days_elapsed int;
  payout numeric;
BEGIN
  FOR inv IN
    SELECT i.id, i.user_id, i.amount, i.ends_at, i.last_payout_at, p.daily_roi
    FROM public.investments i
    JOIN public.investment_plans p ON p.id = i.plan_id
    WHERE i.status = 'active'
  LOOP
    -- whole days since last payout, never counted past the maturity date
    days_elapsed := floor(
      EXTRACT(EPOCH FROM (LEAST(now(), COALESCE(inv.ends_at, now())) - inv.last_payout_at)) / 86400
    )::int;

    IF days_elapsed >= 1 THEN
      payout := round(inv.amount * (COALESCE(inv.daily_roi, 0) / 100.0) * days_elapsed, 2);
      IF payout > 0 THEN
        UPDATE public.profiles
          SET balance = balance + payout,
              total_profit = total_profit + payout,
              updated_at = now()
          WHERE id = inv.user_id;
        INSERT INTO public.transactions (user_id, type, amount, status, method, notes)
          VALUES (inv.user_id, 'profit', payout, 'completed', 'roi',
                  'Daily ROI accrual (' || days_elapsed || ' day(s))');
      END IF;
      UPDATE public.investments
        SET last_payout_at = inv.last_payout_at + make_interval(days => days_elapsed)
        WHERE id = inv.id;
    END IF;

    IF inv.ends_at IS NOT NULL AND now() >= inv.ends_at THEN
      UPDATE public.investments SET status = 'completed' WHERE id = inv.id;
    END IF;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accrue_daily_roi() FROM PUBLIC, anon, authenticated;

-- Schedule it daily at 00:05 UTC via pg_cron (re-runnable).
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('accrue-daily-roi')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'accrue-daily-roi');
SELECT cron.schedule('accrue-daily-roi', '5 0 * * *', $$ SELECT public.accrue_daily_roi(); $$);

-- Admin-callable trigger for the dashboard "Run ROI" button.
-- p_force = true backdates each active investment's last payout by one day so a
-- payout happens immediately (for testing without waiting 24h).
CREATE OR REPLACE FUNCTION public.admin_run_roi(p_force boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_force THEN
    UPDATE public.investments
      SET last_payout_at = LEAST(now(), COALESCE(ends_at, now())) - interval '1 day'
      WHERE status = 'active';
  END IF;
  PERFORM public.accrue_daily_roi();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_run_roi(boolean) TO authenticated;

-- ---------- Withdrawal verification codes -----------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
ALTER TABLE public.withdrawal_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.withdrawal_codes TO service_role;
CREATE INDEX IF NOT EXISTS withdrawal_codes_user_idx ON public.withdrawal_codes (user_id, used);

CREATE OR REPLACE FUNCTION public.request_withdrawal_code()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  c := lpad((floor(random() * 1000000))::int::text, 6, '0');
  UPDATE public.withdrawal_codes SET used = true WHERE user_id = auth.uid() AND used = false;
  INSERT INTO public.withdrawal_codes (user_id, code) VALUES (auth.uid(), c);
  INSERT INTO public.notifications (user_id, title, body)
    VALUES (auth.uid(), 'Withdrawal verification code',
            'Your withdrawal code is ' || c || '. It expires in 15 minutes. Never share this code.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_code(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_id FROM public.withdrawal_codes
    WHERE user_id = auth.uid() AND code = p_code AND used = false AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE public.withdrawal_codes SET used = true WHERE id = v_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_code(text) TO authenticated;

-- ============================================================================
-- AFTER running this: sign up in the app, then make yourself admin with:
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
--   ON CONFLICT (user_id, role) DO NOTHING;
-- ============================================================================
