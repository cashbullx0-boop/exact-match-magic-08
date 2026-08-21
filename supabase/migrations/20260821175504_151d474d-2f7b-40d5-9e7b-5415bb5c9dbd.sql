DROP POLICY IF EXISTS "app_settings public read allowlist" ON public.app_settings;
CREATE POLICY "app_settings public read allowlist" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['ios_pwa_prompt'::text, 'spinner_config'::text]));

INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'spinner_config',
  jsonb_build_object(
    'enabled', true,
    'cost_cents', 100,
    'daily_limit', 5,
    'pool_guard', false,
    'prizes', jsonb_build_array(
      jsonb_build_object('cents', 0,    'weight', 20),
      jsonb_build_object('cents', 50,   'weight', 25),
      jsonb_build_object('cents', 100,  'weight', 25),
      jsonb_build_object('cents', 200,  'weight', 15),
      jsonb_build_object('cents', 300,  'weight', 8),
      jsonb_build_object('cents', 500,  'weight', 6),
      jsonb_build_object('cents', 1000, 'weight', 1)
    )
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.perform_spin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'Europe/London')::date;
  cfg jsonb;
  v_cost_cents integer;
  daily_limit integer;
  pool_guard boolean;
  spins_today integer;
  user_balance integer;
  total_pool_cents integer;
  max_prize_pool_cents integer;
  prizes_given_today_cents integer;
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
  pool_guard   := COALESCE((cfg->>'pool_guard')::boolean, false);

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

  IF pool_guard THEN
    SELECT COALESCE(SUM(s.cost_cents), 0) + v_cost_cents INTO total_pool_cents
    FROM public.spins s WHERE s.spin_date = today;
    max_prize_pool_cents := total_pool_cents / 2;

    SELECT COALESCE(SUM(s.reward_cents), 0) INTO prizes_given_today_cents
    FROM public.spins s WHERE s.spin_date = today;

    v_reward_cents := GREATEST(
      LEAST(v_reward_cents, max_prize_pool_cents - prizes_given_today_cents), 0);
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
END $function$;

GRANT EXECUTE ON FUNCTION public.perform_spin() TO authenticated;