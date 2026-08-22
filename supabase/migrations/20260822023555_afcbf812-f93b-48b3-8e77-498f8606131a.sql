ALTER FUNCTION public.admin_approve_password_reset(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.admin_approve_wallet_change(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.confirm_wallet_change(uuid,text) SET search_path = public, extensions;
ALTER FUNCTION public.consume_password_reset_token(uuid,text) SET search_path = public, extensions;
ALTER FUNCTION public.create_signup_phone_otp(text) SET search_path = public, extensions;
ALTER FUNCTION public.verify_signup_phone_otp(text,text) SET search_path = public, extensions;
ALTER FUNCTION public.verify_password_reset_otp(text,text) SET search_path = public, auth, extensions;