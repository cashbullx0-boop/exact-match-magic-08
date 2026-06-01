
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.withdrawal_network AS ENUM ('TRC20','BEP20','ERC20');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 1000),
  network public.withdrawal_network NOT NULL,
  wallet_address text NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  admin_notes text,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status, created_at DESC);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Admins update withdrawals"
  ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Create withdrawal (user-callable)
CREATE OR REPLACE FUNCTION public.create_withdrawal(
  _amount_cents integer,
  _network text,
  _wallet_address text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal integer;
  addr text := btrim(coalesce(_wallet_address,''));
  net public.withdrawal_network;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 1000 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $10';
  END IF;
  IF _amount_cents > 1000000000 THEN
    RAISE EXCEPTION 'Amount too large';
  END IF;
  IF _network NOT IN ('TRC20','BEP20','ERC20') THEN
    RAISE EXCEPTION 'Invalid network';
  END IF;
  net := _network::public.withdrawal_network;
  IF length(addr) < 20 OR length(addr) > 128 THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;
  IF addr !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Wallet address contains invalid characters';
  END IF;

  SELECT balance_cents INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF bal IS NULL OR bal < _amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles
    SET balance_cents = balance_cents - _amount_cents, updated_at = now()
    WHERE id = uid;

  INSERT INTO public.withdrawals (user_id, amount_cents, network, wallet_address)
    VALUES (uid, _amount_cents, net, addr)
    RETURNING id INTO new_id;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (uid, 'withdrawal'::public.txn_type, -_amount_cents,
      'Withdrawal request (' || _network || ')', new_id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (uid, 'Withdrawal requested',
      'Your withdrawal of $' || (_amount_cents/100.0)::text || ' is pending review.',
      'system', '/wallet');

  RETURN new_id;
END; $$;

-- Admin: approve
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid; v_status public.withdrawal_status; v_amt integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT user_id, status, amount_cents INTO v_user, v_status, v_amt
    FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal already finalized'; END IF;

  UPDATE public.withdrawals
    SET status='approved', admin_notes=_notes, updated_at=now()
    WHERE id = _id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Withdrawal approved',
      'Your withdrawal of $' || (v_amt/100.0)::text || ' is approved and will be paid shortly.',
      'system', '/wallet');
END; $$;

-- Admin: reject (refund balance)
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid; v_status public.withdrawal_status; v_amt integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT user_id, status, amount_cents INTO v_user, v_status, v_amt
    FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_status NOT IN ('pending','approved') THEN
    RAISE EXCEPTION 'Cannot reject a finalized withdrawal';
  END IF;

  UPDATE public.withdrawals
    SET status='rejected', rejection_reason=_reason, processed_at=now(), updated_at=now()
    WHERE id = _id;

  -- Refund
  UPDATE public.profiles
    SET balance_cents = balance_cents + v_amt, updated_at=now()
    WHERE id = v_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (v_user, 'deposit'::public.txn_type, v_amt,
      'Withdrawal refund: ' || COALESCE(_reason,'rejected'), _id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Withdrawal rejected',
      COALESCE(_reason,'Your withdrawal was rejected and the amount has been refunded.'),
      'system', '/wallet');
END; $$;

-- Admin: mark paid (sets tx hash, finalizes)
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(_id uuid, _tx_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid; v_status public.withdrawal_status; v_amt integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT user_id, status, amount_cents INTO v_user, v_status, v_amt
    FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_status NOT IN ('pending','approved') THEN
    RAISE EXCEPTION 'Withdrawal already finalized'; END IF;

  UPDATE public.withdrawals
    SET status='paid', tx_hash=_tx_hash, processed_at=now(), updated_at=now()
    WHERE id = _id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (v_user, 'Withdrawal paid',
      'Your withdrawal of $' || (v_amt/100.0)::text || ' has been sent.' ||
      CASE WHEN _tx_hash IS NOT NULL THEN ' Tx: ' || _tx_hash ELSE '' END,
      'system', '/wallet');
END; $$;
