-- 1) Belt-and-suspenders: explicitly block non-admin INSERT/UPDATE/DELETE on user_roles
CREATE POLICY "Block non-admin role writes"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Revoke read access to otp_hash columns from authenticated role.
-- RLS still gates the row; column-level revoke prevents the hash from being returned.
REVOKE SELECT (otp_hash) ON public.withdrawal_otps FROM authenticated;
REVOKE SELECT (otp_hash) ON public.phone_verifications FROM authenticated;
REVOKE SELECT (otp_hash) ON public.password_reset_requests FROM authenticated;
REVOKE SELECT (otp_hash) ON public.wallet_change_requests FROM authenticated;