
-- 1) withdrawal_otps: prevent users from self-verifying or changing otp_hash
CREATE OR REPLACE FUNCTION public.withdrawal_otps_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE bypass text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  BEGIN bypass := current_setting('app.bypass_otp_guard', true); EXCEPTION WHEN OTHERS THEN bypass := NULL; END;
  IF bypass = 'on' THEN RETURN NEW; END IF;

  -- lock all sensitive fields for direct user updates
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.otp_hash := OLD.otp_hash;
  NEW.email_verified := OLD.email_verified;
  NEW.phone_verified := OLD.phone_verified;
  NEW.expires_at := OLD.expires_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS withdrawal_otps_guard_update_trg ON public.withdrawal_otps;
CREATE TRIGGER withdrawal_otps_guard_update_trg
  BEFORE UPDATE ON public.withdrawal_otps
  FOR EACH ROW EXECUTE FUNCTION public.withdrawal_otps_guard_update();

-- Update verify_withdrawal_otp to bypass guard when it flips verified flags
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

  PERFORM set_config('app.bypass_otp_guard', 'on', true);
  IF _type = 'email' THEN
    UPDATE public.withdrawal_otps SET email_verified = true WHERE id = otp_record.id;
  ELSIF _type = 'phone' THEN
    UPDATE public.withdrawal_otps SET phone_verified = true WHERE id = otp_record.id;
  END IF;
  PERFORM set_config('app.bypass_otp_guard', 'off', true);
  RETURN true;
END; $$;


-- 2) password_reset_requests: force safe defaults on user INSERT
CREATE OR REPLACE FUNCTION public.password_reset_requests_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.status := 'pending';
  NEW.otp_verified := false;
  NEW.approved_at := NULL;
  NEW.otp_hash := NULL;
  NEW.created_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS password_reset_requests_guard_insert_trg ON public.password_reset_requests;
CREATE TRIGGER password_reset_requests_guard_insert_trg
  BEFORE INSERT ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.password_reset_requests_guard_insert();


-- 3) password_reset_requests: also prevent users from updating sensitive fields directly
CREATE OR REPLACE FUNCTION public.password_reset_requests_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  -- only allow updated_at changes from non-admin paths; everything else locked
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.status := OLD.status;
  NEW.otp_hash := OLD.otp_hash;
  NEW.otp_verified := OLD.otp_verified;
  NEW.approved_at := OLD.approved_at;
  NEW.requested_at := OLD.requested_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS password_reset_requests_guard_update_trg ON public.password_reset_requests;
CREATE TRIGGER password_reset_requests_guard_update_trg
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.password_reset_requests_guard_update();
