CREATE OR REPLACE FUNCTION public.submit_deposit_sender_address(_deposit_id uuid, _sender_address text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  d_user uuid;
  d_status public.deposit_status;
  a text := btrim(coalesce(_sender_address, ''));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF length(a) < 26 OR length(a) > 128 OR a !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Invalid sender wallet address';
  END IF;

  SELECT user_id, status
    INTO d_user, d_status
  FROM public.deposits
  WHERE id = _deposit_id
  FOR UPDATE;

  IF d_user IS NULL OR d_user <> uid THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  IF d_status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN
    RAISE EXCEPTION 'Deposit cannot be modified';
  END IF;

  PERFORM set_config('app.bypass_deposit_guard', 'on', true);
  UPDATE public.deposits
  SET sender_wallet_address = a, updated_at = now()
  WHERE id = _deposit_id;
  PERFORM set_config('app.bypass_deposit_guard', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_deposit_sender_address(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_deposit_sender_address(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit_sender_address(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deposits%ROWTYPE;
  is_first boolean;
  referrer uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO d
  FROM public.deposits
  WHERE id = _deposit_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  IF d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN
    RETURN;
  END IF;
  IF d.status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN
    RAISE EXCEPTION 'Deposit cannot be approved in its current state';
  END IF;
  IF nullif(btrim(d.slip_path), '') IS NULL THEN
    RAISE EXCEPTION 'Payment slip is required before approval';
  END IF;
  IF nullif(btrim(d.tx_hash), '') IS NULL THEN
    RAISE EXCEPTION 'Transaction hash is required before approval';
  END IF;
  IF nullif(btrim(d.sender_wallet_address), '') IS NULL THEN
    RAISE EXCEPTION 'Sender wallet address is required before approval';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.deposits
    WHERE user_id = d.user_id
      AND status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
      AND id <> d.id
  ) INTO is_first;

  UPDATE public.deposits
  SET status = 'completed'::public.deposit_status,
      confirmed_at = coalesce(confirmed_at, now()),
      updated_at = now()
  WHERE id = d.id;

  UPDATE public.profiles
  SET balance_cents = balance_cents + round(d.amount_usd * 100)::integer,
      updated_at = now()
  WHERE id = d.user_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  SELECT d.user_id, 'deposit'::public.txn_type, round(d.amount_usd * 100)::integer,
         'USDT deposit approved', d.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE related_id = d.id AND type = 'deposit'::public.txn_type
  );

  IF is_first THEN
    UPDATE public.profiles
    SET balance_cents = balance_cents + round(d.amount_usd * 10)::integer,
        total_earned_cents = total_earned_cents + round(d.amount_usd * 10)::integer,
        updated_at = now()
    WHERE id = d.user_id;

    INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    SELECT d.user_id, 'bonus'::public.txn_type, round(d.amount_usd * 10)::integer,
           '🎁 First deposit reward', d.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = d.user_id AND description = '🎁 First deposit reward'
    );

    SELECT referred_by INTO referrer FROM public.profiles WHERE id = d.user_id;
    IF referrer IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE user_id = referrer
        AND related_id = d.user_id
        AND description = '🎁 Referral first-deposit reward'
    ) THEN
      UPDATE public.profiles
      SET balance_cents = balance_cents + 500,
          total_earned_cents = total_earned_cents + 500,
          updated_at = now()
      WHERE id = referrer;

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (referrer, 'bonus'::public.txn_type, 500, '🎁 Referral first-deposit reward', d.user_id);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_deposit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO service_role;