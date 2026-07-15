
-- Weekly Referral Challenge: 10 direct referrals who each made a deposit within a rolling 7-day window = $50 bonus.

CREATE TABLE IF NOT EXISTS public.weekly_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  qualifying_referral_count INT NOT NULL,
  amount_cents INT NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_referral_rewards TO authenticated;
GRANT ALL ON public.weekly_referral_rewards TO service_role;

ALTER TABLE public.weekly_referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own weekly referral rewards"
  ON public.weekly_referral_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wrr_user_awarded ON public.weekly_referral_rewards(user_id, awarded_at DESC);

-- Progress RPC — returns current 7-day rolling stats for the caller.
CREATE OR REPLACE FUNCTION public.get_weekly_referral_challenge()
RETURNS TABLE (
  total_direct_last_7d INT,
  deposited_last_7d INT,
  target INT,
  reward_cents INT,
  last_claim_at TIMESTAMPTZ,
  next_eligible_at TIMESTAMPTZ,
  can_claim BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  last_claim TIMESTAMPTZ;
  window_start_ts TIMESTAMPTZ := now() - interval '7 days';
  total_n INT := 0;
  dep_n INT := 0;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  SELECT MAX(awarded_at) INTO last_claim FROM public.weekly_referral_rewards WHERE user_id = uid;

  -- Count direct referrals who signed up within the last 7 days
  SELECT COUNT(*) INTO total_n
  FROM public.profiles p
  WHERE p.referred_by = uid
    AND p.created_at >= window_start_ts;

  -- Of those, how many have made at least one approved deposit
  SELECT COUNT(DISTINCT p.id) INTO dep_n
  FROM public.profiles p
  WHERE p.referred_by = uid
    AND p.created_at >= window_start_ts
    AND EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = p.id AND d.status = 'approved'
    );

  RETURN QUERY SELECT
    total_n,
    dep_n,
    10 AS target,
    5000 AS reward_cents,
    last_claim,
    CASE WHEN last_claim IS NULL THEN now() ELSE last_claim + interval '7 days' END,
    (dep_n >= 10 AND (last_claim IS NULL OR last_claim < now() - interval '7 days'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_referral_challenge() TO authenticated;

-- Attempt-award function (idempotent-ish; guarded by 7-day cooldown).
-- Callable by user (for their own account) or by trigger with a passed uid.
CREATE OR REPLACE FUNCTION public.try_claim_weekly_referral_bonus(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_claim TIMESTAMPTZ;
  dep_n INT := 0;
  window_start_ts TIMESTAMPTZ := now() - interval '7 days';
BEGIN
  IF p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT MAX(awarded_at) INTO last_claim
  FROM public.weekly_referral_rewards
  WHERE user_id = p_user_id;

  IF last_claim IS NOT NULL AND last_claim >= now() - interval '7 days' THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(DISTINCT p.id) INTO dep_n
  FROM public.profiles p
  WHERE p.referred_by = p_user_id
    AND p.created_at >= window_start_ts
    AND EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = p.id AND d.status = 'approved'
    );

  IF dep_n < 10 THEN
    RETURN FALSE;
  END IF;

  -- Credit $50 bonus
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + 5000,
        total_earned_cents = total_earned_cents + 5000,
        updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions(user_id, type, amount_cents, description)
  VALUES (p_user_id, 'bonus', 5000, '🚀 Weekly Referral Challenge — 10 depositing referrals reward');

  INSERT INTO public.weekly_referral_rewards(user_id, window_start, window_end, qualifying_referral_count, amount_cents)
  VALUES (p_user_id, window_start_ts, now(), dep_n, 5000);

  -- Notification (best effort)
  BEGIN
    INSERT INTO public.notifications(user_id, title, body, type)
    VALUES (p_user_id, '🎉 Weekly Challenge Complete!', 'You earned $50 for bringing 10 depositing referrals this week!', 'bonus');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_claim_weekly_referral_bonus(UUID) TO authenticated, service_role;

-- Wrapper the user can call for themselves from UI.
CREATE OR REPLACE FUNCTION public.claim_weekly_referral_bonus()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  RETURN public.try_claim_weekly_referral_bonus(auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_weekly_referral_bonus() TO authenticated;

-- Trigger on deposits: whenever a deposit becomes approved, try to award referrer.
CREATE OR REPLACE FUNCTION public.on_deposit_check_weekly_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT referred_by INTO ref_id FROM public.profiles WHERE id = NEW.user_id;
    IF ref_id IS NOT NULL THEN
      PERFORM public.try_claim_weekly_referral_bonus(ref_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deposits_weekly_referral_trg ON public.deposits;
CREATE TRIGGER deposits_weekly_referral_trg
  AFTER UPDATE OF status ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.on_deposit_check_weekly_referral();
