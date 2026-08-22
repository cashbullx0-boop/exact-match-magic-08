-- Ensure OTP secret hashes are never readable by clients, while restoring
-- column-scoped read access to the non-sensitive fields the app needs.

REVOKE ALL ON public.password_reset_requests FROM anon, authenticated;
REVOKE ALL ON public.phone_verifications FROM anon, authenticated;
REVOKE ALL ON public.wallet_change_requests FROM anon, authenticated;
REVOKE ALL ON public.withdrawal_otps FROM anon, authenticated;

GRANT SELECT (id, user_id, otp_verified, status, admin_note, requested_at, approved_at, expires_at, updated_at)
  ON public.password_reset_requests TO authenticated;
GRANT INSERT ON public.password_reset_requests TO authenticated;

GRANT SELECT (id, user_id, phone, verified, expires_at, created_at)
  ON public.phone_verifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.phone_verifications TO authenticated;

GRANT SELECT (id, user_id, old_wallet, new_wallet, otp_verified, status, admin_note, requested_at, approved_at, expires_at, updated_at)
  ON public.wallet_change_requests TO authenticated;
GRANT INSERT ON public.wallet_change_requests TO authenticated;

GRANT SELECT (id, user_id, withdrawal_id, email_verified, phone_verified, expires_at, created_at)
  ON public.withdrawal_otps TO authenticated;
GRANT INSERT, DELETE ON public.withdrawal_otps TO authenticated;

GRANT ALL ON public.password_reset_requests TO service_role;
GRANT ALL ON public.phone_verifications TO service_role;
GRANT ALL ON public.wallet_change_requests TO service_role;
GRANT ALL ON public.withdrawal_otps TO service_role;