CREATE OR REPLACE FUNCTION public.deposits_guard_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  canonical text;
BEGIN
  IF current_user = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.user_id := auth.uid();

  SELECT value ->> NEW.network::text INTO canonical
  FROM public.app_settings WHERE key = 'deposit_address';
  IF canonical IS NULL THEN
    RAISE EXCEPTION 'Deposit address is not configured';
  END IF;
  NEW.wallet_address := canonical;

  IF NEW.amount_usd IS NULL OR NEW.amount_usd < 10 OR NEW.amount_usd > 100000
     OR (round(NEW.amount_usd * 100)::bigint % 1000) <> 0 THEN
    RAISE EXCEPTION 'Invalid deposit amount';
  END IF;

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
$function$;