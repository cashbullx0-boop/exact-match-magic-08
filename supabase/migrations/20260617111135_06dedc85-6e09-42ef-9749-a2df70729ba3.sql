
-- ============================================================
-- STEP 1: Drop duplicate / legacy triggers and functions
-- ============================================================
DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;

-- Drop legacy trade RPCs (will be replaced)
DROP FUNCTION IF EXISTS public.add_trade_profit(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.close_roi_trade(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.open_roi_trade(integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.process_due_trades() CASCADE;

-- ============================================================
-- STEP 2: Reset all test financial data
-- ============================================================
DELETE FROM public.transactions;
DELETE FROM public.trades;
DELETE FROM public.investments;
DELETE FROM public.deposits;

UPDATE public.profiles
  SET balance_cents = 0,
      total_earned_cents = 0,
      updated_at = now();

-- ============================================================
-- STEP 3: Clean up trades schema (remove all loop/cycle cols)
-- ============================================================
ALTER TABLE public.trades
  DROP COLUMN IF EXISTS cycle_count,
  DROP COLUMN IF EXISTS missed_cycle_count,
  DROP COLUMN IF EXISTS trade_date,
  DROP COLUMN IF EXISTS next_profit_at,
  DROP COLUMN IF EXISTS last_profit_at,
  DROP COLUMN IF EXISTS total_profit_cents,
  DROP COLUMN IF EXISTS direction,
  DROP COLUMN IF EXISTS duration_seconds,
  DROP COLUMN IF EXISTS result;

-- Make sure required columns are present and typed correctly
ALTER TABLE public.trades
  ALTER COLUMN duration_hours SET NOT NULL,
  ALTER COLUMN profit_rate SET NOT NULL,
  ALTER COLUMN profit_amount_cents SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active';

-- Add settled_at for clean audit
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS settled_at timestamptz;

-- Partial unique index — at most one active trade per user
DROP INDEX IF EXISTS trades_one_active_per_user;
CREATE UNIQUE INDEX trades_one_active_per_user
  ON public.trades (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS trades_due_idx
  ON public.trades (expires_at) WHERE status = 'active';

-- ============================================================
-- STEP 4: Prevent duplicate active investments
-- ============================================================
DROP INDEX IF EXISTS investments_one_active_per_asset;
CREATE UNIQUE INDEX investments_one_active_per_asset
  ON public.investments (user_id, asset) WHERE status = 'active';

-- ============================================================
-- STEP 5: Rebuilt open_roi_trade — one active at a time (no daily limit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.open_roi_trade(_amount_cents integer, _duration_hours integer)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  rate numeric(6,4);
  profit_cents integer;
  active_count integer;
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 5000 THEN
    RAISE EXCEPTION 'Minimum trade amount is $50';
  END IF;
  IF _amount_cents % 1000 <> 0 THEN
    RAISE EXCEPTION 'Amount must be in multiples of $10 (50, 60, 70...)';
  END IF;
  IF _duration_hours = 4 THEN rate := 0.03;
  ELSIF _duration_hours = 8 THEN rate := 0.06;
  ELSIF _duration_hours = 12 THEN rate := 0.10;
  ELSE RAISE EXCEPTION 'Invalid duration. Choose 4, 8 or 12 hours'; END IF;

  -- One active trade at a time
  SELECT COUNT(*) INTO active_count FROM public.trades
    WHERE user_id = uid AND status = 'active';
  IF active_count > 0 THEN
    RAISE EXCEPTION 'You already have an active trade. Wait for it to finish.';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  profit_cents := floor(_amount_cents * rate)::integer;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.trades (
    user_id, amount_cents, status, duration_hours, profit_rate, profit_amount_cents, expires_at
  ) VALUES (
    uid, _amount_cents, 'active', _duration_hours, rate, profit_cents,
    now() + make_interval(hours => _duration_hours)
  ) RETURNING * INTO new_trade;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
    'Trade opened (' || _duration_hours || 'h, ' || (rate*100)::text || '% ROI)',
    new_trade.id);

  RETURN new_trade;
END $$;

-- ============================================================
-- STEP 6: settle_trade — idempotent payout for ONE trade
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t public.trades;
  payout_cents integer;
  already_paid boolean;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = _trade_id FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RETURN t; END IF;
  IF t.expires_at > now() THEN RAISE EXCEPTION 'Trade not yet due'; END IF;

  -- Idempotency guard: has a profit credit already been written for this trade?
  SELECT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE related_id = t.id AND type = 'profit'::public.txn_type
  ) INTO already_paid;

  payout_cents := t.amount_cents + t.profit_amount_cents;

  -- Mark closed first (so concurrent cron runs find status<>'active' and bail)
  UPDATE public.trades
    SET status = 'closed', settled_at = now()
    WHERE id = _trade_id AND status = 'active'
    RETURNING * INTO t;

  IF t IS NULL THEN
    SELECT * INTO t FROM public.trades WHERE id = _trade_id;
    RETURN t;
  END IF;

  IF NOT already_paid THEN
    PERFORM set_config('app.bypass_profile_guard', 'on', true);
    UPDATE public.profiles
      SET balance_cents = balance_cents + payout_cents,
          total_earned_cents = total_earned_cents + t.profit_amount_cents,
          updated_at = now()
      WHERE id = t.user_id;
    PERFORM set_config('app.bypass_profile_guard', 'off', true);

    INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (t.user_id, 'profit'::public.txn_type, payout_cents,
      'Trade payout: principal $' || to_char(t.amount_cents/100.0, 'FM999999990.00')
        || ' + profit $' || to_char(t.profit_amount_cents/100.0, 'FM999999990.00'),
      t.id);

    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (t.user_id, '✅ Trade Complete',
      'Your ' || t.duration_hours || 'h trade settled. Payout: $'
        || to_char(payout_cents/100.0, 'FM999999990.00')
        || ' (incl. $' || to_char(t.profit_amount_cents/100.0, 'FM999999990.00') || ' profit).',
      'system', '/dashboard');
  END IF;

  RETURN t;
END $$;

-- ============================================================
-- STEP 7: process_due_trades — cron worker
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_due_trades()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  processed integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.trades
    WHERE status = 'active' AND expires_at <= now()
    ORDER BY expires_at ASC
    LIMIT 500
  LOOP
    BEGIN
      PERFORM public.settle_trade(r.id);
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- continue with the next trade
      NULL;
    END;
  END LOOP;
  RETURN processed;
END $$;

GRANT EXECUTE ON FUNCTION public.open_roi_trade(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_trade(uuid) TO authenticated;
-- process_due_trades is called by pg_cron only; no role grants needed.
