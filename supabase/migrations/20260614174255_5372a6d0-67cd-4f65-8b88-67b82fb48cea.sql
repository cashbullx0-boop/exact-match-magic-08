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
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 100 OR _amount_cents > 10000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _direction NOT IN ('up','down') THEN RAISE EXCEPTION 'Invalid direction'; END IF;
  IF _duration_seconds NOT IN (60,300,900) THEN RAISE EXCEPTION 'Invalid duration'; END IF;

  SELECT COUNT(*) INTO active_count FROM public.trades
    WHERE user_id = uid AND status = 'active' AND expires_at > now();
  IF active_count > 0 THEN
    RAISE EXCEPTION 'You have an active trade. Please wait for it to complete';
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