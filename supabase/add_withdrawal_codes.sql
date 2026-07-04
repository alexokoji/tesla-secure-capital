-- ============================================================================
-- Withdrawal verification codes.
-- Paste into the Supabase SQL editor and run. Idempotent / re-runnable.
-- (Also included in setup_new_project.sql for fresh rebuilds.)
--
-- Flow: user clicks "Request Code" -> request_withdrawal_code() generates a
-- 6-digit code, stores it, and drops it in the user's notifications. The user
-- enters it; verify_withdrawal_code() checks + consumes it before the
-- withdrawal transaction is created. Codes are never readable directly by the
-- client (no table grants) — only through the SECURITY DEFINER functions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
-- RLS on, no policies + no grants to authenticated => no direct client access.
ALTER TABLE public.withdrawal_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.withdrawal_codes TO service_role;
CREATE INDEX IF NOT EXISTS withdrawal_codes_user_idx ON public.withdrawal_codes (user_id, used);

-- Generate a code, invalidate previous unused ones, and notify the user.
CREATE OR REPLACE FUNCTION public.request_withdrawal_code()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  c := lpad((floor(random() * 1000000))::int::text, 6, '0');

  UPDATE public.withdrawal_codes
    SET used = true
    WHERE user_id = auth.uid() AND used = false;

  INSERT INTO public.withdrawal_codes (user_id, code)
    VALUES (auth.uid(), c);

  INSERT INTO public.notifications (user_id, title, body)
    VALUES (
      auth.uid(),
      'Withdrawal verification code',
      'Your withdrawal code is ' || c || '. It expires in 15 minutes. Never share this code.'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_code() TO authenticated;

-- Validate + consume a code. Returns true only for the caller's own, unused,
-- unexpired code.
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
      AND used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.withdrawal_codes SET used = true WHERE id = v_id;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_code(text) TO authenticated;
