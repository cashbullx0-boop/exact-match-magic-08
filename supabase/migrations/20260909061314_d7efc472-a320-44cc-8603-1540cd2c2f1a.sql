CREATE OR REPLACE FUNCTION public.first_deposit_bonus_cents(_amount_usd numeric)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN _amount_usd >= 50 THEN 500 ELSE 0 END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  is_first boolean;
  referrer uuid;
  ref_cents integer;
  bonus_cents integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  IF d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN
    RETURN;
  END IF;
  IF d.status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN
    RAISE EXCEPTION 'Deposit cannot be approved in its current state';
  END IF;
  IF nullif(btrim(d.slip_path), '') IS NULL THEN
    RAISE EXCEPTION 'Payment slip is required before approval';
  END IF;
  IF nullif(btrim(d.tx_hash), '') IS NULL THEN
    RAISE EXCEPTION 'Transaction hash is required before approval';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.deposits
    WHERE user_id = d.user_id
      AND status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
      AND id <> d.id
  ) INTO is_first;

  UPDATE public.deposits
  SET status = 'completed'::public.deposit_status,
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
  WHERE id = d.id;

  UPDATE public.profiles
  SET balance_cents = balance_cents + round(d.amount_usd * 100)::integer,
      updated_at = now()
  WHERE id = d.user_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  SELECT d.user_id, 'deposit'::public.txn_type, round(d.amount_usd * 100)::integer,
         'USDT deposit approved', d.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE related_id = d.id AND type = 'deposit'::public.txn_type
  );

  IF is_first THEN
    bonus_cents := public.first_deposit_bonus_cents(d.amount_usd);

    IF bonus_cents > 0 THEN
      UPDATE public.profiles
      SET balance_cents = balance_cents + bonus_cents,
          total_earned_cents = total_earned_cents + bonus_cents,
          updated_at = now()
      WHERE id = d.user_id;

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      SELECT d.user_id, 'bonus'::public.txn_type, bonus_cents,
             '🎁 First deposit reward', d.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.transactions
        WHERE user_id = d.user_id AND description = '🎁 First deposit reward'
      );
    END IF;

    SELECT referred_by INTO referrer FROM public.profiles WHERE id = d.user_id;

    ref_cents := CASE
      WHEN d.amount_usd >= 50 THEN public.referral_reward_cents(now())
      ELSE GREATEST(0, ROUND(d.amount_usd * 100 * 0.10)::int)
    END;

    IF referrer IS NOT NULL AND ref_cents > 0 AND NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = referrer AND related_id = d.user_id
        AND description LIKE '🎁 Referral first-deposit reward%'
    ) THEN
      UPDATE public.profiles
      SET balance_cents = balance_cents + ref_cents,
          total_earned_cents = total_earned_cents + ref_cents,
          updated_at = now()
      WHERE id = referrer;

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (referrer, 'bonus'::public.txn_type, ref_cents,
        '🎁 Referral first-deposit reward', d.user_id);
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.open_roi_trade(_amount_cents integer, _duration_hours integer)
 RETURNS trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  profit_cents integer;
  current_day date;
  existing_today int;
  next_boundary_utc timestamptz;
  remaining interval;
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_maintenance_mode() AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'CashBullX is currently under maintenance. Please try again shortly.';
  END IF;
  IF _amount_cents IS NULL OR _amount_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum trade amount is $10';
  END IF;
  IF _amount_cents % 1000 <> 0 THEN
    RAISE EXCEPTION 'Amount must be in multiples of $10 (10, 20, 30...)';
  END IF;
  IF _duration_hours NOT IN (4, 8, 12) THEN
    RAISE EXCEPTION 'Invalid duration. Choose 4, 8 or 12 hours';
  END IF;

  current_day := ((now() AT TIME ZONE 'Europe/London') - interval '4 hours')::date;

  SELECT COUNT(*) INTO existing_today
  FROM public.trades
  WHERE user_id = uid
    AND (((created_at AT TIME ZONE 'Europe/London') - interval '4 hours')::date) = current_day;

  IF existing_today > 0 THEN
    next_boundary_utc := ((current_day + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Europe/London';
    remaining := next_boundary_utc - now();
    RAISE EXCEPTION 'You can place your next trade in % hours % minutes (one trade per day, resets 4:00 AM UK time).',
      EXTRACT(HOUR FROM remaining)::int,
      EXTRACT(MINUTE FROM remaining)::int;
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  profit_cents := floor(_amount_cents * 0.02)::integer;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.trades (
    user_id, amount_cents, status, duration_hours, profit_rate, profit_amount_cents, expires_at
  ) VALUES (
    uid, _amount_cents, 'active', _duration_hours, 0.02, profit_cents,
    now() + make_interval(hours => _duration_hours)
  ) RETURNING * INTO new_trade;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
    'Investment opened (' || _duration_hours || 'h, 2% ROI)',
    new_trade.id);

  RETURN new_trade;
END $function$;