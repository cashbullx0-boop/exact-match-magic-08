-- 1) Remove owner-readable policies that expose otp_hash
DROP POLICY IF EXISTS "Users read own reset requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Users manage own phone verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Users view own withdrawal otps" ON public.withdrawal_otps;
DROP POLICY IF EXISTS "Users view own wallet requests" ON public.wallet_change_requests;

-- 2) phone_verifications is fully RPC-driven (create_signup_phone_otp / verify_signup_phone_otp are SECURITY DEFINER); revoke direct table access
REVOKE ALL ON public.phone_verifications FROM authenticated;

-- 3) Keep admin panels working: SELECT grant remains, but only the admin policies allow rows through
GRANT SELECT ON public.password_reset_requests TO authenticated;
GRANT SELECT ON public.wallet_change_requests TO authenticated;

-- 4) Safe status-only view of the caller's own wallet-change request (never returns otp_hash)
CREATE OR REPLACE FUNCTION public.get_my_wallet_change_request()
RETURNS TABLE (id uuid, new_wallet text, status text, otp_verified boolean, approved_at timestamptz, requested_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.new_wallet, w.status, w.otp_verified, w.approved_at, w.requested_at
  FROM public.wallet_change_requests w
  WHERE w.user_id = auth.uid()
    AND w.status IN ('pending', 'approved')
  ORDER BY w.requested_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet_change_request() TO authenticated;