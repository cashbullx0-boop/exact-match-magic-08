-- Remove user SELECT on password_reset_requests so otp_hash cannot be read by clients.
-- All reads go through SECURITY DEFINER RPCs; admins retain access via the existing admin policy.
DROP POLICY IF EXISTS "Users view own reset requests" ON public.password_reset_requests;