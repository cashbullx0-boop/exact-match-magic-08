DROP POLICY IF EXISTS "app_settings public read" ON public.app_settings;
CREATE POLICY "app_settings public read allowlist" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['ios_pwa_prompt']));