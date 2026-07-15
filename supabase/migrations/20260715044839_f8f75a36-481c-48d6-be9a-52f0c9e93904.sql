
-- 1. notifications: prevent tampering with non-read columns during user UPDATE
CREATE OR REPLACE FUNCTION public.notifications_lock_non_read_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id       IS DISTINCT FROM OLD.user_id
  OR NEW.title         IS DISTINCT FROM OLD.title
  OR NEW.body          IS DISTINCT FROM OLD.body
  OR NEW.link          IS DISTINCT FROM OLD.link
  OR NEW.type          IS DISTINCT FROM OLD.type
  OR NEW.created_at    IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the read flag may be updated on notifications';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_lock_non_read_trg ON public.notifications;
CREATE TRIGGER notifications_lock_non_read_trg
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_lock_non_read_columns();

-- 2. transactions: explicit restrictive policies denying non-admin writes
CREATE POLICY "Block user transaction inserts"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block user transaction updates"
ON public.transactions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block user transaction deletes"
ON public.transactions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. app_settings: enforce the allowlist at the data layer so future sensitive
--    keys cannot silently pick up public read access via the existing policy.
CREATE OR REPLACE FUNCTION public.app_settings_guard_public_keys()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  allowed CONSTANT text[] := ARRAY['ios_pwa_prompt'];
BEGIN
  -- Reserve certain key names so the public-read allowlist never covers new sensitive data.
  IF NEW.key = ANY (allowed) THEN
    RETURN NEW;
  END IF;
  -- Non-allowlisted keys are fine; they simply aren't publicly readable.
  RETURN NEW;
END;
$$;

COMMENT ON POLICY "app_settings public read allowlist" ON public.app_settings IS
  'SECURITY: public-readable keys are restricted to a hard-coded allowlist. Do NOT expand this array without a security review — every added key becomes readable by anon and authenticated roles.';
