UPDATE public.app_settings
SET value = jsonb_build_object('USDT_TRC20', 'TFvG8Pk6SWM3gLncoHvMCBz7wryP6eHq3C'),
    updated_at = now()
WHERE key = 'deposit_address';

INSERT INTO public.app_settings (key, value)
SELECT 'deposit_address', jsonb_build_object('USDT_TRC20', 'TFvG8Pk6SWM3gLncoHvMCBz7wryP6eHq3C')
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'deposit_address');