
-- 1) Pin search_path on the last remaining public function
ALTER FUNCTION public._current_referral_challenge_window() SET search_path = public;

-- 2) Explicit guard against self-setting referred_by on profiles UPDATE (non-admin).
--    profiles_guard_update already silently reset the value; now RAISE so any attempt
--    is unambiguously blocked and auditable.
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE bypass text;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  BEGIN bypass := current_setting('app.bypass_profile_guard', true); EXCEPTION WHEN OTHERS THEN bypass := NULL; END;
  IF bypass = 'on' THEN RETURN NEW; END IF;

  -- Explicitly reject any attempt to change referred_by via a user-driven UPDATE.
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referred_by can only be set at signup via claim_referral_code';
  END IF;

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
END;
$function$;

-- Also tighten the UPDATE RLS with_check so referred_by cannot transition NULL -> value
-- from the RLS layer (defence in depth alongside the trigger).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND balance_cents          = (SELECT p.balance_cents          FROM public.profiles p WHERE p.id = profiles.id)
  AND total_earned_cents     = (SELECT p.total_earned_cents     FROM public.profiles p WHERE p.id = profiles.id)
  AND xp                     = (SELECT p.xp                     FROM public.profiles p WHERE p.id = profiles.id)
  AND level                  = (SELECT p.level                  FROM public.profiles p WHERE p.id = profiles.id)
  AND status                 = (SELECT p.status                 FROM public.profiles p WHERE p.id = profiles.id)
  AND COALESCE(kyc_approved_at, 'epoch'::timestamptz) = COALESCE((SELECT p.kyc_approved_at FROM public.profiles p WHERE p.id = profiles.id), 'epoch'::timestamptz)
  AND phone_verified         = (SELECT p.phone_verified         FROM public.profiles p WHERE p.id = profiles.id)
  AND okx_wallet_locked      = (SELECT p.okx_wallet_locked      FROM public.profiles p WHERE p.id = profiles.id)
  AND current_streak         = (SELECT p.current_streak         FROM public.profiles p WHERE p.id = profiles.id)
  AND longest_streak         = (SELECT p.longest_streak         FROM public.profiles p WHERE p.id = profiles.id)
  AND COALESCE(last_checkin_date, 'epoch'::date) = COALESCE((SELECT p.last_checkin_date FROM public.profiles p WHERE p.id = profiles.id), 'epoch'::date)
  AND referred_by IS NOT DISTINCT FROM (SELECT p.referred_by  FROM public.profiles p WHERE p.id = profiles.id)
  AND referral_code          = (SELECT p.referral_code          FROM public.profiles p WHERE p.id = profiles.id)
  -- Explicit hard block: users may never set referred_by from RLS layer
  AND (referred_by IS NULL OR referred_by = (SELECT p.referred_by FROM public.profiles p WHERE p.id = profiles.id))
);

-- 3) Force RLS on transactions so realtime cannot bypass row-level checks even for
--    table owners; SELECT policy is already auth.uid()=user_id.
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions REPLICA IDENTITY DEFAULT;
REVOKE SELECT ON public.transactions FROM anon;
