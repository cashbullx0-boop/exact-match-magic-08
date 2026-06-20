
REVOKE SELECT (otp_hash) ON public.phone_verifications FROM authenticated, anon, PUBLIC;
REVOKE SELECT (otp_hash) ON public.wallet_change_requests FROM authenticated, anon, PUBLIC;
REVOKE SELECT (otp_hash) ON public.withdrawal_otps FROM authenticated, anon, PUBLIC;

GRANT SELECT (id, user_id, phone, verified, expires_at, created_at) ON public.phone_verifications TO authenticated;
GRANT SELECT (id, user_id, old_wallet, new_wallet, otp_verified, status, admin_note, requested_at, approved_at, expires_at, updated_at) ON public.wallet_change_requests TO authenticated;
GRANT SELECT (id, user_id, withdrawal_id, email_verified, phone_verified, expires_at, created_at) ON public.withdrawal_otps TO authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='transactions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions';
  END IF;
END $$;
