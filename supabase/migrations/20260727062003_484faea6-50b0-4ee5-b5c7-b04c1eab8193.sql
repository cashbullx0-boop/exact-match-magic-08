
-- Backfill deposit_deadline for existing profiles
UPDATE public.profiles p
SET deposit_deadline = p.created_at + interval '7 days'
WHERE p.deposit_deadline IS NULL;

-- Default deadline for new signups
ALTER TABLE public.profiles
  ALTER COLUMN deposit_deadline SET DEFAULT (now() + interval '7 days');

CREATE OR REPLACE FUNCTION public.auto_suspend_non_depositors()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.profiles p
    SET status = 'suspended', updated_at = now()
    WHERE COALESCE(p.status, 'active') = 'active'
      AND COALESCE(p.deposit_deadline, p.created_at + interval '7 days') <= now()
      AND NOT EXISTS (SELECT 1 FROM public.deposits d WHERE d.user_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
    RETURNING p.id
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_suspend_non_depositors() FROM public, anon, authenticated;

SELECT cron.schedule('auto-suspend-non-depositors', '0 * * * *', $$ SELECT public.auto_suspend_non_depositors(); $$);
