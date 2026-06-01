
CREATE OR REPLACE FUNCTION public.admin_complete_investment(_id uuid, _return_percent numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_amount integer;
  v_status public.investment_status;
  v_pct numeric;
  v_payout bigint;
  v_payout_int integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  v_pct := LEAST(GREATEST(COALESCE(_return_percent, 0), -100), 1000);

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

  UPDATE public.investments
    SET status = 'completed', return_percent = v_pct,
        completed_at = now(), updated_at = now()
    WHERE id = _id;

  UPDATE public.profiles
    SET balance_cents = balance_cents + v_payout_int,
        total_earned_cents = total_earned_cents + GREATEST(v_payout_int - v_amount, 0),
        updated_at = now()
    WHERE id = v_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (v_user, 'deposit'::public.txn_type, v_payout_int,
      'Investment return (' || v_pct::text || '%)', _id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Investment completed',
      'Your investment was completed with ' || v_pct::text || '% return.',
      'system', '/invest');
END; $$;
