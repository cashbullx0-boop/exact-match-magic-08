-- 1. Level thresholds: 50 / 100 / 200 / 400 / 800
UPDATE public.investment_levels SET min_deposit_cents = 5000,  daily_profit_cents = 100  WHERE level = 1;
UPDATE public.investment_levels SET min_deposit_cents = 10000, daily_profit_cents = 200  WHERE level = 2;
UPDATE public.investment_levels SET min_deposit_cents = 20000, daily_profit_cents = 400  WHERE level = 3;
UPDATE public.investment_levels SET min_deposit_cents = 40000, daily_profit_cents = 800  WHERE level = 4;
UPDATE public.investment_levels SET min_deposit_cents = 80000, daily_profit_cents = 1600 WHERE level = 5;

-- 2. Count direct referrals that have deposited
CREATE OR REPLACE FUNCTION public.depositing_direct_referrals(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::int
  FROM public.profiles c
  WHERE c.referred_by = _user_id
    AND EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.user_id = c.id
        AND d.status IN ('approved','completed')
    );
$$;

GRANT EXECUTE ON FUNCTION public.depositing_direct_referrals(uuid) TO authenticated, service_role;

-- 3. Status RPC for the UI
CREATE OR REPLACE FUNCTION public.get_balance_cap_status()
RETURNS TABLE(balance_cents integer, cap_cents integer, required_referrals integer, active_referrals integer, unlocked boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.balance_cents,
    15000::int AS cap_cents,
    10::int AS required_referrals,
    public.depositing_direct_referrals(p.id) AS active_referrals,
    public.depositing_direct_referrals(p.id) >= 10 AS unlocked
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_balance_cap_status() TO authenticated;

-- 4. Deposit cap enforcement
CREATE OR REPLACE FUNCTION public.deposits_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  canonical text;
  bal integer;
  refs integer;
BEGIN
  IF current_user = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id := auth.uid();

  SELECT value ->> NEW.network::text INTO canonical
  FROM public.app_settings WHERE key = 'deposit_address';
  IF canonical IS NULL THEN
    RAISE EXCEPTION 'Deposit address is not configured';
  END IF;
  NEW.wallet_address := canonical;

  IF NEW.amount_usd IS NULL OR NEW.amount_usd < 50 OR NEW.amount_usd > 100000
     OR (round(NEW.amount_usd * 100)::bigint % 1000) <> 0 THEN
    RAISE EXCEPTION 'Invalid deposit amount';
  END IF;

  -- $150 balance cap unless 10 depositing direct referrals
  SELECT balance_cents INTO bal FROM public.profiles WHERE id = NEW.user_id;
  refs := public.depositing_direct_referrals(NEW.user_id);
  IF refs < 10 AND (coalesce(bal,0) + round(NEW.amount_usd * 100)::int) > 15000 THEN
    RAISE EXCEPTION 'Your account is limited to a $150 balance. Bring 10 direct referrals who have deposited to unlock higher deposits. (You have % of 10)', refs;
  END IF;

  NEW.status := 'pending';
  NEW.provider := 'manual';
  NEW.provider_payment_id := NULL;
  NEW.confirmations := 0;
  NEW.confirmed_at := NULL;
  NEW.rejection_reason := NULL;
  NEW.notes := NULL;
  NEW.slip_path := NULL;
  NEW.slip_attempt := 0;
  NEW.tx_hash := NULL;
  NEW.sender_wallet_address := NULL;
  NEW.expires_at := now() + interval '30 minutes';
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 5. Withdrawal gate
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount_cents integer, _network text, _wallet_address text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  refs integer;
  addr text := btrim(coalesce(_wallet_address,''));
  net public.withdrawal_network;
  new_id uuid;
  otp_ok boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_maintenance_mode() AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'CashBullX is currently under maintenance. Please try again shortly.';
  END IF;
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

  refs := public.depositing_direct_referrals(uid);
  IF bal >= 15000 AND refs < 10 THEN
    RAISE EXCEPTION 'Withdrawals are locked above a $150 balance until you have 10 direct referrals who have deposited. (You have % of 10)', refs;
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

GRANT EXECUTE ON FUNCTION public.create_withdrawal(integer, text, text) TO authenticated;