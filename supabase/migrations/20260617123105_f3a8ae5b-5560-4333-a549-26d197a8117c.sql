CREATE OR REPLACE FUNCTION public.check_signup_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_profiles int;
  v_missing_roles int;
  v_trigger_present boolean;
  v_backfilled_profiles int := 0;
  v_backfilled_roles int := 0;
  v_run_id uuid;
  v_new_code text;
  rec record;
BEGIN
  INSERT INTO public.cron_job_runs (job_name, started_at, status)
  VALUES ('signup-health-check', now(), 'running')
  RETURNING id INTO v_run_id;

  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created' AND NOT tgisinternal)
    INTO v_trigger_present;

  SELECT count(*) INTO v_missing_profiles
    FROM auth.users au LEFT JOIN public.profiles p ON p.id=au.id WHERE p.id IS NULL;
  SELECT count(*) INTO v_missing_roles
    FROM auth.users au LEFT JOIN public.user_roles r ON r.user_id=au.id AND r.role='user'
    WHERE r.user_id IS NULL;

  FOR rec IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    LOOP
      v_new_code := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_new_code);
    END LOOP;
    INSERT INTO public.profiles (id, full_name, avatar_url, referral_code)
    VALUES (
      rec.id,
      COALESCE(
        NULLIF(btrim(rec.raw_user_meta_data->>'full_name'), ''),
        NULLIF(btrim(rec.raw_user_meta_data->>'name'), ''),
        NULLIF(split_part(COALESCE(rec.email,''), '@', 1), ''),
        'User'
      ),
      rec.raw_user_meta_data->>'avatar_url',
      v_new_code
    )
    ON CONFLICT (id) DO NOTHING;
    v_backfilled_profiles := v_backfilled_profiles + 1;
  END LOOP;

  INSERT INTO public.user_roles (user_id, role)
  SELECT au.id, 'user'::public.app_role FROM auth.users au
  LEFT JOIN public.user_roles r ON r.user_id=au.id AND r.role='user'
  WHERE r.user_id IS NULL
  ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS v_backfilled_roles = ROW_COUNT;

  IF NOT v_trigger_present OR v_missing_profiles > 0 OR v_missing_roles > 0 THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    SELECT ur.user_id,
      '🚨 Signup trigger health alert',
      'Trigger present: ' || v_trigger_present
        || ' | Missing profiles: ' || v_missing_profiles
        || ' (backfilled ' || v_backfilled_profiles || ')'
        || ' | Missing roles: ' || v_missing_roles
        || ' (backfilled ' || v_backfilled_roles || ')'
        || CASE WHEN NOT v_trigger_present
             THEN ' — TRIGGER on_auth_user_created IS MISSING. Re-run signup fix migration immediately.'
             ELSE '' END,
      'admin', '/admin/jobs'
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;

  UPDATE public.cron_job_runs
  SET finished_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
      status = CASE WHEN NOT v_trigger_present THEN 'error' ELSE 'success' END,
      error_message = CASE WHEN NOT v_trigger_present THEN 'on_auth_user_created trigger missing' ELSE NULL END
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'trigger_present', v_trigger_present,
    'missing_profiles', v_missing_profiles,
    'missing_roles', v_missing_roles,
    'backfilled_profiles', v_backfilled_profiles,
    'backfilled_roles', v_backfilled_roles
  );
END $$;

REVOKE ALL ON FUNCTION public.check_signup_health() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_signup_health() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('signup-health-check');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'signup-health-check',
  '0 * * * *',
  $$ SELECT public.check_signup_health(); $$
);

SELECT public.check_signup_health();