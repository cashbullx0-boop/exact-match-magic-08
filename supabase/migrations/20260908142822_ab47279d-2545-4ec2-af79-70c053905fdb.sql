UPDATE public.app_settings
SET value = jsonb_build_object('USDT_TRC20', 'TLSVbHMCvFJ3sXpZwtGQzbQcHXicYTQUDR'), updated_at = now()
WHERE key = 'deposit_address';

CREATE OR REPLACE FUNCTION public.get_deposit_address(_network text DEFAULT 'USDT_TRC20')
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN jsonb_typeof(value) = 'object' THEN value ->> _network
           WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}'
           ELSE NULL
         END
  FROM public.app_settings WHERE key = 'deposit_address';
$$;

REVOKE ALL ON FUNCTION public.get_deposit_address(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deposit_address(text) TO authenticated, service_role;