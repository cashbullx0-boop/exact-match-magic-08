
CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running',
  trades_processed integer NOT NULL DEFAULT 0,
  cycles_credited integer NOT NULL DEFAULT 0,
  missed_cycles integer NOT NULL DEFAULT 0,
  total_credited_cents bigint NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_job_runs_started_at_idx
  ON public.cron_job_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS cron_job_runs_job_name_idx
  ON public.cron_job_runs (job_name, started_at DESC);

GRANT SELECT ON public.cron_job_runs TO authenticated;
GRANT ALL ON public.cron_job_runs TO service_role;

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view cron runs" ON public.cron_job_runs;
CREATE POLICY "Admins can view cron runs"
  ON public.cron_job_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

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
  run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_trades integer := 0;
  v_cycles integer := 0;
  v_missed integer := 0;
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

      v_trades := v_trades + 1;
      v_cycles := v_cycles + cycles_missed;
      v_missed := v_missed + extra_missed;
      v_total_credited := v_total_credited + credit_cents;
    END LOOP;

    UPDATE public.cron_job_runs
      SET finished_at = clock_timestamp(),
          duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int,
          status = 'success',
          trades_processed = v_trades,
          cycles_credited = v_cycles,
          missed_cycles = v_missed,
          total_credited_cents = v_total_credited
      WHERE id = run_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.cron_job_runs
      SET finished_at = clock_timestamp(),
          duration_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_started))::int,
          status = 'error',
          trades_processed = v_trades,
          cycles_credited = v_cycles,
          missed_cycles = v_missed,
          total_credited_cents = v_total_credited,
          error_message = SQLERRM
      WHERE id = run_id;
    PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
    RAISE;
  END;

  PERFORM pg_advisory_unlock(hashtext('process_due_trades'));
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_trades() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_trades() TO service_role;

-- Auto-prune logs older than 14 days on each run-insert (cheap, opportunistic)
CREATE OR REPLACE FUNCTION public.cron_job_runs_prune()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cron_job_runs WHERE started_at < now() - interval '14 days';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS cron_job_runs_prune_trg ON public.cron_job_runs;
CREATE TRIGGER cron_job_runs_prune_trg
AFTER INSERT ON public.cron_job_runs
FOR EACH STATEMENT EXECUTE FUNCTION public.cron_job_runs_prune();
