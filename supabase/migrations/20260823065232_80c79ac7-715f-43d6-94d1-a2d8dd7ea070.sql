UPDATE public.app_settings
SET value = jsonb_build_object('USDT_TRC20', 'TKMBk93ipouTKRW8je6iFGnpTHZwRsid4u'),
    updated_at = now()
WHERE key = 'deposit_address';

INSERT INTO public.app_settings (key, value)
SELECT 'deposit_address', jsonb_build_object('USDT_TRC20', 'TKMBk93ipouTKRW8je6iFGnpTHZwRsid4u')
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'deposit_address');