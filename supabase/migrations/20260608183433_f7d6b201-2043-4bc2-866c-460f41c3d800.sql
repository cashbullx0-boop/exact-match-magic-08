
CREATE OR REPLACE FUNCTION public.place_trade(_amount_cents integer, _direction text, _duration_seconds integer)
RETURNS public.trades
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 100 OR _amount_cents > 10000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _direction NOT IN ('up','down') THEN RAISE EXCEPTION 'Invalid direction'; END IF;
  IF _duration_seconds NOT IN (60,300,900) THEN RAISE EXCEPTION 'Invalid duration'; END IF;

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
END $$;

CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  t public.trades;
  won boolean;
  profit integer;
  credit integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO t FROM public.trades WHERE id = _trade_id AND user_id = uid FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RETURN t; END IF;
  IF t.expires_at > now() THEN RAISE EXCEPTION 'Trade not yet expired'; END IF;

  won := random() < 0.5;
  profit := CASE WHEN won THEN (t.amount_cents * 85 / 100) ELSE 0 END;
  credit := CASE WHEN won THEN t.amount_cents + profit ELSE 0 END;

  IF credit > 0 THEN
    UPDATE public.profiles
      SET balance_cents = balance_cents + credit,
          total_earned_cents = total_earned_cents + profit,
          updated_at = now()
      WHERE id = uid;
    INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'deposit'::public.txn_type, credit,
            'Trade win payout (+$' || (profit/100.0)::text || ' profit)', t.id);
  END IF;

  UPDATE public.trades
    SET status = 'settled',
        result = CASE WHEN won THEN 'win' ELSE 'loss' END,
        profit_cents = CASE WHEN won THEN profit ELSE -t.amount_cents END
    WHERE id = t.id
    RETURNING * INTO t;

  RETURN t;
END $$;

GRANT EXECUTE ON FUNCTION public.place_trade(integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_trade(uuid) TO authenticated;
