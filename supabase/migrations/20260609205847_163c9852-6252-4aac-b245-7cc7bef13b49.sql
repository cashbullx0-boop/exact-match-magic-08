
-- Allow service_role (dashboard/SQL editor) to bypass the deposits guard, and auto-credit on status->approved
CREATE OR REPLACE FUNCTION public.deposits_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role (dashboard edits) or admin users bypass the lock
  IF current_user = 'service_role'
     OR auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
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
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;

-- Trigger function: when status flips to approved/completed, credit balance + log transaction + notify
CREATE OR REPLACE FUNCTION public.deposits_auto_credit_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cents integer;
  already_credited boolean;
BEGIN
  IF NEW.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND OLD.status NOT IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN

    SELECT EXISTS (
      SELECT 1 FROM public.transactions
      WHERE type = 'deposit'::public.txn_type AND related_id = NEW.id
    ) INTO already_credited;

    IF already_credited THEN
      NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
      RETURN NEW;
    END IF;

    cents := round(NEW.amount_usd * 100);

    UPDATE public.profiles
      SET balance_cents = balance_cents + cents,
          total_earned_cents = total_earned_cents + cents,
          updated_at = now()
      WHERE id = NEW.user_id;

    INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
      VALUES (NEW.user_id, 'deposit'::public.txn_type, cents, 'Deposit approved', NEW.id);

    INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.user_id, 'Deposit approved',
        'Your deposit of $' || NEW.amount_usd || ' has been credited.', 'system', '/deposit');

    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deposits_auto_credit_trg ON public.deposits;
CREATE TRIGGER deposits_auto_credit_trg
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.deposits_auto_credit_on_approve();
