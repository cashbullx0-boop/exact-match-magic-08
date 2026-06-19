GRANT EXECUTE ON FUNCTION public.create_signup_phone_otp(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(text, text) TO anon, authenticated;