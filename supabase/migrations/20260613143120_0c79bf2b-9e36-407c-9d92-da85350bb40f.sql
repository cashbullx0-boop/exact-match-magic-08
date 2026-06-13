-- Harden banned_documents: explicit restrictive admin-only SELECT
CREATE POLICY "Restrict banned_documents select to admins"
  ON public.banned_documents
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));