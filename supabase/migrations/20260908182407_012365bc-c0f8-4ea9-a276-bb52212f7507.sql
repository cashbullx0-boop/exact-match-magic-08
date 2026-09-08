DO $do$
DECLARE src text;
BEGIN
  SELECT prosrc INTO src FROM pg_proc WHERE proname = 'reconcile_financials';
  src := replace(src,
    'v_bonus_cents := ROUND(rec.amount_usd * 100 * 0.10)::int;',
    'v_bonus_cents := public.first_deposit_bonus_cents(rec.amount_usd);');
  EXECUTE 'CREATE OR REPLACE FUNCTION public.reconcile_financials() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $body$' || src || '$body$';
END
$do$;