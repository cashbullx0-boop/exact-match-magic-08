
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
  IF _amount_cents IS NULL OR _amount_cents < 5000 THEN
    RAISE EXCEPTION 'Minimum trade amount is $50';
  END IF;
  IF _amount_cents % 1000 <> 0 THEN
    RAISE EXCEPTION 'Amount must be in multiples of $10 (50, 60, 70...)';
  END IF;
  IF _duration_hours NOT IN (4, 8, 12) THEN
    RAISE EXCEPTION 'Invalid duration. Choose 4, 8 or 12 hours';
  END IF;

  -- Trading day = 4:00 AM Europe/London to next 4:00 AM Europe/London.
  current_day := ((now() AT TIME ZONE 'Europe/London') - interval '4 hours')::date;

  SELECT COUNT(*) INTO existing_today
  FROM public.trades
  WHERE user_id = uid
    AND (((created_at AT TIME ZONE 'Europe/London') - interval '4 hours')::date) = current_day;

  IF existing_today > 0 THEN
    -- Next 4am London boundary, converted back to UTC.
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

CREATE OR REPLACE FUNCTION public.trade_cooldown_seconds()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH current_day AS (
    SELECT ((now() AT TIME ZONE 'Europe/London') - interval '4 hours')::date AS d
  ),
  has_today AS (
    SELECT EXISTS (
      SELECT 1 FROM public.trades
      WHERE user_id = auth.uid()
        AND (((created_at AT TIME ZONE 'Europe/London') - interval '4 hours')::date) = (SELECT d FROM current_day)
    ) AS present
  )
  SELECT CASE
    WHEN (SELECT present FROM has_today) THEN
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
        ((((SELECT d FROM current_day) + 1)::timestamp + interval '4 hours') AT TIME ZONE 'Europe/London') - now()
      )))::int)
    ELSE 0
  END;
$function$;
