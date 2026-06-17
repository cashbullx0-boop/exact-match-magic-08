-- 1) Strip any leftover SELECT on otp_hash for authenticated/anon (defensive)
REVOKE SELECT (otp_hash) ON public.phone_verifications FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.wallet_change_requests FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.withdrawal_otps FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.password_reset_requests FROM authenticated, anon;

-- 2) Remove any blanket SELECT/INSERT/UPDATE/DELETE from anon on these
--    OTP/verification tables — anon should never touch them directly.
REVOKE ALL ON public.phone_verifications FROM anon;
REVOKE ALL ON public.wallet_change_requests FROM anon;
REVOKE ALL ON public.withdrawal_otps FROM anon;
REVOKE ALL ON public.password_reset_requests FROM anon;

-- 3) Tighten withdrawal_otps INSERT policy: if withdrawal_id is provided,
--    it must reference a withdrawal owned by the inserting user.
DROP POLICY IF EXISTS "Users insert own withdrawal otps" ON public.withdrawal_otps;
CREATE POLICY "Users insert own withdrawal otps"
ON public.withdrawal_otps
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND email_verified = false
  AND phone_verified = false
  AND (
    withdrawal_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.withdrawals w
      WHERE w.id = withdrawal_id AND w.user_id = auth.uid()
    )
  )
);