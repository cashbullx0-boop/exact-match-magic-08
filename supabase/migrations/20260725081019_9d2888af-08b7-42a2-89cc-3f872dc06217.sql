
CREATE OR REPLACE FUNCTION public.on_deposit_check_weekly_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE ref_id UUID;
BEGIN
  IF NEW.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND (OLD.status NOT IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
          OR OLD.status IS NULL) THEN
    SELECT referred_by INTO ref_id FROM public.profiles WHERE id = NEW.user_id;
    IF ref_id IS NOT NULL THEN
      PERFORM public.try_claim_weekly_referral_bonus(ref_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.try_claim_weekly_referral_bonus(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  dep_n INT := 0;
BEGIN
  IF p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT window_start, window_end INTO v_start, v_end FROM public._current_referral_challenge_window();

  IF EXISTS (
    SELECT 1 FROM public.weekly_referral_rewards
    WHERE user_id = p_user_id AND window_start = v_start
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(DISTINCT p.id) INTO dep_n
  FROM public.profiles p
  WHERE p.referred_by = p_user_id
    AND p.created_at >= v_start AND p.created_at < v_end
    AND EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = p.id
        AND d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
        AND d.created_at >= v_start AND d.created_at < v_end
    );

  IF dep_n < 10 THEN RETURN FALSE; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + 5000,
        total_earned_cents = total_earned_cents + 5000,
        updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions(user_id, type, amount_cents, description)
  VALUES (p_user_id, 'bonus', 5000, '🚀 Daily Referral Challenge — 10 depositing referrals reward');

  INSERT INTO public.weekly_referral_rewards(user_id, window_start, window_end, qualifying_referral_count, amount_cents)
  VALUES (p_user_id, v_start, v_end, dep_n, 5000);

  BEGIN
    INSERT INTO public.notifications(user_id, title, body, type)
    VALUES (p_user_id, '🎉 Daily Challenge Complete!', 'You earned $50 for bringing 10 depositing referrals today!', 'bonus');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_referral_challenge()
RETURNS TABLE(total_direct_last_7d integer, deposited_last_7d integer, target integer, reward_cents integer, last_claim_at timestamp with time zone, next_eligible_at timestamp with time zone, can_claim boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  total_n INT := 0;
  dep_n INT := 0;
  last_claim TIMESTAMPTZ;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  SELECT window_start, window_end INTO v_start, v_end FROM public._current_referral_challenge_window();

  SELECT COUNT(*) INTO total_n
  FROM public.profiles p
  WHERE p.referred_by = uid AND p.created_at >= v_start AND p.created_at < v_end;

  SELECT COUNT(DISTINCT p.id) INTO dep_n
  FROM public.profiles p
  WHERE p.referred_by = uid
    AND p.created_at >= v_start AND p.created_at < v_end
    AND EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = p.id
        AND d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
        AND d.created_at >= v_start AND d.created_at < v_end
    );

  SELECT MAX(awarded_at) INTO last_claim
  FROM public.weekly_referral_rewards
  WHERE user_id = uid AND window_start = v_start;

  IF dep_n >= 10 AND last_claim IS NULL THEN
    PERFORM public.try_claim_weekly_referral_bonus(uid);
    SELECT MAX(awarded_at) INTO last_claim
    FROM public.weekly_referral_rewards
    WHERE user_id = uid AND window_start = v_start;
  END IF;

  RETURN QUERY SELECT total_n, dep_n, 10, 5000, last_claim, v_end, false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_daily_referral_challenge_rewards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  r RECORD;
BEGIN
  SELECT window_start, window_end INTO v_start, v_end FROM public._current_referral_challenge_window();

  FOR r IN
    SELECT p.referred_by AS referrer_id, COUNT(DISTINCT p.id) AS dep_n
    FROM public.profiles p
    WHERE p.referred_by IS NOT NULL
      AND p.created_at >= v_start AND p.created_at < v_end
      AND EXISTS (
        SELECT 1 FROM public.deposits d
        WHERE d.user_id = p.id
          AND d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
          AND d.created_at >= v_start AND d.created_at < v_end
      )
    GROUP BY p.referred_by
    HAVING COUNT(DISTINCT p.id) >= 10
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.weekly_referral_rewards
      WHERE user_id = r.referrer_id AND window_start = v_start
    ) THEN
      PERFORM public.try_claim_weekly_referral_bonus(r.referrer_id);
    END IF;
  END LOOP;
END;
$function$;
