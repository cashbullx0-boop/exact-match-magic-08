
-- Investment status enum
DO $$ BEGIN
  CREATE TYPE public.investment_status AS ENUM ('active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Investments table
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset text NOT NULL,         -- XAU, BTC, ETH, WTI
  asset_name text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 5000),
  entry_price numeric NOT NULL DEFAULT 0,
  return_percent numeric NOT NULL DEFAULT 0,
  status public.investment_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own investments" ON public.investments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage investments" ON public.investments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS investments_user_idx ON public.investments(user_id, created_at DESC);

CREATE TRIGGER touch_investments BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create investment: deduct wallet, insert row + transaction atomically
CREATE OR REPLACE FUNCTION public.create_investment(
  _asset text, _asset_name text, _amount_cents integer, _entry_price numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  has_deposit boolean;
  bal integer;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents < 5000 THEN RAISE EXCEPTION 'Minimum investment is $50'; END IF;
  IF _asset NOT IN ('XAU','BTC','ETH','WTI') THEN RAISE EXCEPTION 'Invalid asset'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.deposits
    WHERE user_id = uid AND status IN ('approved'::public.deposit_status,'completed'::public.deposit_status))
    INTO has_deposit;
  IF NOT has_deposit THEN RAISE EXCEPTION 'Approved deposit required'; END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;

  INSERT INTO public.investments (user_id, asset, asset_name, amount_cents, entry_price)
    VALUES (uid, _asset, _asset_name, _amount_cents, COALESCE(_entry_price, 0))
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Investment in ' || _asset_name, new_id);

  RETURN new_id;
END; $$;

-- Admin complete investment: set return %, credit principal + return to user
CREATE OR REPLACE FUNCTION public.admin_complete_investment(_id uuid, _return_percent numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid; v_amount integer; v_status public.investment_status; v_payout integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT user_id, amount_cents, status INTO v_user, v_amount, v_status
    FROM public.investments WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'Investment already finalized'; END IF;

  v_payout := v_amount + round(v_amount * COALESCE(_return_percent,0) / 100.0)::int;

  UPDATE public.investments
    SET status = 'completed', return_percent = COALESCE(_return_percent,0),
        completed_at = now(), updated_at = now()
    WHERE id = _id;

  UPDATE public.profiles
    SET balance_cents = balance_cents + v_payout,
        total_earned_cents = total_earned_cents + GREATEST(v_payout - v_amount, 0),
        updated_at = now()
    WHERE id = v_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (v_user, 'deposit'::public.txn_type, v_payout,
      'Investment return (' || COALESCE(_return_percent,0)::text || '%)', _id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Investment completed',
      'Your investment was completed with ' || COALESCE(_return_percent,0)::text || '% return.',
      'system', '/invest');
END; $$;

-- Admin cancel: refund principal
CREATE OR REPLACE FUNCTION public.admin_cancel_investment(_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid; v_amount integer; v_status public.investment_status;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT user_id, amount_cents, status INTO v_user, v_amount, v_status
    FROM public.investments WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'Investment already finalized'; END IF;

  UPDATE public.investments SET status = 'cancelled', updated_at = now(), completed_at = now()
    WHERE id = _id;

  UPDATE public.profiles SET balance_cents = balance_cents + v_amount, updated_at = now()
    WHERE id = v_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (v_user, 'deposit'::public.txn_type, v_amount,
      'Investment refund: ' || COALESCE(_reason,'cancelled'), _id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Investment cancelled',
      COALESCE(_reason,'Your investment was cancelled and principal refunded.'),
      'system', '/invest');
END; $$;
