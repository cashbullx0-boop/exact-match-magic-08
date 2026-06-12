
REVOKE SELECT (otp_hash) ON public.password_reset_requests FROM authenticated;
REVOKE SELECT (otp_hash) ON public.phone_verifications     FROM authenticated;
REVOKE SELECT (otp_hash) ON public.wallet_change_requests  FROM authenticated;
REVOKE SELECT (otp_hash) ON public.withdrawal_otps         FROM authenticated;

GRANT SELECT (id, user_id, status, otp_verified, admin_note, requested_at, approved_at, expires_at, updated_at)
  ON public.password_reset_requests TO authenticated;

GRANT SELECT (id, phone, verified, expires_at, created_at)
  ON public.phone_verifications TO authenticated;

GRANT SELECT (id, user_id, old_wallet, new_wallet, otp_verified, status, admin_note, requested_at, approved_at, expires_at, updated_at)
  ON public.wallet_change_requests TO authenticated;

GRANT SELECT (id, user_id, email_verified, phone_verified, expires_at, created_at)
  ON public.withdrawal_otps TO authenticated;
