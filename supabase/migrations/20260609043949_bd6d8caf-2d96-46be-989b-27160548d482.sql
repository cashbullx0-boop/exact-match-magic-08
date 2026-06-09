
-- 1) Update profiles guard to lock okx_wallet once set
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.balance_cents := OLD.balance_cents;
  NEW.total_earned_cents := OLD.total_earned_cents;
  NEW.xp := OLD.xp;
  NEW.level := OLD.level;
  NEW.status := OLD.status;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.current_streak := OLD.current_streak;
  NEW.longest_streak := OLD.longest_streak;
  NEW.last_checkin_date := OLD.last_checkin_date;
  NEW.two_factor_enabled := OLD.two_factor_enabled;
  NEW.created_at := OLD.created_at;
  -- Lock OKX wallet once it has been set & locked
  IF OLD.okx_wallet_locked THEN
    NEW.okx_wallet := OLD.okx_wallet;
    NEW.okx_wallet_locked := OLD.okx_wallet_locked;
  END IF;
  RETURN NEW;
END; $$;

-- 2) Set OKX wallet first time (locks it)
CREATE OR REPLACE FUNCTION public.set_okx_wallet(_address text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  addr text := btrim(coalesce(_address, ''));
  locked boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(addr) < 20 OR length(addr) > 128 OR addr !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  SELECT okx_wallet_locked INTO locked FROM public.profiles WHERE id = uid FOR UPDATE;
  IF locked THEN RAISE EXCEPTION 'Wallet is locked. Submit a change request to update.'; END IF;
  UPDATE public.profiles
    SET okx_wallet = addr, okx_wallet_locked = true, updated_at = now()
    WHERE id = uid;
END; $$;

-- 3) Request wallet change
CREATE OR REPLACE FUNCTION public.request_wallet_change(_new_wallet text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  addr text := btrim(coalesce(_new_wallet, ''));
  old_addr text;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(addr) < 20 OR length(addr) > 128 OR addr !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  SELECT okx_wallet INTO old_addr FROM public.profiles WHERE id = uid;
  IF old_addr = addr THEN RAISE EXCEPTION 'New address matches current wallet'; END IF;

  -- Prevent duplicate active requests
  IF EXISTS (SELECT 1 FROM public.wallet_change_requests
             WHERE user_id = uid AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending wallet change request';
  END IF;

  INSERT INTO public.wallet_change_requests (user_id, old_wallet, new_wallet)
  VALUES (uid, old_addr, addr) RETURNING id INTO new_id;

  -- Notify admins
  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT ur.user_id, 'Wallet change request',
    'A user submitted a wallet change request awaiting review.',
    'admin', '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN new_id;
END; $$;

-- 4) Admin approves wallet change -> generate OTP + notify user
CREATE OR REPLACE FUNCTION public.admin_approve_wallet_change(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req RECORD;
  otp text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO req FROM public.wallet_change_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request already finalized'; END IF;

  otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  UPDATE public.wallet_change_requests
    SET status = 'approved', approved_at = now(), otp_code = otp, updated_at = now()
    WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (req.user_id, '✅ Wallet Change Approved',
    'Your wallet change OTP is ' || otp || '. Enter it on the wallet page to confirm the new address. (Demo: also sent to your email and phone.)',
    'system', '/profile');
END; $$;

-- 5) User confirms wallet change with OTP
CREATE OR REPLACE FUNCTION public.confirm_wallet_change(_request_id uuid, _otp text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  req RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.wallet_change_requests
    WHERE id = _request_id AND user_id = uid FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'approved' THEN RAISE EXCEPTION 'Request not approved yet'; END IF;
  IF req.otp_verified THEN RAISE EXCEPTION 'Already confirmed'; END IF;
  IF req.otp_code IS NULL OR req.otp_code <> btrim(coalesce(_otp,'')) THEN
    RAISE EXCEPTION 'Invalid OTP';
  END IF;

  UPDATE public.wallet_change_requests
    SET otp_verified = true, updated_at = now()
    WHERE id = _request_id;

  -- Admin-elevated update bypasses guard (security definer + has_role short-circuit not available, so update directly)
  UPDATE public.profiles
    SET okx_wallet = req.new_wallet, okx_wallet_locked = true, updated_at = now()
    WHERE id = uid;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (uid, 'Wallet updated', 'Your OKX wallet address has been updated successfully.', 'system', '/profile');
END; $$;

-- Note: confirm_wallet_change runs as SECURITY DEFINER (owner = postgres),
-- so the profiles_guard_update trigger sees auth.uid() as the caller (non-admin)
-- and would block okx_wallet changes. We bypass by setting a session flag.
-- Simpler approach: update guard to allow when a GUC is set by definer.

-- Adjust guard to honor a per-transaction bypass GUC set by our definer functions
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bypass text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  BEGIN bypass := current_setting('app.bypass_profile_guard', true); EXCEPTION WHEN OTHERS THEN bypass := NULL; END;
  IF bypass = 'on' THEN RETURN NEW; END IF;

  NEW.id := OLD.id;
  NEW.balance_cents := OLD.balance_cents;
  NEW.total_earned_cents := OLD.total_earned_cents;
  NEW.xp := OLD.xp;
  NEW.level := OLD.level;
  NEW.status := OLD.status;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.current_streak := OLD.current_streak;
  NEW.longest_streak := OLD.longest_streak;
  NEW.last_checkin_date := OLD.last_checkin_date;
  NEW.two_factor_enabled := OLD.two_factor_enabled;
  NEW.created_at := OLD.created_at;
  IF OLD.okx_wallet_locked THEN
    NEW.okx_wallet := OLD.okx_wallet;
    NEW.okx_wallet_locked := OLD.okx_wallet_locked;
  END IF;
  RETURN NEW;
END; $$;

-- Re-create confirm_wallet_change using GUC bypass
CREATE OR REPLACE FUNCTION public.confirm_wallet_change(_request_id uuid, _otp text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  req RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.wallet_change_requests
    WHERE id = _request_id AND user_id = uid FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'approved' THEN RAISE EXCEPTION 'Request not approved yet'; END IF;
  IF req.otp_verified THEN RAISE EXCEPTION 'Already confirmed'; END IF;
  IF req.otp_code IS NULL OR req.otp_code <> btrim(coalesce(_otp,'')) THEN
    RAISE EXCEPTION 'Invalid OTP';
  END IF;

  UPDATE public.wallet_change_requests
    SET otp_verified = true, updated_at = now()
    WHERE id = _request_id;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET okx_wallet = req.new_wallet, okx_wallet_locked = true, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (uid, 'Wallet updated', 'Your OKX wallet address has been updated successfully.', 'system', '/profile');
END; $$;

-- 6) Password reset: request by email (callable by service role from server function)
CREATE OR REPLACE FUNCTION public.request_password_reset_by_email(_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_user uuid;
  new_id uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF v_user IS NULL THEN
    -- silent: don't leak user existence
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.password_reset_requests WHERE user_id = v_user AND status = 'pending') THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.password_reset_requests (user_id) VALUES (v_user) RETURNING id INTO new_id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT ur.user_id, 'Password reset request',
    'A user requested a password reset awaiting review.', 'admin', '/admin'
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN new_id;
END; $$;

-- 7) Admin approves password reset -> generate OTP, notify user
CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req RECORD;
  otp text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO req FROM public.password_reset_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request already finalized'; END IF;

  otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  UPDATE public.password_reset_requests
    SET status = 'approved', approved_at = now(), otp_code = otp, updated_at = now()
    WHERE id = _request_id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (req.user_id, '✅ Password Reset Approved',
    'Your password reset OTP is ' || otp || '. Enter it on the reset page to set a new password. (Demo: also sent to your email and phone.)',
    'system', '/forgot-password');
END; $$;

-- 8) Verify OTP for password reset (used by server fn before admin updates password)
CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(_email text, _otp text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_user uuid;
  req RECORD;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
  SELECT * INTO req FROM public.password_reset_requests
    WHERE user_id = v_user AND status = 'approved' AND otp_verified = false
    ORDER BY requested_at DESC LIMIT 1 FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'No approved reset found'; END IF;
  IF req.otp_code IS NULL OR req.otp_code <> btrim(coalesce(_otp,'')) THEN
    RAISE EXCEPTION 'Invalid OTP';
  END IF;
  UPDATE public.password_reset_requests SET otp_verified = true, updated_at = now() WHERE id = req.id;
  RETURN v_user;
END; $$;

GRANT EXECUTE ON FUNCTION public.set_okx_wallet(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_change(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_wallet_change(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_wallet_change(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_password_reset_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_password_reset_otp(text, text) TO service_role;
