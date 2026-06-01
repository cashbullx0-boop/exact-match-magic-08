WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY related_id ORDER BY created_at ASC) AS rn
  FROM public.transactions
  WHERE type = 'deposit'::public.txn_type AND related_id IS NOT NULL
)
DELETE FROM public.transactions t USING ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_unique_deposit_credit
  ON public.transactions (related_id)
  WHERE type = 'deposit'::public.txn_type;

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  d_user uuid;
  d_amount numeric;
  d_status public.deposit_status;
  cents integer;
  already_credited boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT user_id, amount_usd, status INTO d_user, d_amount, d_status
    FROM public.deposits
    WHERE id = _deposit_id
    FOR UPDATE;

  IF d_user IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE type = 'deposit'::public.txn_type AND related_id = _deposit_id
  ) INTO already_credited;

  IF already_credited OR d_status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN
    UPDATE public.deposits
    SET status = 'approved'::public.deposit_status,
        confirmed_at = COALESCE(confirmed_at, now()),
        updated_at = now()
    WHERE id = _deposit_id
      AND status NOT IN ('approved'::public.deposit_status, 'completed'::public.deposit_status);
    RETURN;
  END IF;

  cents := round(d_amount * 100);

  UPDATE public.deposits
  SET status = 'approved'::public.deposit_status,
      confirmed_at = now(),
      updated_at = now()
  WHERE id = _deposit_id;

  UPDATE public.profiles
  SET balance_cents = balance_cents + cents,
      total_earned_cents = total_earned_cents + cents,
      updated_at = now()
  WHERE id = d_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (d_user, 'deposit'::public.txn_type, cents, 'Deposit approved', _deposit_id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (d_user, 'Deposit approved', 'Your deposit of $' || d_amount || ' has been credited.', 'system', '/deposit');
END;
$function$;