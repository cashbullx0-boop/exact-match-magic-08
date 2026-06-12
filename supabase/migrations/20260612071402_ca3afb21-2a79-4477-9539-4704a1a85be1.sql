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

  -- Always WIN: 85% profit return
  profit := (t.amount_cents * 85 / 100);
  credit := t.amount_cents + profit;

  UPDATE public.profiles
    SET balance_cents = balance_cents + credit,
        total_earned_cents = total_earned_cents + profit,
        updated_at = now()
    WHERE id = uid;
  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'deposit'::public.txn_type, credit,
          'Trade win payout (+$' || (profit/100.0)::text || ' profit)', t.id);

  UPDATE public.trades
    SET status = 'settled',
        result = 'win',
        profit_cents = profit
    WHERE id = t.id
    RETURNING * INTO t;

  RETURN t;
END $function$;