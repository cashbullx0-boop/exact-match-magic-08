
-- Update settle_trade to use new profit formula: amount_cents / 50
CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
 RETURNS trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  t public.trades;
  profit integer;
  credit integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO t FROM public.trades WHERE id = _trade_id AND user_id = uid FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RETURN t; END IF;
  IF t.expires_at > now() THEN RAISE EXCEPTION 'Trade not yet expired'; END IF;

  -- Profit: $1 per $50 traded (amount_cents / 50)
  profit := t.amount_cents / 50;
  credit := t.amount_cents + profit;

  UPDATE public.profiles
    SET balance_cents = balance_cents + credit,
        total_earned_cents = total_earned_cents + profit,
        updated_at = now()
    WHERE id = uid;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'deposit'::public.txn_type, credit,
          'Trade profit: +$' || (profit/100.0)::text, t.id);

  UPDATE public.trades
    SET status = 'settled', result = 'win', profit_cents = profit
    WHERE id = t.id
    RETURNING * INTO t;

  RETURN t;
END $function$;

-- Update place_trade minimum to $50 (5000 cents)
CREATE OR REPLACE FUNCTION public.place_trade(_amount_cents integer, _direction text, _duration_seconds integer)
 RETURNS trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  active_count integer;
  recent_count integer;
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 5000 THEN RAISE EXCEPTION 'Minimum trade amount is $50'; END IF;
  IF _amount_cents > 10000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _direction NOT IN ('up','down') THEN RAISE EXCEPTION 'Invalid direction'; END IF;
  IF _duration_seconds NOT IN (60,300,900) THEN RAISE EXCEPTION 'Invalid duration'; END IF;

  SELECT COUNT(*) INTO active_count FROM public.trades
    WHERE user_id = uid AND status = 'active' AND expires_at > now();
  IF active_count > 0 THEN
    RAISE EXCEPTION 'You have an active trade. Please wait for it to complete';
  END IF;

  SELECT COUNT(*) INTO recent_count FROM public.trades
    WHERE user_id = uid AND created_at > now() - interval '24 hours';
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'You have already placed your trade today. Come back tomorrow!';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance_cents = balance_cents - _amount_cents, updated_at = now() WHERE id = uid;

  INSERT INTO public.trades (user_id, amount_cents, direction, duration_seconds, status, expires_at)
  VALUES (uid, _amount_cents, _direction, _duration_seconds, 'active', now() + make_interval(secs => _duration_seconds))
  RETURNING * INTO new_trade;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
          'Trade opened (' || upper(_direction) || ' ' || _duration_seconds || 's)', new_trade.id);

  RETURN new_trade;
END $function$;

-- Disable the daily profit RPC (kept as no-op so callers don't break)
CREATE OR REPLACE FUNCTION public.process_daily_profits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Daily automatic profits have been disabled. Profit is now only credited from winning trades.';
END;
$function$;
