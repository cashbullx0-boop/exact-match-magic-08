CREATE OR REPLACE FUNCTION public.perform_spin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $fn$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Europe/London')::date;
  cfg jsonb;
  v_cost_cents integer;
  daily_limit integer;
  auto_guard boolean;
  payout_pct numeric;
  spins_today integer;
  user_balance integer;
  day_pool_cents bigint;
  day_paid_cents bigint;
  all_pool_cents bigint;
  all_paid_cents bigint;
  allowed_day bigint;
  allowed_all bigint;
  cap_cents bigint;
  total_weight numeric;
  pick numeric;
  acc numeric := 0;
  prize jsonb;
  v_reward_cents integer := 0;
  admin_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF public.is_maintenance_mode() AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'CashBullX is currently under maintenance. Please try again shortly.';
  END IF;

  SELECT value INTO cfg FROM public.app_settings WHERE key = 'spinner_config';
  cfg := COALESCE(cfg, '{}'::jsonb);

  IF COALESCE((cfg->>'enabled')::boolean, true) = false THEN
    RAISE EXCEPTION 'Lucky Spinner is currently disabled';
  END IF;

  v_cost_cents := COALESCE((cfg->>'cost_cents')::integer, 100);
  daily_limit  := COALESCE((cfg->>'daily_limit')::integer, 5);
  auto_guard   := COALESCE((cfg->>'auto_guard')::boolean, true);
  payout_pct   := LEAST(GREATEST(COALESCE((cfg->>'max_payout_percent')::numeric, 60), 0), 95);

  SELECT COUNT(*) INTO spins_today
  FROM public.spins WHERE user_id = uid AND spin_date = today;

  IF spins_today >= daily_limit THEN
    RAISE EXCEPTION 'Daily spin limit reached (% spins per day)', daily_limit;
  END IF;

  SELECT balance_cents INTO user_balance
  FROM public.profiles WHERE id = uid FOR UPDATE;

  IF user_balance < v_cost_cents THEN
    RAISE EXCEPTION 'Insufficient balance. Need $% to spin', to_char(v_cost_cents/100.0, 'FM990.00');
  END IF;

  SELECT COALESCE(SUM(GREATEST((p->>'weight')::numeric, 0)), 0)
    INTO total_weight
  FROM jsonb_array_elements(COALESCE(cfg->'prizes', '[]'::jsonb)) p;

  IF total_weight > 0 THEN
    pick := random() * total_weight;
    FOR prize IN SELECT * FROM jsonb_array_elements(cfg->'prizes') LOOP
      acc := acc + GREATEST((prize->>'weight')::numeric, 0);
      IF pick < acc THEN
        v_reward_cents := GREATEST(COALESCE((prize->>'cents')::integer, 0), 0);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Automatic house-profit guard: prizes can never exceed payout_pct of collected fees,
  -- enforced both for the current trading day and lifetime.
  IF auto_guard THEN
    SELECT COALESCE(SUM(s.cost_cents), 0), COALESCE(SUM(s.reward_cents), 0)
      INTO day_pool_cents, day_paid_cents
    FROM public.spins s WHERE s.spin_date = today;

    SELECT COALESCE(SUM(s.cost_cents), 0), COALESCE(SUM(s.reward_cents), 0)
      INTO all_pool_cents, all_paid_cents
    FROM public.spins s;

    day_pool_cents := day_pool_cents + v_cost_cents;
    all_pool_cents := all_pool_cents + v_cost_cents;

    allowed_day := floor(day_pool_cents * payout_pct / 100.0)::bigint - day_paid_cents;
    allowed_all := floor(all_pool_cents * payout_pct / 100.0)::bigint - all_paid_cents;
    cap_cents := GREATEST(LEAST(allowed_day, allowed_all), 0);

    -- Snap DOWN to a real prize value on the wheel so the credited amount always
    -- matches the segment the wheel lands on (never an arbitrary partial amount).
    IF v_reward_cents > cap_cents THEN
      SELECT COALESCE(MAX(GREATEST(COALESCE((p->>'cents')::integer, 0), 0)), 0)
        INTO v_reward_cents
      FROM jsonb_array_elements(COALESCE(cfg->'prizes', '[]'::jsonb)) p
      WHERE GREATEST(COALESCE((p->>'cents')::integer, 0), 0) <= cap_cents;
      v_reward_cents := COALESCE(v_reward_cents, 0);
    END IF;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents - v_cost_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  IF v_reward_cents > 0 THEN
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
      SET balance_cents = balance_cents + v_reward_cents,
          total_earned_cents = total_earned_cents + v_reward_cents,
          updated_at = now()
      WHERE id = uid;
    PERFORM set_config('app.bypass_profile_guard', 'off', true);
  END IF;

  SELECT ur.user_id INTO admin_id FROM public.user_roles ur
    WHERE ur.role = 'admin' LIMIT 1;

  IF admin_id IS NOT NULL AND (v_cost_cents - v_reward_cents) > 0 THEN
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
      SET balance_cents = balance_cents + (v_cost_cents - v_reward_cents),
          updated_at = now()
      WHERE id = admin_id;
    PERFORM set_config('app.bypass_profile_guard', 'off', true);

    INSERT INTO public.transactions (user_id, type, amount_cents, description)
    VALUES (admin_id, 'bonus'::public.txn_type, (v_cost_cents - v_reward_cents), '🎰 Spinner revenue');
  END IF;

  INSERT INTO public.spins (user_id, spin_date, cost_cents, reward_cents)
  VALUES (uid, today, v_cost_cents, v_reward_cents);

  INSERT INTO public.transactions (user_id, type, amount_cents, description)
  VALUES (uid, 'withdrawal'::public.txn_type, -v_cost_cents,
    '🎰 Spinner entry $' || to_char(v_cost_cents/100.0, 'FM990.00'));

  IF v_reward_cents > 0 THEN
    INSERT INTO public.transactions (user_id, type, amount_cents, description)
    VALUES (uid, 'bonus'::public.txn_type, v_reward_cents,
      '🎰 Spinner reward $' || to_char(v_reward_cents/100.0, 'FM990.00'));
  END IF;

  RETURN jsonb_build_object(
    'reward_cents', v_reward_cents,
    'spins_remaining', daily_limit - spins_today - 1,
    'won', v_reward_cents > 0
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.perform_spin() TO authenticated;