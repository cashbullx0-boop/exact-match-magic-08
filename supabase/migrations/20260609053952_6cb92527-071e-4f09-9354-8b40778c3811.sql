
-- Enforce OTP in create_withdrawal
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount_cents integer, _network text, _wallet_address text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  addr text := btrim(coalesce(_wallet_address,''));
  net public.withdrawal_network;
  new_id uuid;
  otp_ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $10';
  END IF;
  IF _amount_cents > 1000000000 THEN
    RAISE EXCEPTION 'Amount too large';
  END IF;
  IF _network NOT IN ('TRC20','BEP20','ERC20') THEN
    RAISE EXCEPTION 'Invalid network';
  END IF;
  net := _network::public.withdrawal_network;
  IF length(addr) < 20 OR length(addr) > 128 THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  IF addr !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Wallet address contains invalid characters';
  END IF;

  SELECT public.check_withdrawal_otp_complete(uid) INTO otp_ok;
  IF NOT otp_ok THEN
    RAISE EXCEPTION 'Withdrawal OTP not verified';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;

  INSERT INTO public.withdrawals (user_id, amount_cents, network, wallet_address)
    VALUES (uid, _amount_cents, net, addr)
    RETURNING id INTO new_id;

  -- consume verified OTPs so they can't be reused
  DELETE FROM public.withdrawal_otps
    WHERE user_id = uid AND email_verified = true AND phone_verified = true;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Withdrawal request (' || _network || ')', new_id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (uid, 'Withdrawal requested',
      'Your withdrawal of $' || (_amount_cents/100.0)::text || ' is pending review.',
      'system', '/wallet');

  RETURN new_id;
END; $function$;

-- Signup phone OTP helpers (anonymous-callable)
CREATE OR REPLACE FUNCTION public.create_signup_phone_otp(_phone text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  phone_norm text := btrim(coalesce(_phone, ''));
  otp text;
BEGIN
  IF length(phone_norm) < 6 OR length(phone_norm) > 32 OR phone_norm !~ '^\+?[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  otp := lpad(floor(random() * 1000000)::int::text, 6, '0');
  -- clean old codes for this phone
  DELETE FROM public.phone_verifications
    WHERE phone = phone_norm AND (expires_at < now() OR verified = false);
  INSERT INTO public.phone_verifications (phone, otp_code)
    VALUES (phone_norm, otp);
  RETURN otp;
END; $function$;

GRANT EXECUTE ON FUNCTION public.create_signup_phone_otp(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_signup_phone_otp(_phone text, _otp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  phone_norm text := btrim(coalesce(_phone, ''));
BEGIN
  SELECT * INTO rec FROM public.phone_verifications
    WHERE phone = phone_norm
      AND otp_code = btrim(coalesce(_otp,''))
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  IF rec IS NULL THEN RETURN false; END IF;
  UPDATE public.phone_verifications
    SET verified = true
    WHERE id = rec.id;
  RETURN true;
END; $function$;

GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(text, text) TO anon, authenticated;

-- Allow new user to attach verified phone to their profile during signup completion
CREATE OR REPLACE FUNCTION public.attach_verified_phone(_phone text, _country_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  phone_norm text := btrim(coalesce(_phone, ''));
  ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.phone_verifications
    WHERE phone = phone_norm AND verified = true AND expires_at > now() - interval '1 hour'
  ) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Phone not verified'; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET phone = phone_norm,
        phone_country_code = nullif(btrim(coalesce(_country_code,'')), ''),
        phone_verified = true,
        updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END; $function$;

GRANT EXECUTE ON FUNCTION public.attach_verified_phone(text, text) TO authenticated;
