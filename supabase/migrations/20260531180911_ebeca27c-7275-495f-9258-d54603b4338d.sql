
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS slip_path text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Allow user updates to attach slip_path on their pending/confirming deposits.
CREATE OR REPLACE FUNCTION public.deposits_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.amount_usd := OLD.amount_usd;
  NEW.network := OLD.network;
  NEW.wallet_address := OLD.wallet_address;
  NEW.provider := OLD.provider;
  NEW.status := OLD.status;
  NEW.provider_payment_id := OLD.provider_payment_id;
  NEW.confirmations := OLD.confirmations;
  NEW.notes := OLD.notes;
  NEW.expires_at := OLD.expires_at;
  NEW.confirmed_at := OLD.confirmed_at;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;

-- Admin approve deposit: mark completed, credit balance, log transaction.
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d_user uuid;
  d_amount numeric;
  d_status deposit_status;
  cents integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT user_id, amount_usd, status INTO d_user, d_amount, d_status
    FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF d_user IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d_status = 'completed' THEN RETURN; END IF;
  cents := round(d_amount * 100);
  UPDATE public.deposits SET status = 'completed', confirmed_at = now(), updated_at = now()
    WHERE id = _deposit_id;
  UPDATE public.profiles
    SET balance_cents = balance_cents + cents,
        total_earned_cents = total_earned_cents + cents,
        updated_at = now()
    WHERE id = d_user;
  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
    VALUES (d_user, 'deposit', cents, 'Deposit approved', _deposit_id);
  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (d_user, 'Deposit approved', 'Your deposit of $' || d_amount || ' has been credited.', 'system', '/deposit');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_deposit(_deposit_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT user_id INTO d_user FROM public.deposits WHERE id = _deposit_id;
  IF d_user IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  UPDATE public.deposits
    SET status = 'failed', rejection_reason = _reason, updated_at = now()
    WHERE id = _deposit_id;
  INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (d_user, 'Deposit rejected', coalesce(_reason, 'Your deposit was rejected.'), 'system', '/deposit');
END;
$$;

-- Storage bucket for deposit slips (private).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('deposit-slips', 'deposit-slips', false)
  ON CONFLICT (id) DO NOTHING;

-- Users can upload, read and update their own slips inside their user-id folder.
DROP POLICY IF EXISTS "Users upload own deposit slips" ON storage.objects;
CREATE POLICY "Users upload own deposit slips"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-slips' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users view own deposit slips" ON storage.objects;
CREATE POLICY "Users view own deposit slips"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-slips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Admins manage deposit slips" ON storage.objects;
CREATE POLICY "Admins manage deposit slips"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'deposit-slips' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'deposit-slips' AND public.has_role(auth.uid(), 'admin'));
