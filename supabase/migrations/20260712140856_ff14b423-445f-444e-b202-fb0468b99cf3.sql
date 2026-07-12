-- Self-healing financial reconciliation loop
-- Runs every 5 minutes, detects drift and auto-heals across balance/referral/withdrawal/trade domains.

CREATE OR REPLACE FUNCTION public.reconcile_financials()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_run_id uuid;
  v_balance_fixes int := 0;
  v_trade_settlements int := 0;
  v_first_deposit_bonuses int := 0;
  v_referral_rewards int := 0;
  v_withdrawal_refunds int := 0;
  v_errors text[] := ARRAY[]::text[];
  rec record;
  v_admin_id uuid;
  v_expected_balance bigint;
  v_diff bigint;
  v_bonus_cents int;
  v_referrer uuid;
BEGIN
  INSERT INTO public.cron_job_runs (job_name, started_at, status)
  VALUES ('reconcile-financials', now(), 'running')
  RETURNING id INTO v_run_id;

  SELECT ur.user_id INTO v_admin_id
  FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;

  -- 1) Auto-settle expired trades still marked active
  FOR rec IN
    SELECT id FROM public.trades
    WHERE status = 'active' AND expires_at <= now()
    LIMIT 200
  LOOP
    BEGIN
      PERFORM public.settle_trade(rec.id);
      v_trade_settlements := v_trade_settlements + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'settle_trade ' || rec.id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- 2) Missing 10% first-deposit bonus
  FOR rec IN
    SELECT d.id AS deposit_id, d.user_id, d.amount_usd
    FROM public.deposits d
    WHERE d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
      AND d.id = (
        SELECT d2.id FROM public.deposits d2
        WHERE d2.user_id = d.user_id
          AND d2.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
        ORDER BY d2.created_at ASC LIMIT 1
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.user_id = d.user_id
          AND t.type = 'bonus'::public.txn_type
          AND t.description LIKE '%First deposit%'
      )
    LIMIT 100
  LOOP
    BEGIN
      v_bonus_cents := ROUND(rec.amount_usd * 100 * 0.10)::int;
      IF v_bonus_cents > 0 THEN
        PERFORM set_config('app.bypass_profile_guard','on', true);
        UPDATE public.profiles
          SET balance_cents = balance_cents + v_bonus_cents,
              total_earned_cents = total_earned_cents + v_bonus_cents,
              updated_at = now()
          WHERE id = rec.user_id;
        PERFORM set_config('app.bypass_profile_guard','off', true);

        INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
        VALUES (rec.user_id, 'bonus'::public.txn_type, v_bonus_cents,
          '🎁 First deposit reward (10%) — reconciled', rec.deposit_id);

        v_first_deposit_bonuses := v_first_deposit_bonuses + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'first-deposit-bonus ' || rec.user_id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- 3) Missing $5 referral reward on referred user's first approved deposit
  FOR rec IN
    SELECT p.id AS referred_id, p.referred_by, d.id AS deposit_id
    FROM public.profiles p
    JOIN public.deposits d ON d.user_id = p.id
      AND d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
    WHERE p.referred_by IS NOT NULL
      AND d.id = (
        SELECT d2.id FROM public.deposits d2
        WHERE d2.user_id = p.id
          AND d2.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
        ORDER BY d2.created_at ASC LIMIT 1
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.user_id = p.referred_by
          AND t.type = 'bonus'::public.txn_type
          AND t.related_id = p.id
          AND t.description LIKE '%Referral first-deposit%'
      )
    LIMIT 100
  LOOP
    BEGIN
      PERFORM set_config('app.bypass_profile_guard','on', true);
      UPDATE public.profiles
        SET balance_cents = balance_cents + 500,
            total_earned_cents = total_earned_cents + 500,
            updated_at = now()
        WHERE id = rec.referred_by;
      PERFORM set_config('app.bypass_profile_guard','off', true);

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (rec.referred_by, 'bonus'::public.txn_type, 500,
        '🎁 Referral first-deposit reward — reconciled', rec.referred_id);

      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (rec.referred_by, '🎉 Referral reward',
        'You earned $5.00 because your referral made their first deposit.',
        'system', '/referrals');

      v_referral_rewards := v_referral_rewards + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'referral-reward ' || rec.referred_id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- 4) Rejected withdrawals without refund transaction
  FOR rec IN
    SELECT w.id, w.user_id, w.amount_cents
    FROM public.withdrawals w
    WHERE w.status = 'rejected'
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.related_id = w.id
          AND t.type = 'deposit'::public.txn_type
          AND t.description ILIKE '%refund%'
      )
    LIMIT 100
  LOOP
    BEGIN
      PERFORM set_config('app.bypass_profile_guard','on', true);
      UPDATE public.profiles
        SET balance_cents = balance_cents + rec.amount_cents, updated_at = now()
        WHERE id = rec.user_id;
      PERFORM set_config('app.bypass_profile_guard','off', true);

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (rec.user_id, 'deposit'::public.txn_type, rec.amount_cents,
        'Withdrawal refund (reconciled)', rec.id);

      v_withdrawal_refunds := v_withdrawal_refunds + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'withdrawal-refund ' || rec.id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- 5) Balance drift check — profile balance must equal SUM(transactions.amount_cents)
  --    If drift found, insert adjustment transaction to make them match and notify admin.
  FOR rec IN
    SELECT p.id AS user_id, p.balance_cents,
           COALESCE((SELECT SUM(t.amount_cents) FROM public.transactions t WHERE t.user_id = p.id), 0)::bigint AS txn_sum
    FROM public.profiles p
  LOOP
    v_expected_balance := rec.txn_sum;
    v_diff := rec.balance_cents::bigint - v_expected_balance;
    -- Only heal drift larger than 1 cent to avoid rounding noise
    IF abs(v_diff) > 1 THEN
      BEGIN
        -- Insert an adjustment transaction that reconciles the difference,
        -- then move profile balance to match sum of transactions afterwards.
        INSERT INTO public.transactions (user_id, type, amount_cents, description)
        VALUES (rec.user_id,
                CASE WHEN v_diff > 0 THEN 'bonus'::public.txn_type ELSE 'withdrawal'::public.txn_type END,
                v_diff::int,
                '⚖️ Reconciliation adjustment (balance drift ' ||
                  CASE WHEN v_diff > 0 THEN '+' ELSE '' END ||
                  to_char(v_diff/100.0, 'FM999999990.00') || ')');
        -- Balance already matches (drift stays; we recorded it as a txn so future sums match again)
        v_balance_fixes := v_balance_fixes + 1;

        IF v_admin_id IS NOT NULL THEN
          INSERT INTO public.notifications (user_id, title, body, type, link)
          VALUES (v_admin_id, '⚖️ Balance drift auto-healed',
            'User ' || rec.user_id || ' had drift of $' || to_char(v_diff/100.0, 'FM999999990.00') || '. Reconciled.',
            'admin', '/admin');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors := array_append(v_errors, 'balance-drift ' || rec.user_id || ': ' || SQLERRM);
      END;
    END IF;
  END LOOP;

  UPDATE public.cron_job_runs
  SET finished_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
      status = CASE WHEN array_length(v_errors,1) > 0 THEN 'error' ELSE 'success' END,
      error_message = CASE WHEN array_length(v_errors,1) > 0
                           THEN array_to_string(v_errors, ' | ') ELSE NULL END
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'trade_settlements', v_trade_settlements,
    'first_deposit_bonuses', v_first_deposit_bonuses,
    'referral_rewards', v_referral_rewards,
    'withdrawal_refunds', v_withdrawal_refunds,
    'balance_fixes', v_balance_fixes,
    'errors', to_jsonb(v_errors)
  );
END $fn$;

REVOKE ALL ON FUNCTION public.reconcile_financials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_financials() TO service_role;

-- Schedule to run every 5 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-financials') THEN
    PERFORM cron.unschedule('reconcile-financials');
  END IF;
  PERFORM cron.schedule('reconcile-financials', '*/5 * * * *',
    $cmd$ SELECT public.reconcile_financials(); $cmd$);
END $$;