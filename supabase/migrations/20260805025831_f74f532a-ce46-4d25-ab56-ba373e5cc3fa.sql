-- 1. Canonical deposit address lives server-side
INSERT INTO public.app_settings (key, value)
VALUES ('deposit_address', jsonb_build_object('USDT_TRC20', 'TW4xgX1d1bJWiZtJ9gozvCHa3ZkuE3bJDd'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.get_deposit_address(_network text DEFAULT 'USDT_TRC20')
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value ->> _network FROM public.app_settings WHERE key = 'deposit_address';
$$;

REVOKE ALL ON FUNCTION public.get_deposit_address(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deposit_address(text) TO authenticated, service_role;

-- 2. Harden deposit inserts: clients can never choose status, address, or provider fields
CREATE OR REPLACE FUNCTION public.deposits_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical text;
BEGIN
  IF current_user = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ownership cannot be forged
  NEW.user_id := auth.uid();

  -- Address always comes from server config, never from the browser
  SELECT value ->> NEW.network::text INTO canonical
  FROM public.app_settings WHERE key = 'deposit_address';
  IF canonical IS NULL THEN
    RAISE EXCEPTION 'Deposit address is not configured';
  END IF;
  NEW.wallet_address := canonical;

  -- Amount rules enforced server-side
  IF NEW.amount_usd IS NULL OR NEW.amount_usd < 50 OR NEW.amount_usd > 100000
     OR (round(NEW.amount_usd * 100)::bigint % 1000) <> 0 THEN
    RAISE EXCEPTION 'Invalid deposit amount';
  END IF;

  -- Lifecycle fields are server-owned
  NEW.status := 'pending';
  NEW.provider := 'manual';
  NEW.provider_payment_id := NULL;
  NEW.confirmations := 0;
  NEW.confirmed_at := NULL;
  NEW.rejection_reason := NULL;
  NEW.notes := NULL;
  NEW.slip_path := NULL;
  NEW.slip_attempt := 0;
  NEW.tx_hash := NULL;
  NEW.sender_wallet_address := NULL;
  NEW.expires_at := now() + interval '30 minutes';
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deposits_guard_insert_trg ON public.deposits;
CREATE TRIGGER deposits_guard_insert_trg
BEFORE INSERT ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.deposits_guard_insert();