
-- Extend trades table for looping ROI trades
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS duration_hours integer,
  ADD COLUMN IF NOT EXISTS profit_rate numeric(6,4),
  ADD COLUMN IF NOT EXISTS profit_amount_cents integer,
  ADD COLUMN IF NOT EXISTS next_profit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_profit_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trade_date date;

-- Make legacy columns nullable so new rows can omit them
ALTER TABLE public.trades ALTER COLUMN direction DROP NOT NULL;
ALTER TABLE public.trades ALTER COLUMN duration_seconds DROP NOT NULL;
ALTER TABLE public.trades ALTER COLUMN expires_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS trades_user_trade_date_idx
  ON public.trades(user_id, trade_date);

-- Drop legacy functions (UP/DOWN model)
DROP FUNCTION IF EXISTS public.place_trade(integer, text, integer);
DROP FUNCTION IF EXISTS public.settle_trade(uuid);

-- Open a looping ROI trade (one per user per UK day)
CREATE OR REPLACE FUNCTION public.open_roi_trade(
  _amount_cents integer,
  _duration_hours integer
) RETURNS public.trades
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  rate numeric(6,4);
  profit_cents integer;
  today_uk date := (now() AT TIME ZONE 'Europe/London')::date;
  existing_count integer;
  new_trade public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 5000 THEN
    RAISE EXCEPTION 'Minimum trade amount is $50';
  END IF;
  IF _amount_cents % 1000 <> 0 THEN
    RAISE EXCEPTION 'Amount must be a multiple of $10 (50, 60, 70...)';
  END IF;
  IF _duration_hours = 4 THEN rate := 0.03;
  ELSIF _duration_hours = 8 THEN rate := 0.06;
  ELSIF _duration_hours = 12 THEN rate := 0.10;
  ELSE RAISE EXCEPTION 'Invalid duration. Choose 4, 8 or 12 hours'; END IF;

  SELECT COUNT(*) INTO existing_count FROM public.trades
    WHERE user_id = uid AND trade_date = today_uk;
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'You have already placed a trade today. Come back tomorrow!';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  profit_cents := floor(_amount_cents * rate)::integer;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.trades (
    user_id, amount_cents, status, duration_hours, profit_rate, profit_amount_cents,
    next_profit_at, last_profit_at, cycle_count, total_profit_cents, trade_date,
    direction, duration_seconds, expires_at
  ) VALUES (
    uid, _amount_cents, 'active', _duration_hours, rate, profit_cents,
    now() + make_interval(hours => _duration_hours), NULL, 0, 0, today_uk,
    'up', _duration_hours * 3600, now() + make_interval(hours => _duration_hours)
  ) RETURNING * INTO new_trade;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
    'Trade opened (' || _duration_hours || 'h, ' || (rate*100)::text || '% ROI)', new_trade.id);

  RETURN new_trade;
END $$;

-- Credit one cycle of profit (called by client when next_profit_at is reached)
CREATE OR REPLACE FUNCTION public.add_trade_profit(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  t public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO t FROM public.trades WHERE id = _trade_id AND user_id = uid FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RAISE EXCEPTION 'Trade is not active'; END IF;
  IF t.next_profit_at IS NULL OR now() < t.next_profit_at THEN
    RAISE EXCEPTION 'Profit cycle not yet complete';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + t.profit_amount_cents,
        total_earned_cents = total_earned_cents + t.profit_amount_cents,
        updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  UPDATE public.trades
    SET last_profit_at = now(),
        next_profit_at = now() + make_interval(hours => t.duration_hours),
        cycle_count = cycle_count + 1,
        total_profit_cents = total_profit_cents + t.profit_amount_cents
    WHERE id = _trade_id
    RETURNING * INTO t;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'deposit'::public.txn_type, t.profit_amount_cents,
    'Trade profit: +$' || to_char(t.profit_amount_cents/100.0, 'FM999990.00')
      || ' (cycle ' || t.cycle_count || ')', t.id);

  RETURN t;
END $$;

-- Close an active trade and return principal
CREATE OR REPLACE FUNCTION public.close_roi_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  t public.trades;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO t FROM public.trades WHERE id = _trade_id AND user_id = uid FOR UPDATE;
  IF t IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF t.status <> 'active' THEN RAISE EXCEPTION 'Trade is not active'; END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET balance_cents = balance_cents + t.amount_cents, updated_at = now()
    WHERE id = uid;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  UPDATE public.trades
    SET status = 'closed', result = 'closed'
    WHERE id = _trade_id
    RETURNING * INTO t;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (uid, 'deposit'::public.txn_type, t.amount_cents,
    'Trade closed: principal returned', t.id);

  RETURN t;
END $$;
