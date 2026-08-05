-- 1. Remove all direct write access to OTP/request tables from app users (admins included).
--    Every legitimate mutation happens inside SECURITY DEFINER RPCs.
REVOKE UPDATE ON public.password_reset_requests FROM authenticated, anon;
REVOKE UPDATE ON public.wallet_change_requests FROM authenticated, anon;
REVOKE UPDATE ON public.withdrawal_otps FROM authenticated, anon;
REVOKE UPDATE (status, otp_verified, admin_note, updated_at, approved_at, otp_hash, expires_at)
  ON public.password_reset_requests FROM authenticated;
REVOKE UPDATE (status, otp_verified, admin_note, updated_at, approved_at, otp_hash, expires_at, new_wallet, old_wallet)
  ON public.wallet_change_requests FROM authenticated;
REVOKE UPDATE (email_verified, phone_verified, otp_hash, expires_at, withdrawal_id)
  ON public.withdrawal_otps FROM authenticated;

-- 2. Internal admin notes must not be readable by the requesting user.
REVOKE SELECT (admin_note) ON public.password_reset_requests FROM authenticated, anon;
REVOKE SELECT (admin_note) ON public.wallet_change_requests FROM authenticated, anon;

-- 3. Explicit restrictive deny so no future permissive policy can enable self-verification.
DROP POLICY IF EXISTS "No direct updates to withdrawal otps" ON public.withdrawal_otps;
CREATE POLICY "No direct updates to withdrawal otps"
  ON public.withdrawal_otps AS RESTRICTIVE FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct updates to reset requests" ON public.password_reset_requests;
CREATE POLICY "No direct updates to reset requests"
  ON public.password_reset_requests AS RESTRICTIVE FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct updates to wallet requests" ON public.wallet_change_requests;
CREATE POLICY "No direct updates to wallet requests"
  ON public.wallet_change_requests AS RESTRICTIVE FOR UPDATE
  TO authenticated, anon
  USING (false) WITH CHECK (false);

-- 4. Admin-only readers that can still surface admin_note.
CREATE OR REPLACE FUNCTION public.admin_list_wallet_change_requests()
RETURNS TABLE (
  id uuid, user_id uuid, old_wallet text, new_wallet text,
  status text, requested_at timestamptz, admin_note text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT w.id, w.user_id, w.old_wallet, w.new_wallet, w.status, w.requested_at, w.admin_note
    FROM public.wallet_change_requests w
    ORDER BY w.requested_at DESC
    LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_password_reset_requests()
RETURNS TABLE (
  id uuid, user_id uuid, status text, requested_at timestamptz, admin_note text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.user_id, p.status, p.requested_at, p.admin_note
    FROM public.password_reset_requests p
    ORDER BY p.requested_at DESC
    LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_wallet_change_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_password_reset_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_wallet_change_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_password_reset_requests() TO authenticated;

-- 5. Realtime on transactions: keep RLS forced and ensure only the changed row is
--    published (DEFAULT replica identity, never FULL).
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions REPLICA IDENTITY DEFAULT;