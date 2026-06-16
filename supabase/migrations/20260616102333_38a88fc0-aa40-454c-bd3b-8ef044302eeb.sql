
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS missed_cycle_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.process_due_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  cycles_missed integer;
  credit_cents bigint;
  cycle_seconds integer;
  got_lock boolean;
  new_next timestamptz;
  rows_updated integer;
  extra_missed integer;
BEGIN
  SELECT pg_try_advisory_lock(hashtext('process_due_trades')) INTO got_lock;
  IF NOT got_lock THEN
    RETURN;
  END IF;

  BEGIN
    FOR t IN
      SELECT * FROM public.trades
      WHERE status = 'active'
        AND next_profit_at IS NOT NULL
        AND next_profit_at <= now()
      FOR UPDATE SKIP LOCKED
    LOOP
      cycle_seconds := GREATEST(t.duration_hours, 1) * 3600;
      cycles_missed := FLOOR(EXTRACT(EPOCH FROM (now() - t.next_profit_at)) / cycle_seconds)::int + 1;
      IF cycles_missed < 1 THEN
        CONTINUE;
      END IF;

      credit_cents := (t.profit_amount_cents::bigint) * cycles_missed;
      IF credit_cents > 2147483647 THEN credit_cents := 2147483647; END IF;
      IF credit_cents <= 0 THEN
        CONTINUE;
      END IF;

      new_next := t.next_profit_at + make_interval(secs => cycle_seconds * cycles_missed);
      extra_missed := GREATEST(cycles_missed - 1, 0);

      UPDATE public.trades
        SET next_profit_at = new_next,
            last_profit_at = now(),
            cycle_count = cycle_count + cycles_missed,
            missed_cycle_count = missed_cycle_count + extra_missed,
            total_profit_cents = total_profit_cents + credit_cents::int
        WHERE id = t.id
          AND next_profit_at = t.next_profit_at
          AND status = 'active';
      GET DIAGNOSTICS rows_updated = ROW_COUNT;
      IF rows_updated = 0 THEN
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.transactions
        WHERE related_id = t.id
          AND type = 'deposit'::public.txn_type
          AND description LIKE 'Auto trade profit%'
          AND created_at >= t.next_profit_at - interval '5 seconds'
      ) THEN
        CONTINUE;
      END IF;

      PERFORM set_config('app.bypass_profile_guard', 'on', true);
      UPDATE public.profiles
        SET balance_cents = balance_cents + credit_cents::int,
            total_earned_cents = total_earned_cents + credit_cents::int,
            updated_at = now()
        WHERE id = t.user_id;
      PERFORM set_config('app.bypass_profile_guard', 'off', true);

      INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (
        t.user_id,
        'deposit'::public.txn_type,
        credit_cents::int,
        'Auto trade profit (' || cycles_missed || ' cycle' ||
          CASE WHEN cycles_missed > 1 THEN 's' ELSE '' END ||
          ', +$' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') || ')',
        t.id
      );

      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        t.user_id,
        '✅ Trade profit added',
        '+$' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') ||
          ' added to your wallet from your active trade' ||
          CASE WHEN cycles_missed > 1
               THEN ' (' || cycles_missed || ' cycles caught up).'
               ELSE '.' END,
        'system',
        '/dashboard'
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
    RAISE;
  END;

  PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_trades() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_trades() TO service_role;
