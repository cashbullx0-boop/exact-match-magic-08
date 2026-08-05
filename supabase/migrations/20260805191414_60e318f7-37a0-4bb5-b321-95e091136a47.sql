DROP POLICY IF EXISTS "Users create reset requests" ON public.password_reset_requests;
CREATE POLICY "Users create reset requests" ON public.password_reset_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND otp_verified = false
  AND approved_at IS NULL
  AND otp_hash IS NULL
);

DROP POLICY IF EXISTS "Users create wallet requests" ON public.wallet_change_requests;
CREATE POLICY "Users create wallet requests" ON public.wallet_change_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND otp_verified = false
  AND approved_at IS NULL
  AND otp_hash IS NULL
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND balance_cents = (SELECT p.balance_cents FROM public.profiles p WHERE p.id = profiles.id)
  AND total_earned_cents = (SELECT p.total_earned_cents FROM public.profiles p WHERE p.id = profiles.id)
  AND xp = (SELECT p.xp FROM public.profiles p WHERE p.id = profiles.id)
  AND level = (SELECT p.level FROM public.profiles p WHERE p.id = profiles.id)
  AND status = (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
  AND COALESCE(kyc_approved_at, '1970-01-01'::timestamptz) = COALESCE((SELECT p.kyc_approved_at FROM public.profiles p WHERE p.id = profiles.id), '1970-01-01'::timestamptz)
  AND phone_verified = (SELECT p.phone_verified FROM public.profiles p WHERE p.id = profiles.id)
  AND okx_wallet_locked = (SELECT p.okx_wallet_locked FROM public.profiles p WHERE p.id = profiles.id)
  AND current_streak = (SELECT p.current_streak FROM public.profiles p WHERE p.id = profiles.id)
  AND longest_streak = (SELECT p.longest_streak FROM public.profiles p WHERE p.id = profiles.id)
  AND COALESCE(last_checkin_date, '1970-01-01'::date) = COALESCE((SELECT p.last_checkin_date FROM public.profiles p WHERE p.id = profiles.id), '1970-01-01'::date)
  AND NOT (referred_by IS DISTINCT FROM (SELECT p.referred_by FROM public.profiles p WHERE p.id = profiles.id))
  AND referral_code = (SELECT p.referral_code FROM public.profiles p WHERE p.id = profiles.id)
  AND (
    (SELECT p.okx_wallet_locked FROM public.profiles p WHERE p.id = profiles.id) = false
    OR okx_wallet IS NOT DISTINCT FROM (SELECT p.okx_wallet FROM public.profiles p WHERE p.id = profiles.id)
  )
);