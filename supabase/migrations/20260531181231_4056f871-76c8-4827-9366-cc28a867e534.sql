
-- Lookup referrer by username (case-insensitive) or referral_code
CREATE OR REPLACE FUNCTION public.get_referrer_id_by_username_or_code(_value text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE lower(username) = lower(_value) OR referral_code = upper(_value)
  LIMIT 1
$$;

-- Public lookup of referrer display info for landing page
CREATE OR REPLACE FUNCTION public.get_referrer_public_info(_value text)
RETURNS TABLE(username text, full_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE lower(p.username) = lower(_value) OR p.referral_code = upper(_value)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_id_by_username_or_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referrer_public_info(text) TO anon, authenticated;

-- Case-insensitive unique index on username (only when non-null)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;
