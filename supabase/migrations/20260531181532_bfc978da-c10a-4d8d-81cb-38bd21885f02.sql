
CREATE OR REPLACE FUNCTION public.get_my_downline()
RETURNS TABLE(
  slot int,
  referred_id uuid,
  full_name text,
  username text,
  avatar_url text,
  country text,
  balance_cents int,
  total_deposit_cents bigint,
  joined_at timestamptz,
  status text,
  bonus_cents int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH first6 AS (
    SELECT r.referred_id, r.created_at, r.bonus_cents,
           row_number() OVER (ORDER BY r.created_at ASC) AS slot
    FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
    ORDER BY r.created_at ASC
    LIMIT 6
  )
  SELECT
    f.slot::int,
    f.referred_id,
    p.full_name,
    p.username,
    p.avatar_url,
    k.country,
    p.balance_cents,
    COALESCE((SELECT SUM(round(d.amount_usd * 100))::bigint
              FROM public.deposits d
              WHERE d.user_id = f.referred_id AND d.status = 'completed'), 0) AS total_deposit_cents,
    f.created_at AS joined_at,
    p.status,
    f.bonus_cents
  FROM first6 f
  LEFT JOIN public.profiles p ON p.id = f.referred_id
  LEFT JOIN LATERAL (
    SELECT country FROM public.kyc_submissions ks
    WHERE ks.user_id = f.referred_id
    ORDER BY ks.submitted_at DESC LIMIT 1
  ) k ON true
  ORDER BY f.slot;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_downline() TO authenticated;
