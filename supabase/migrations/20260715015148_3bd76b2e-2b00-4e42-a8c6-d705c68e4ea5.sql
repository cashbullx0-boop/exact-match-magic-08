
-- Redefine admin approval to issue a single-use reset token instead of an OTP.
-- Token is returned in plaintext ONCE (to the caller, so we can email it).
-- Only its sha256 hash is stored in password_reset_requests.otp_hash.

DROP FUNCTION IF EXISTS public.admin_approve_password_reset(uuid);

CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(_request_id uuid)
RETURNS TABLE(token text, user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _raw text;
  _hash text;
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT pr.user_id INTO _uid
  FROM public.password_reset_requests pr
  WHERE pr.id = _request_id AND pr.status = 'pending'
  FOR UPDATE;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _uid;
  IF _email IS NULL THEN
    RAISE EXCEPTION 'User email missing';
  END IF;

  _raw := encode(gen_random_bytes(24), 'hex');
  _hash := encode(digest(_raw, 'sha256'), 'hex');

  UPDATE public.password_reset_requests
     SET status = 'approved',
         approved_at = now(),
         expires_at = now() + interval '1 hour',
         otp_hash = _hash,
         otp_verified = false,
         updated_at = now()
   WHERE id = _request_id;

  token := _raw;
  user_id := _uid;
  email := _email;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_password_reset(uuid) TO authenticated;

-- Verify + consume the reset token. Returns user_id on success, marks completed.
CREATE OR REPLACE FUNCTION public.consume_password_reset_token(_request_id uuid, _token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.password_reset_requests%ROWTYPE;
  _hash text;
BEGIN
  SELECT * INTO _row FROM public.password_reset_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid reset link'; END IF;
  IF _row.status <> 'approved' THEN RAISE EXCEPTION 'Reset link is no longer valid'; END IF;
  IF _row.expires_at < now() THEN RAISE EXCEPTION 'Reset link expired'; END IF;

  _hash := encode(digest(_token, 'sha256'), 'hex');
  IF _row.otp_hash IS NULL OR _row.otp_hash <> _hash THEN
    RAISE EXCEPTION 'Invalid reset link';
  END IF;

  UPDATE public.password_reset_requests
     SET status = 'completed',
         otp_verified = true,
         otp_hash = NULL,
         updated_at = now()
   WHERE id = _request_id;

  RETURN _row.user_id;
END;
$$;

-- Service role only; called from server function with supabaseAdmin.
REVOKE ALL ON FUNCTION public.consume_password_reset_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(uuid, text) TO service_role;
