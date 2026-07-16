
-- 1) Reverse duplicate referral reward for Hamza (cdd3da1c...) — 500 cents.
DO $$
DECLARE
  hamza uuid := 'cdd3da1c-fc2e-4e7c-b70d-7b83d45d8c70';
  dup_txn uuid := '6d5cbbd2-1dbb-4c81-8e82-b4aad9123d2b';
BEGIN
  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = dup_txn) THEN
    PERFORM set_config('app.bypass_profile_guard','on', true);
    UPDATE public.profiles
      SET balance_cents = GREATEST(0, balance_cents - 500),
          total_earned_cents = GREATEST(0, total_earned_cents - 500),
          updated_at = now()
      WHERE id = hamza;
    PERFORM set_config('app.bypass_profile_guard','off', true);

    INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (hamza, 'adjustment'::public.txn_type, -500,
      '⚙️ Reversal: duplicate referral first-deposit reward',
      dup_txn);
  END IF;
END $$;

-- 2) Fix reconcile_financials so it doesn't duplicate future rewards.
--    Match the original payout regardless of whether related_id stored the deposit or the referred user id.
CREATE OR REPLACE FUNCTION public.reconcile_financials()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  INSERT INTO public.cron_job_runs (job_name, started_at, status)
  VALUES ('reconcile-financials', now(), 'running')
  RETURNING id INTO v_run_id;

  SELECT ur.user_id INTO v_admin_id
  FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;

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

  -- FIXED: check for existing referral reward by referred user OR by their first deposit id
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
          AND t.description ILIKE '%Referral first-deposit%'
          AND (t.related_id = p.id OR t.related_id = d.id)
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

  FOR rec IN
    SELECT p.id AS user_id, p.balance_cents,
           COALESCE((SELECT SUM(t.amount_cents) FROM public.transactions t WHERE t.user_id = p.id), 0)::bigint AS txn_sum
    FROM public.profiles p
  LOOP
    v_expected_balance := rec.txn_sum;
    v_diff := rec.balance_cents::bigint - v_expected_balance;
    IF abs(v_diff) > 1 THEN
      BEGIN
        INSERT INTO public.transactions (user_id, type, amount_cents, description)
        VALUES (rec.user_id,
                CASE WHEN v_diff > 0 THEN 'bonus'::public.txn_type ELSE 'withdrawal'::public.txn_type END,
                v_diff::int,
                '⚖️ Reconciliation adjustment (balance drift ' ||
                  CASE WHEN v_diff > 0 THEN '+' ELSE '' END ||
                  to_char(v_diff/100.0, 'FM999999990.00') || ')');
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
END $function$;

-- 3) Backfill missing 6-level downline trade commissions for already-closed trades.
--    Skips any (trade, ancestor, level) triple that already has a commission row.
DO $$
DECLARE
  tr record;
  anc record;
  commission_rate numeric;
  commission_cents integer;
BEGIN
  FOR tr IN
    SELECT t.id, t.user_id, t.amount_cents
    FROM public.trades t
    WHERE t.status = 'closed'
  LOOP
    FOR anc IN
      WITH RECURSIVE chain AS (
        SELECT p.referred_by AS ancestor_id, 1 AS lvl
        FROM public.profiles p WHERE p.id = tr.user_id
        UNION ALL
        SELECT p.referred_by, c.lvl + 1
        FROM chain c JOIN public.profiles p ON p.id = c.ancestor_id
        WHERE c.lvl < 6 AND c.ancestor_id IS NOT NULL
      )
      SELECT ancestor_id, lvl FROM chain WHERE ancestor_id IS NOT NULL
    LOOP
      commission_rate := CASE anc.lvl
        WHEN 1 THEN 0.0010 WHEN 2 THEN 0.0008 WHEN 3 THEN 0.0006
        WHEN 4 THEN 0.0004 WHEN 5 THEN 0.0002 WHEN 6 THEN 0.0001
        ELSE 0 END;
      commission_cents := ROUND(tr.amount_cents * commission_rate)::integer;

      IF commission_cents > 0
         AND NOT EXISTS (
           SELECT 1 FROM public.transactions tx
           WHERE tx.related_id = tr.id
             AND tx.user_id = anc.ancestor_id
             AND tx.description = '⛓️ Level ' || anc.lvl || ' downline trade commission'
         ) THEN
        PERFORM set_config('app.bypass_profile_guard','on', true);
        UPDATE public.profiles
          SET balance_cents = balance_cents + commission_cents,
              total_earned_cents = total_earned_cents + commission_cents,
              updated_at = now()
          WHERE id = anc.ancestor_id;
        PERFORM set_config('app.bypass_profile_guard','off', true);

        INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
        VALUES (anc.ancestor_id, 'bonus'::public.txn_type, commission_cents,
          '⛓️ Level ' || anc.lvl || ' downline trade commission (backfilled)', tr.id);
      END IF;
    END LOOP;
  END LOOP;
END $$;
