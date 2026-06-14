
CREATE OR REPLACE FUNCTION public.generate_withdrawal_otp(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE otp TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  otp := lpad(floor(random() * 1000000)::text, 6, '0');
  INSERT INTO public.withdrawal_otps (user_id, otp_hash)
    VALUES (_user_id, encode(digest(otp, 'sha256'), 'hex'));
  INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (_user_id, '🔐 Withdrawal OTP',
      'Your withdrawal OTP is: ' || otp || '. Valid for 10 minutes. Do not share with anyone.',
      'system');
  RETURN otp;
END; $function$;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_otp(_user_id uuid, _otp text, _type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE otp_record RECORD; h text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
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
END; $function$;
