
-- Revoke column-level SELECT on otp_hash from authenticated/anon on every table that has it.
-- Verification happens server-side via SECURITY DEFINER RPCs that bypass column grants.
REVOKE SELECT (otp_hash) ON public.phone_verifications      FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.wallet_change_requests    FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.withdrawal_otps           FROM authenticated, anon;
REVOKE SELECT (otp_hash) ON public.password_reset_requests   FROM authenticated, anon;

-- Re-grant SELECT on every OTHER column so existing policies/queries keep working.
DO $$
DECLARE
  t text;
  cols text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'phone_verifications','wallet_change_requests','withdrawal_otps','password_reset_requests'
  ] LOOP
    SELECT string_agg(quote_ident(column_name), ', ')
      INTO cols
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name <> 'otp_hash';
    EXECUTE format('GRANT SELECT (%s) ON public.%I TO authenticated', cols, t);
  END LOOP;
END $$;

-- Lock KYC identity fields after submission so a rejected user cannot re-submit altered documents.
CREATE OR REPLACE FUNCTION public.kyc_submissions_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Immutable identity/audit columns
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.submitted_at := OLD.submitted_at;
  NEW.created_at := OLD.created_at;

  -- Admin/review-only columns
  NEW.status := OLD.status;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;

  -- Identity fields locked after initial submission (defense-in-depth against
  -- rejected users re-submitting altered documents on the same row).
  NEW.id_number := OLD.id_number;
  NEW.full_legal_name := OLD.full_legal_name;
  NEW.date_of_birth := OLD.date_of_birth;

  RETURN NEW;
END;
$function$;
