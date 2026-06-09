
-- 1. Deposits: remove broad user UPDATE policy, expose narrow RPCs
DROP POLICY IF EXISTS "Users update own pending tx hash" ON public.deposits;

CREATE OR REPLACE FUNCTION public.submit_deposit_tx_hash(_deposit_id uuid, _tx_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  d_user uuid;
  d_status public.deposit_status;
  h text := btrim(coalesce(_tx_hash, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(h) < 6 OR length(h) > 128 OR h !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Invalid transaction hash';
  END IF;
  SELECT user_id, status INTO d_user, d_status FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF d_user IS NULL OR d_user <> uid THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d_status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN
    RAISE EXCEPTION 'Deposit cannot be modified';
  END IF;
  PERFORM set_config('app.bypass_deposit_guard', 'on', true);
  UPDATE public.deposits
    SET tx_hash = h, status = 'confirming'::public.deposit_status, updated_at = now()
    WHERE id = _deposit_id;
  PERFORM set_config('app.bypass_deposit_guard', 'off', true);
END; $$;

CREATE OR REPLACE FUNCTION public.submit_deposit_slip(_deposit_id uuid, _slip_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  d_user uuid;
  d_status public.deposit_status;
  p text := btrim(coalesce(_slip_path, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(p) < 3 OR length(p) > 512 THEN
    RAISE EXCEPTION 'Invalid slip path';
  END IF;
  IF position((uid::text || '/') in p) <> 1 THEN
    RAISE EXCEPTION 'Slip path must be in your own folder';
  END IF;
  SELECT user_id, status INTO d_user, d_status FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF d_user IS NULL OR d_user <> uid THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d_status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN
    RAISE EXCEPTION 'Deposit cannot be modified';
  END IF;
  PERFORM set_config('app.bypass_deposit_guard', 'on', true);
  UPDATE public.deposits
    SET slip_path = p, updated_at = now()
    WHERE id = _deposit_id;
  PERFORM set_config('app.bypass_deposit_guard', 'off', true);
END; $$;

-- Allow the bypass flag in the guard trigger so the RPCs above can write
CREATE OR REPLACE FUNCTION public.deposits_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE bypass text;
BEGIN
  IF current_user = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  BEGIN bypass := current_setting('app.bypass_deposit_guard', true); EXCEPTION WHEN OTHERS THEN bypass := NULL; END;
  IF bypass = 'on' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

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
  NEW.tx_hash := OLD.tx_hash;
  NEW.slip_path := OLD.slip_path;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;

-- 2. Withdrawal OTPs: remove broad user UPDATE policy (verify_withdrawal_otp RPC handles it)
DROP POLICY IF EXISTS "Users update own withdrawal otps" ON public.withdrawal_otps;

-- 3. KYC documents storage: user DELETE in own folder
DROP POLICY IF EXISTS "Users delete own kyc docs" ON storage.objects;
CREATE POLICY "Users delete own kyc docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Avatars storage: explicit SELECT policy (intentionally public-readable)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
