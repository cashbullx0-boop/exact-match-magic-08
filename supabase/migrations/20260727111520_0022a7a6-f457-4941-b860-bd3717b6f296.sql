CREATE OR REPLACE FUNCTION public.auto_suspend_non_depositors()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

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

  -- Safety: any account that DOES have a deposit must never stay suspended by this job.
  UPDATE public.profiles p
  SET status = 'active', updated_at = now()
  WHERE p.status = 'suspended'
    AND p.ban_reason IS NULL
    AND EXISTS (SELECT 1 FROM public.deposits d WHERE d.user_id = p.id);

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RETURN v_count;
END;
$$;