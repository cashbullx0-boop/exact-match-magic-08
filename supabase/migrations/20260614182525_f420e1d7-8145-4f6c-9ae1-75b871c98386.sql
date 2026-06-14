
-- 1) Hide otp_hash columns by switching to column-level SELECT grants
-- password_reset_requests
REVOKE SELECT ON public.password_reset_requests FROM authenticated;
GRANT SELECT (id,user_id,otp_verified,status,admin_note,requested_at,approved_at,expires_at,updated_at)
  ON public.password_reset_requests TO authenticated;

-- phone_verifications: only need (phone, verified, expires_at) for the user; hide otp_hash
REVOKE SELECT ON public.phone_verifications FROM authenticated;
GRANT SELECT (id,user_id,phone,verified,expires_at,created_at)
  ON public.phone_verifications TO authenticated;

-- wallet_change_requests
REVOKE SELECT ON public.wallet_change_requests FROM authenticated;
GRANT SELECT (id,user_id,old_wallet,new_wallet,otp_verified,status,admin_note,requested_at,approved_at,expires_at,updated_at)
  ON public.wallet_change_requests TO authenticated;

-- withdrawal_otps
REVOKE SELECT ON public.withdrawal_otps FROM authenticated;
GRANT SELECT (id,user_id,withdrawal_id,email_verified,phone_verified,expires_at,created_at)
  ON public.withdrawal_otps TO authenticated;

-- 2) Daily checkins: revoke direct INSERT, expose via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users insert own checkins" ON public.daily_checkins;
REVOKE INSERT ON public.daily_checkins FROM authenticated;

CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS TABLE(streak_day integer, reward_cents integer, xp_gain integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  v_last date;
  v_streak integer;
  v_new_streak integer;
  v_reward integer;
  v_xp_gain integer;
  v_yesterday date := (CURRENT_DATE - 1);
  v_profile_xp integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT last_checkin_date, COALESCE(current_streak,0), xp INTO v_last, v_streak, v_profile_xp
    FROM public.profiles WHERE id = uid FOR UPDATE;

  IF v_last = CURRENT_DATE THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;

  v_new_streak := CASE WHEN v_last = v_yesterday THEN v_streak + 1 ELSE 1 END;
  v_reward := LEAST(50 + (v_new_streak - 1) * 10, 200);
  v_xp_gain := 20 + v_new_streak * 5;

  INSERT INTO public.daily_checkins (user_id, checkin_date, reward_cents, streak_day)
    VALUES (uid, CURRENT_DATE, v_reward, v_new_streak);

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + v_reward,
        total_earned_cents = total_earned_cents + v_reward,
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(longest_streak,0), v_new_streak),
        last_checkin_date = CURRENT_DATE,
        xp = v_profile_xp + v_xp_gain,
        level = (v_profile_xp + v_xp_gain) / 500 + 1,
        updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions (user_id, type, amount_cents, description)
    VALUES (uid, 'task_reward'::public.txn_type, v_reward, 'Daily check-in (day ' || v_new_streak || ')');

  RETURN QUERY SELECT v_new_streak, v_reward, v_xp_gain;
END $$;

REVOKE EXECUTE ON FUNCTION public.claim_daily_checkin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated, service_role;

-- 3) Withdrawals: revoke direct INSERT; require create_withdrawal RPC
DROP POLICY IF EXISTS "Users create own withdrawals" ON public.withdrawals;
REVOKE INSERT ON public.withdrawals FROM authenticated;

-- 4) Task completions: tighten WITH CHECK so reward_cents must equal task's reward_cents
DROP POLICY IF EXISTS "Users create own completions" ON public.task_completions;
CREATE POLICY "Users create own completions" ON public.task_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND reward_cents = (SELECT t.reward_cents FROM public.tasks t WHERE t.id = task_completions.task_id)
    AND status = 'pending'::public.completion_status
  );

-- 5) Profiles: tighten the user UPDATE policy so privileged fields cannot be changed.
-- The profiles_guard_update trigger already enforces this at the row level, but add a
-- WITH CHECK that prevents the most sensitive escalations to satisfy column-level scans.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND balance_cents = (SELECT p.balance_cents FROM public.profiles p WHERE p.id = profiles.id)
    AND total_earned_cents = (SELECT p.total_earned_cents FROM public.profiles p WHERE p.id = profiles.id)
    AND xp = (SELECT p.xp FROM public.profiles p WHERE p.id = profiles.id)
    AND level = (SELECT p.level FROM public.profiles p WHERE p.id = profiles.id)
    AND status = (SELECT p.status FROM public.profiles p WHERE p.id = profiles.id)
    AND COALESCE(kyc_approved_at, 'epoch'::timestamptz)
        = COALESCE((SELECT p.kyc_approved_at FROM public.profiles p WHERE p.id = profiles.id), 'epoch'::timestamptz)
    AND phone_verified = (SELECT p.phone_verified FROM public.profiles p WHERE p.id = profiles.id)
    AND okx_wallet_locked = (SELECT p.okx_wallet_locked FROM public.profiles p WHERE p.id = profiles.id)
    AND current_streak = (SELECT p.current_streak FROM public.profiles p WHERE p.id = profiles.id)
    AND longest_streak = (SELECT p.longest_streak FROM public.profiles p WHERE p.id = profiles.id)
    AND COALESCE(last_checkin_date, 'epoch'::date)
        = COALESCE((SELECT p.last_checkin_date FROM public.profiles p WHERE p.id = profiles.id), 'epoch'::date)
  );
