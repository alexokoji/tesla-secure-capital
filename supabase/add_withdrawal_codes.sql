-- ============================================================================
-- Withdrawal verification codes — ADMIN-ISSUED flow.
-- Paste into the Supabase SQL editor and run. Idempotent / re-runnable.
-- (Also included in setup_new_project.sql for fresh rebuilds.)
--
-- Flow:
--   1. User clicks "Request Code" on the withdrawal screen ->
--      request_withdrawal_code() files a 'requested' row. The user is told to
--      contact support to receive the code. No code exists yet.
--   2. The request shows up in the Admin panel. The admin clicks "Generate
--      Code" -> admin_issue_withdrawal_code() creates a 6-digit code, marks the
--      request 'issued', and delivers it to the user via notifications
--      (their "email" inbox). The code does NOT expire.
--   3. User enters the code; verify_withdrawal_code() consumes it (status
--      'used') right before the withdrawal transaction is created.
--
-- Codes are never readable by the client directly (RLS on, no client grants) —
-- only through these SECURITY DEFINER functions.
-- ============================================================================

-- Recreate cleanly (safe: codes are ephemeral, no real data to preserve).
DROP TABLE IF EXISTS public.withdrawal_codes CASCADE;

CREATE TABLE public.withdrawal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','issued','used')),
  created_at timestamptz NOT NULL DEFAULT now(),
  issued_at timestamptz,
  used_at timestamptz
);
ALTER TABLE public.withdrawal_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.withdrawal_codes TO service_role;
CREATE INDEX withdrawal_codes_user_idx ON public.withdrawal_codes (user_id, status);

-- 1. User files a request (no code yet). Deduped: skip if one is already open.
CREATE OR REPLACE FUNCTION public.request_withdrawal_code()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.withdrawal_codes
    WHERE user_id = auth.uid() AND status IN ('requested','issued')
  ) THEN
    RETURN;  -- already have an open request or an unused issued code
  END IF;

  INSERT INTO public.withdrawal_codes (user_id, status)
    VALUES (auth.uid(), 'requested');
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_code() TO authenticated;

-- 2. Admin generates the code for a user, delivers it, and returns it so the
--    admin can also relay it directly. Reuses an open 'requested' row if any.
CREATE OR REPLACE FUNCTION public.admin_issue_withdrawal_code(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c text;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  c := lpad((floor(random() * 1000000))::int::text, 6, '0');

  SELECT id INTO v_id
    FROM public.withdrawal_codes
    WHERE user_id = p_user_id AND status = 'requested'
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.withdrawal_codes (user_id, code, status, issued_at)
      VALUES (p_user_id, c, 'issued', now())
      RETURNING id INTO v_id;
  ELSE
    UPDATE public.withdrawal_codes
      SET code = c, status = 'issued', issued_at = now()
      WHERE id = v_id;
  END IF;

  -- Retire any other outstanding issued codes for this user.
  UPDATE public.withdrawal_codes
    SET status = 'used', used_at = now()
    WHERE user_id = p_user_id AND status = 'issued' AND id <> v_id;

  -- Deliver to the user's in-app inbox ("email").
  INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      p_user_id,
      'Your withdrawal code',
      'Your withdrawal verification code is ' || c ||
      '. Enter it on the withdrawal screen to complete your payout. It stays valid until used.'
    );

  RETURN c;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_issue_withdrawal_code(uuid) TO authenticated;

-- 3. Validate + consume the caller's issued code (no expiry).
CREATE OR REPLACE FUNCTION public.verify_withdrawal_code(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_id
    FROM public.withdrawal_codes
    WHERE user_id = auth.uid()
      AND code = p_code
      AND status = 'issued'
    ORDER BY issued_at DESC
    LIMIT 1;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.withdrawal_codes SET status = 'used', used_at = now() WHERE id = v_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_code(text) TO authenticated;

-- Admin listing (joins profile email/name; returns rows only to admins).
CREATE OR REPLACE FUNCTION public.admin_list_withdrawal_requests()
RETURNS TABLE (
  id uuid, user_id uuid, email text, full_name text,
  code text, status text, created_at timestamptz, issued_at timestamptz, used_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT w.id, w.user_id, p.email, p.full_name,
         w.code, w.status, w.created_at, w.issued_at, w.used_at
  FROM public.withdrawal_codes w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY (w.status = 'requested') DESC, w.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_withdrawal_requests() TO authenticated;
