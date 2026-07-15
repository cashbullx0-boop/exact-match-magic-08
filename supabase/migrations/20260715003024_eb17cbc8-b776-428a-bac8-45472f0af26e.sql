
-- Admin: adjust user balance by delta cents, positive or negative
CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  _user_id uuid,
  _delta_cents integer,
  _reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance integer;
  _txn_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _delta_cents = 0 OR _delta_cents IS NULL THEN
    RAISE EXCEPTION 'delta_cents must be non-zero';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
     SET balance_cents = GREATEST(0, balance_cents + _delta_cents),
         updated_at = now()
   WHERE id = _user_id
   RETURNING balance_cents INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount_cents, description)
  VALUES (
    _user_id,
    'adjustment'::public.txn_type,
    _delta_cents,
    '⚙️ Admin adjustment: ' || _reason
  )
  RETURNING id INTO _txn_id;

  RETURN jsonb_build_object(
    'ok', true,
    'new_balance_cents', _new_balance,
    'transaction_id', _txn_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_balance(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(uuid, integer, text) TO authenticated;

-- Downline trade commissions summary for current user, grouped by level 1..6
CREATE OR REPLACE FUNCTION public.get_downline_commission_summary()
RETURNS TABLE(level integer, count integer, total_cents bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lv AS (
    SELECT generate_series(1,6) AS level
  ),
  tx AS (
    SELECT
      NULLIF((regexp_match(description, '^⛓️ Level (\d+) '))[1], '')::int AS lvl,
      amount_cents
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND type = 'bonus'::public.txn_type
      AND description LIKE '⛓️ Level%'
  )
  SELECT
    lv.level,
    COALESCE(COUNT(tx.lvl), 0)::int AS count,
    COALESCE(SUM(tx.amount_cents), 0)::bigint AS total_cents
  FROM lv
  LEFT JOIN tx ON tx.lvl = lv.level
  GROUP BY lv.level
  ORDER BY lv.level;
$$;

REVOKE ALL ON FUNCTION public.get_downline_commission_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_downline_commission_summary() TO authenticated;
