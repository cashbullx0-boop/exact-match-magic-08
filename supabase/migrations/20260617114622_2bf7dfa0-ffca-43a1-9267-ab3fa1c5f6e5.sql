
-- Replace open_roi_trade: flat 2% profit, 24h cooldown in Europe/London
CREATE OR REPLACE FUNCTION public.open_roi_trade(_amount_cents integer, _duration_hours integer)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  profit_cents integer;
  last_at timestamptz;
  next_at timestamptz;
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

  -- 24h cooldown based on UK time (DST-safe via timestamptz arithmetic)
  SELECT MAX(created_at) INTO last_at FROM public.trades WHERE user_id = uid;
  IF last_at IS NOT NULL THEN
    next_at := last_at + interval '24 hours';
    IF (now() AT TIME ZONE 'Europe/London') < (next_at AT TIME ZONE 'Europe/London') THEN
      remaining := next_at - now();
      RAISE EXCEPTION 'You can place your next trade in % hours % minutes.',
        EXTRACT(HOUR FROM remaining)::int,
        EXTRACT(MINUTE FROM remaining)::int;
    END IF;
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Flat 2% profit for all durations
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
    'Trade opened (' || _duration_hours || 'h, 2% ROI)',
    new_trade.id);

  RETURN new_trade;
END $function$;

-- Helper: returns seconds remaining in cooldown (0 if ready)
CREATE OR REPLACE FUNCTION public.trade_cooldown_seconds()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    0,
    CEIL(EXTRACT(EPOCH FROM (COALESCE(MAX(created_at), now() - interval '25 hours') + interval '24 hours' - now())))::int
  )
  FROM public.trades WHERE user_id = auth.uid();
$function$;

GRANT EXECUTE ON FUNCTION public.trade_cooldown_seconds() TO authenticated;
