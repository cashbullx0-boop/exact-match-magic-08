
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
  last_trade_at timestamptz;
  next_allowed timestamptz;
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

  -- Strict 24-hour rolling cooldown from the user's most recent trade.
  SELECT MAX(created_at) INTO last_trade_at
  FROM public.trades
  WHERE user_id = uid;

  IF last_trade_at IS NOT NULL AND last_trade_at > now() - interval '24 hours' THEN
    next_allowed := last_trade_at + interval '24 hours';
    remaining := next_allowed - now();
    RAISE EXCEPTION 'You can place your next trade in % hours % minutes (one trade per 24 hours, UK time).',
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
  SELECT COALESCE(
    GREATEST(
      0,
      CEIL(EXTRACT(EPOCH FROM (
        (SELECT MAX(created_at) FROM public.trades WHERE user_id = auth.uid())
        + interval '24 hours' - now()
      )))::int
    ),
    0
  );
$function$;
