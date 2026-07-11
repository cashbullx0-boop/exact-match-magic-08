-- Fix: create_withdrawal & create_investment were blocked by profiles_guard_update
-- because they didn't set app.bypass_profile_guard. Balance updates were silently
-- discarded for non-admin callers, leaving wallets out-of-sync with txn history.

CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount_cents integer, _network text, _wallet_address text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  addr text := btrim(coalesce(_wallet_address,''));
  net public.withdrawal_network;
  new_id uuid;
  otp_ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $10';
  END IF;
  IF _amount_cents > 1000000000 THEN
    RAISE EXCEPTION 'Amount too large';
  END IF;
  IF _network NOT IN ('TRC20','BEP20','ERC20') THEN
    RAISE EXCEPTION 'Invalid network';
  END IF;
  net := _network::public.withdrawal_network;
  IF length(addr) < 20 OR length(addr) > 128 THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  IF addr !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Wallet address contains invalid characters';
  END IF;

  SELECT public.check_withdrawal_otp_complete(uid) INTO otp_ok;
  IF NOT otp_ok THEN
    RAISE EXCEPTION 'Withdrawal OTP not verified';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  PERFORM set_config('app.bypass_profile_guard','on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard','off', true);

  INSERT INTO public.withdrawals (user_id, amount_cents, network, wallet_address)
    VALUES (uid, _amount_cents, net, addr)
    RETURNING id INTO new_id;

  DELETE FROM public.withdrawal_otps
    WHERE user_id = uid AND email_verified = true AND phone_verified = true;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Withdrawal request (' || _network || ')', new_id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (uid, 'Withdrawal requested',
      'Your withdrawal of $' || (_amount_cents/100.0)::text || ' is pending review.',
      'system', '/wallet');

  RETURN new_id;
END; $function$;

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

  PERFORM set_config('app.bypass_profile_guard','on', true);
  UPDATE public.profiles SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard','off', true);

  INSERT INTO public.investments (user_id, asset, asset_name, amount_cents, entry_price)
    VALUES (uid, _asset, _asset_name, _amount_cents, COALESCE(_entry_price, 0))
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Investment in ' || _asset_name, new_id);

  RETURN new_id;
END; $function$;