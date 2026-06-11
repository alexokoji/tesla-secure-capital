-- ============================================================================
-- Incremental: gap-fills on top of an already-bootstrapped project.
-- Paste into the new project's SQL editor and run. Idempotent / re-runnable.
-- (All of this is also included in setup_new_project.sql for fresh rebuilds.)
-- ============================================================================

-- 1. Let a referrer see the profiles they referred (powers Referrals page/panel).
DROP POLICY IF EXISTS "Referrers view referred profiles" ON public.profiles;
CREATE POLICY "Referrers view referred profiles" ON public.profiles FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

-- 2. Automatic daily ROI accrual ------------------------------------------------
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_payout_at timestamptz NOT NULL DEFAULT now();

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

-- 3. Schedule it daily at 00:05 UTC via pg_cron.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('accrue-daily-roi')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'accrue-daily-roi');
SELECT cron.schedule('accrue-daily-roi', '5 0 * * *', $$ SELECT public.accrue_daily_roi(); $$);

-- 4. Admin-callable trigger so the dashboard "Run ROI" button works.
--    p_force = true backdates each active investment's last payout by one day so
--    a payout happens immediately (for testing without waiting 24h).
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

-- Optional: run once now to credit any ROI already due.
-- SELECT public.accrue_daily_roi();
