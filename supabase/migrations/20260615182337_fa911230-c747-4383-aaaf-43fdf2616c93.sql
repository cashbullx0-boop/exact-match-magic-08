
CREATE OR REPLACE FUNCTION public.create_investment(_asset text, _asset_name text, _amount_cents integer, _entry_price numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  has_deposit boolean;
  bal integer;
  new_id uuid;
  dup_count integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 5000 THEN RAISE EXCEPTION 'Minimum investment is $50'; END IF;
  IF _asset NOT IN ('XAU','BTC','ETH','WTI') THEN RAISE EXCEPTION 'Invalid asset'; END IF;

  SELECT COUNT(*) INTO dup_count FROM public.investments
    WHERE user_id = uid AND asset = _asset AND status = 'active';
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'You already have an active investment at this level';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.deposits
    WHERE user_id = uid AND status IN ('approved'::public.deposit_status,'completed'::public.deposit_status))
    INTO has_deposit;
  IF NOT has_deposit THEN RAISE EXCEPTION 'Approved deposit required'; END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;

  INSERT INTO public.investments (user_id, asset, asset_name, amount_cents, entry_price)
    VALUES (uid, _asset, _asset_name, _amount_cents, COALESCE(_entry_price, 0))
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Investment in ' || _asset_name, new_id);

  RETURN new_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_complete_investment(_id uuid, _return_percent numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_amount integer;
  v_status public.investment_status;
  v_pct numeric;
  v_payout bigint;
  v_payout_int integer;
  v_profit_int integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  v_pct := round(LEAST(GREATEST(COALESCE(_return_percent, 0), -100), 1000)::numeric, 2);

  SELECT user_id, amount_cents, status INTO v_user, v_amount, v_status
    FROM public.investments WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'Investment already finalized'; END IF;

  v_payout := v_amount::bigint + round(v_amount::bigint * v_pct / 100.0)::bigint;
  IF v_payout < 0 THEN v_payout := 0; END IF;
  IF v_payout > 2147483647 THEN
    RAISE EXCEPTION 'Payout exceeds maximum supported amount';
  END IF;
  v_payout_int := v_payout::integer;
  v_profit_int := GREATEST(v_payout_int - v_amount, 0);

  UPDATE public.investments
    SET status = 'completed', return_percent = v_pct,
        completed_at = now(), updated_at = now()
    WHERE id = _id;

  UPDATE public.profiles
    SET balance_cents = balance_cents + v_payout_int,
        total_earned_cents = total_earned_cents + v_profit_int,
        updated_at = now()
    WHERE id = v_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (v_user, 'deposit'::public.txn_type, v_payout_int,
      'Investment return (+$' || to_char(v_profit_int/100.0, 'FM999999990.00') ||
      ', ' || to_char(v_pct, 'FM999990.00') || '%)', _id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Investment completed',
      'Your investment was completed with ' || to_char(v_pct, 'FM999990.00') || '% return.',
      'system', '/invest');
END; $function$;

DROP FUNCTION IF EXISTS public.process_daily_profits();
