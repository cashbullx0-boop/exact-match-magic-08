CREATE OR REPLACE FUNCTION public.referral_reward_cents(_ts timestamptz DEFAULT now())
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN (_ts AT TIME ZONE 'Asia/Karachi')::date
         BETWEEN DATE '2026-08-13' AND DATE '2026-08-21'
    THEN 700 ELSE 500 END;
$$;

REVOKE EXECUTE ON FUNCTION public.referral_reward_cents(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.referral_reward_cents(timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  is_first boolean;
  referrer uuid;
  ref_cents integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;

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
      WHERE user_id = referrer AND related_id = d.user_id
        AND description LIKE '🎁 Referral first-deposit reward%'
    ) THEN
      ref_cents := public.referral_reward_cents(now());

      UPDATE public.profiles
      SET balance_cents = balance_cents + ref_cents,
          total_earned_cents = total_earned_cents + ref_cents,
          updated_at = now()
      WHERE id = referrer;

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (referrer, 'bonus'::public.txn_type, ref_cents,
        CASE WHEN ref_cents = 700
          THEN '🎁 Referral first-deposit reward (🇵🇰 Independence Day $7)'
          ELSE '🎁 Referral first-deposit reward' END,
        d.user_id);
    END IF;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;