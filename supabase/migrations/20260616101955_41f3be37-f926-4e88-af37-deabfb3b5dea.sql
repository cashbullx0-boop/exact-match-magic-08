
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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
    IF cycles_missed < 1 THEN cycles_missed := 1; END IF;

    credit_cents := (t.profit_amount_cents::bigint) * cycles_missed;
    IF credit_cents > 2147483647 THEN credit_cents := 2147483647; END IF;

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

    UPDATE public.trades
      SET next_profit_at = now() + make_interval(hours => t.duration_hours),
          last_profit_at = now(),
          cycle_count = cycle_count + cycles_missed,
          total_profit_cents = total_profit_cents + credit_cents::int
      WHERE id = t.id;

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      t.user_id,
      '✅ Trade profit added',
      '+$' || to_char(credit_cents::numeric / 100.0, 'FM999999990.00') ||
        ' added to your wallet from your active trade.',
      'system',
      '/dashboard'
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_trades() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_trades() TO service_role;

-- Ensure realtime delivers profile balance updates to subscribed clients
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END $$;
