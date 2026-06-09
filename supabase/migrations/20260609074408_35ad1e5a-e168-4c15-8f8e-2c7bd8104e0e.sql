
-- 1) Hash OTPs in all OTP-bearing tables. Replace plaintext otp_code with otp_hash.
-- withdrawal_otps
ALTER TABLE public.withdrawal_otps ADD COLUMN IF NOT EXISTS otp_hash text;
UPDATE public.withdrawal_otps SET otp_hash = encode(digest(otp_code, 'sha256'), 'hex') WHERE otp_hash IS NULL AND otp_code IS NOT NULL;
ALTER TABLE public.withdrawal_otps DROP COLUMN IF EXISTS otp_code;

-- phone_verifications
ALTER TABLE public.phone_verifications ADD COLUMN IF NOT EXISTS otp_hash text;
UPDATE public.phone_verifications SET otp_hash = encode(digest(otp_code, 'sha256'), 'hex') WHERE otp_hash IS NULL AND otp_code IS NOT NULL;
ALTER TABLE public.phone_verifications DROP COLUMN IF EXISTS otp_code;

-- wallet_change_requests
ALTER TABLE public.wallet_change_requests ADD COLUMN IF NOT EXISTS otp_hash text;
UPDATE public.wallet_change_requests SET otp_hash = encode(digest(otp_code, 'sha256'), 'hex') WHERE otp_hash IS NULL AND otp_code IS NOT NULL;
ALTER TABLE public.wallet_change_requests DROP COLUMN IF EXISTS otp_code;

-- password_reset_requests
ALTER TABLE public.password_reset_requests ADD COLUMN IF NOT EXISTS otp_hash text;
UPDATE public.password_reset_requests SET otp_hash = encode(digest(otp_code, 'sha256'), 'hex') WHERE otp_hash IS NULL AND otp_code IS NOT NULL;
ALTER TABLE public.password_reset_requests DROP COLUMN IF EXISTS otp_code;

-- 2) Update functions to hash on write and verify against hash. Keep return shapes; in dev demo we still return the plaintext OTP from generate_withdrawal_otp / create_signup_phone_otp / admin_approve_* so the existing UI notifications work.

CREATE OR REPLACE FUNCTION public.generate_withdrawal_otp(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE otp TEXT;
BEGIN
  otp := lpad(floor(random() * 1000000)::text, 6, '0');
  INSERT INTO public.withdrawal_otps (user_id, otp_hash)
    VALUES (_user_id, encode(digest(otp, 'sha256'), 'hex'));
  INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (_user_id, '🔐 Withdrawal OTP',
      'Your withdrawal OTP is: ' || otp || '. Valid for 10 minutes. Do not share with anyone.',
      'system');
  RETURN otp;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_otp(_user_id uuid, _otp text, _type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE otp_record RECORD; h text;
BEGIN
  h := encode(digest(btrim(coalesce(_otp,'')), 'sha256'), 'hex');
  SELECT * INTO otp_record FROM public.withdrawal_otps
    WHERE user_id = _user_id AND otp_hash = h AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF otp_record IS NULL THEN RETURN false; END IF;
  IF _type = 'email' THEN
    UPDATE public.withdrawal_otps SET email_verified = true WHERE id = otp_record.id;
  ELSIF _type = 'phone' THEN
    UPDATE public.withdrawal_otps SET phone_verified = true WHERE id = otp_record.id;
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.create_signup_phone_otp(_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE phone_norm text := btrim(coalesce(_phone, '')); otp text;
BEGIN
  IF length(phone_norm) < 6 OR length(phone_norm) > 32 OR phone_norm !~ '^\+?[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  otp := lpad(floor(random() * 1000000)::int::text, 6, '0');
  DELETE FROM public.phone_verifications
    WHERE phone = phone_norm AND (expires_at < now() OR verified = false);
  INSERT INTO public.phone_verifications (phone, otp_hash)
    VALUES (phone_norm, encode(digest(otp, 'sha256'), 'hex'));
  RETURN otp;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_signup_phone_otp(_phone text, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE rec RECORD; phone_norm text := btrim(coalesce(_phone, '')); h text;
BEGIN
  h := encode(digest(btrim(coalesce(_otp,'')), 'sha256'), 'hex');
  SELECT * INTO rec FROM public.phone_verifications
    WHERE phone = phone_norm AND otp_hash = h AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF rec IS NULL THEN RETURN false; END IF;
  UPDATE public.phone_verifications SET verified = true WHERE id = rec.id;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_approve_wallet_change(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE req RECORD; otp text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO req FROM public.wallet_change_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request already finalized'; END IF;
  otp := lpad((floor(random() * 1000000))::int::text, 6, '0');
  UPDATE public.wallet_change_requests
    SET status = 'approved', approved_at = now(),
        otp_hash = encode(digest(otp, 'sha256'), 'hex'), updated_at = now()
    WHERE id = _request_id;
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (req.user_id, '✅ Wallet Change Approved',
    'Your wallet change OTP is ' || otp || '. Enter it on the wallet page to confirm the new address. (Demo: also sent to your email and phone.)',
    'system', '/profile');
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_wallet_change(_request_id uuid, _otp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); req RECORD; h text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.wallet_change_requests
    WHERE id = _request_id AND user_id = uid FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'approved' THEN RAISE EXCEPTION 'Request not approved yet'; END IF;
  IF req.otp_verified THEN RAISE EXCEPTION 'Already confirmed'; END IF;
  h := encode(digest(btrim(coalesce(_otp,'')), 'sha256'), 'hex');
  IF req.otp_hash IS NULL OR req.otp_hash <> h THEN RAISE EXCEPTION 'Invalid OTP'; END IF;

  UPDATE public.wallet_change_requests SET otp_verified = true, updated_at = now() WHERE id = _request_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET okx_wallet = req.new_wallet, okx_wallet_locked = true, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (uid, 'Wallet updated', 'Your OKX wallet address has been updated successfully.', 'system', '/profile');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE req RECORD; otp text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO req FROM public.password_reset_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request already finalized'; END IF;
  otp := lpad((floor(random() * 1000000))::int::text, 6, '0');
  UPDATE public.password_reset_requests
    SET status = 'approved', approved_at = now(),
        otp_hash = encode(digest(otp, 'sha256'), 'hex'), updated_at = now()
    WHERE id = _request_id;
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (req.user_id, '✅ Password Reset Approved',
    'Your password reset OTP is ' || otp || '. Enter it on the reset page to set a new password. (Demo: also sent to your email and phone.)',
    'system', '/forgot-password');
END; $$;

CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(_email text, _otp text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE v_user uuid; req RECORD; h text;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT * INTO req FROM public.password_reset_requests
    WHERE user_id = v_user AND status = 'approved' AND otp_verified = false
    ORDER BY requested_at DESC LIMIT 1 FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'No approved reset found'; END IF;
  h := encode(digest(btrim(coalesce(_otp,'')), 'sha256'), 'hex');
  IF req.otp_hash IS NULL OR req.otp_hash <> h THEN RAISE EXCEPTION 'Invalid OTP'; END IF;
  UPDATE public.password_reset_requests SET otp_verified = true, updated_at = now() WHERE id = req.id;
  RETURN v_user;
END; $$;

-- 3) Remove anon insert on phone_verifications; expose RPC to anon instead.
DROP POLICY IF EXISTS "Anon insert phone verifications" ON public.phone_verifications;
GRANT EXECUTE ON FUNCTION public.create_signup_phone_otp(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(text, text) TO anon;

-- 4) Tighten withdrawal_otps UPDATE policy with WITH CHECK.
DROP POLICY IF EXISTS "Users update own withdrawal otps" ON public.withdrawal_otps;
CREATE POLICY "Users update own withdrawal otps" ON public.withdrawal_otps
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5) Attach the existing guard triggers so non-admin updates can't modify
-- privileged columns on profiles, deposits, kyc_submissions, task_completions.
DROP TRIGGER IF EXISTS profiles_guard_update_trg ON public.profiles;
CREATE TRIGGER profiles_guard_update_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

DROP TRIGGER IF EXISTS deposits_guard_update_trg ON public.deposits;
CREATE TRIGGER deposits_guard_update_trg
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.deposits_guard_update();

DROP TRIGGER IF EXISTS kyc_submissions_guard_update_trg ON public.kyc_submissions;
CREATE TRIGGER kyc_submissions_guard_update_trg
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.kyc_submissions_guard_update();

DROP TRIGGER IF EXISTS task_completions_guard_insert_trg ON public.task_completions;
CREATE TRIGGER task_completions_guard_insert_trg
  BEFORE INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.task_completions_guard_insert();

-- 6) Re-attach existing trigger functions known to be needed:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- (skip: managed elsewhere)

DROP TRIGGER IF EXISTS deposits_touch_updated_at ON public.deposits;
CREATE TRIGGER deposits_touch_updated_at BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS on_deposit_completed_trg ON public.deposits;
CREATE TRIGGER on_deposit_completed_trg AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_completed();

DROP TRIGGER IF EXISTS check_duplicate_slip_trg ON public.deposits;
CREATE TRIGGER check_duplicate_slip_trg AFTER INSERT ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.check_duplicate_slip();

DROP TRIGGER IF EXISTS on_kyc_approved_trg ON public.kyc_submissions;
CREATE TRIGGER on_kyc_approved_trg AFTER UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_kyc_approved();

DROP TRIGGER IF EXISTS check_daily_referral_bonus_trg ON public.referrals;
CREATE TRIGGER check_daily_referral_bonus_trg AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.check_daily_referral_bonus();
