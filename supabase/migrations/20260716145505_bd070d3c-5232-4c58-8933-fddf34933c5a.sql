
CREATE OR REPLACE FUNCTION public.get_my_direct_referrals()
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.username, p.avatar_url, p.status, p.created_at
  FROM public.profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_direct_referrals() TO authenticated;
