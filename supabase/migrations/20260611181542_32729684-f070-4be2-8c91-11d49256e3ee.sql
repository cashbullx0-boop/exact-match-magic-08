
-- 1. Notifications: explicit restrictive INSERT block for non-admins
CREATE POLICY "Block non-admin notification inserts"
  ON public.notifications AS RESTRICTIVE
  FOR INSERT TO authenticated, anon
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. phone_verifications: restrict existing policy to authenticated only
DROP POLICY IF EXISTS "Users manage own phone verifications" ON public.phone_verifications;
CREATE POLICY "Users manage own phone verifications"
  ON public.phone_verifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. kyc_submissions: users may only set status to 'pending' on their own updates
DROP POLICY IF EXISTS "Users update own pending kyc" ON public.kyc_submissions;
CREATE POLICY "Users update own pending kyc"
  ON public.kyc_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = ANY (ARRAY['pending'::public.kyc_status, 'rejected'::public.kyc_status, 'unverified'::public.kyc_status]))
  WITH CHECK (auth.uid() = user_id AND status = 'pending'::public.kyc_status);

-- 4. avatars bucket: drop broad listing policy. Public URLs still work via CDN.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
