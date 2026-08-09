CREATE OR REPLACE FUNCTION public.password_reset_requests_guard_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.status := 'pending';
  NEW.otp_verified := false;
  NEW.approved_at := NULL;
  NEW.otp_hash := NULL;
  NEW.requested_at := now();
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.password_reset_requests_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.status := OLD.status;
  NEW.otp_hash := OLD.otp_hash;
  NEW.otp_verified := OLD.otp_verified;
  NEW.approved_at := OLD.approved_at;
  NEW.requested_at := OLD.requested_at;
  RETURN NEW;
END; $function$;