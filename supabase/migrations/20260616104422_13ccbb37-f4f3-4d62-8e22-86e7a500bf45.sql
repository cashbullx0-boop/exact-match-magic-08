
-- Rewrite process_due_trades: credit profit ONCE then close the trade.
CREATE OR REPLACE FUNCTION public.process_due_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t RECORD;
  credit_cents bigint;
  got_lock boolean;
  rows_updated integer;
  run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_trades integer := 0;
  v_total_credited bigint := 0;
BEGIN
  SELECT pg_try_advisory_lock(hashtext('process_due_trades')) INTO got_lock;
  IF NOT got_lock THEN
    INSERT INTO public.cron_job_runs (
      job_name, started_at, finished_at, duration_ms, status, skipped
    ) VALUES (
      'process_due_trades', v_started, clock_timestamp(),
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int,
      'skipped', true
    );
    RETURN;
  END IF;

  INSERT INTO public.cron_job_runs (job_name, started_at, status)
  VALUES ('process_due_trades', v_started, 'running')
  RETURNING id INTO run_id;

  BEGIN
    FOR t IN
      SELECT * FROM public.trades
      WHERE status = 'active'
        AND next_profit_at IS NOT NULL
        AND next_profit_at <= now()
      FOR UPDATE SKIP LOCKED
    LOOP
      credit_cents := t.profit_amount_cents::bigint;
      IF credit_cents <= 0 THEN
        CONTINUE;
      END IF;

      -- Atomically close the trade so concurrent runs cannot double-credit.
      UPDATE public.trades
        SET status = 'closed',
            result = 'won',
            last_profit_at = now(),
            next_profit_at = NULL,
            cycle_count = 1,
            total_profit_cents = total_profit_cents + credit_cents::int
        WHERE id = t.id
          AND status = 'active'
          AND next_profit_at = t.next_profit_at;
      GET DIAGNOSTICS rows_updated = ROW_COUNT;
      IF rows_updated = 0 THEN
        CONTINUE;
      END IF;

      -- Return principal + profit to wallet
      PERFORM set_config('app.bypass_profile_guard', 'on', true);
      UPDATE public.profiles
        SET balance_cents = balance_cents + t.amount_cents + credit_cents::int,
            total_earned_cents = total_earned_cents + credit_cents::int,
            updated_at = now()
        WHERE id = t.user_id;
      PERFORM set_config('app.bypass_profile_guard', 'off', true);

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (
        t.user_id,
        'deposit'::public.txn_type,
        (t.amount_cents + credit_cents)::int,
        'Trade completed: principal + $' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') || ' profit',
        t.id
      );

      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        t.user_id,
        '✅ Trade completed',
        'Your trade has finished. +$' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') ||
          ' profit and $' || to_char(t.amount_cents::numeric / 100.0, 'FM999999990.00') ||
          ' principal returned to your wallet.',
        'system',
        '/dashboard'
      );

      v_trades := v_trades + 1;
      v_total_credited := v_total_credited + credit_cents;
    END LOOP;

    UPDATE public.cron_job_runs
      SET finished_at = clock_timestamp(),
          duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int,
          status = 'success',
          trades_processed = v_trades,
          cycles_credited = v_trades,
          missed_cycles = 0,
          total_credited_cents = v_total_credited
      WHERE id = run_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.cron_job_runs
      SET finished_at = clock_timestamp(),
          duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int,
          status = 'error',
          trades_processed = v_trades,
          cycles_credited = v_trades,
          missed_cycles = 0,
          total_credited_cents = v_total_credited,
          error_message = SQLERRM
      WHERE id = run_id;
    PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
    RAISE;
  END;

  PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
END;
$function$;

-- Rewrite add_trade_profit (called by the client when timer hits 0) to
-- credit ONCE and close the trade.
CREATE OR REPLACE FUNCTION public.add_trade_profit(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  t public.trades;
  credit_cents integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO t FROM public.trades
    WHERE id = _trade_id AND user_id = uid
    FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RAISE EXCEPTION 'Trade is not active'; END IF;
  IF t.next_profit_at IS NULL OR t.next_profit_at > now() THEN
    RAISE EXCEPTION 'Trade is not due yet';
  END IF;

  credit_cents := t.profit_amount_cents;

  UPDATE public.trades
    SET status = 'closed',
        result = 'won',
        last_profit_at = now(),
        next_profit_at = NULL,
        cycle_count = 1,
        total_profit_cents = total_profit_cents + credit_cents
    WHERE id = _trade_id
      AND status = 'active'
    RETURNING * INTO t;

  IF t IS NULL THEN
    -- another worker already closed it
    SELECT * INTO t FROM public.trades WHERE id = _trade_id;
    RETURN t;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + t.amount_cents + credit_cents,
        total_earned_cents = total_earned_cents + credit_cents,
        updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'deposit'::public.txn_type, t.amount_cents + credit_cents,
    'Trade completed: principal + $' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') || ' profit',
    t.id);

  RETURN t;
END;
$function$;
