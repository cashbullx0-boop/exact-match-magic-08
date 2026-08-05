CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  level integer,
  xp integer,
  alltime_cents bigint,
  weekly_cents bigint,
  referral_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH weekly_trade_profit AS (
    SELECT t.user_id,
           SUM(t.profit_amount_cents)::bigint AS cents
    FROM public.trades t
    WHERE t.status IN ('closed', 'completed', 'settled')
      AND COALESCE(t.settled_at, t.created_at) > now() - interval '7 days'
    GROUP BY t.user_id
  ),
  weekly_bonuses AS (
    SELECT x.user_id,
           SUM(x.amount_cents)::bigint AS cents
    FROM public.transactions x
    WHERE x.type = 'bonus'
      AND x.amount_cents > 0
      AND x.created_at > now() - interval '7 days'
    GROUP BY x.user_id
  ),
  refs AS (
    SELECT p.referred_by AS user_id,
           COUNT(*)::bigint AS count
    FROM public.profiles p
    WHERE p.referred_by IS NOT NULL
    GROUP BY p.referred_by
  )
  SELECT p.id,
         p.full_name,
         p.avatar_url,
         p.level,
         p.xp,
         GREATEST(COALESCE(p.balance_cents, 0), 0)::bigint AS alltime_cents,
         (COALESCE(tp.cents, 0) + COALESCE(b.cents, 0))::bigint AS weekly_cents,
         COALESCE(r.count, 0)::bigint AS referral_count
  FROM public.profiles p
  LEFT JOIN weekly_trade_profit tp ON tp.user_id = p.id
  LEFT JOIN weekly_bonuses b ON b.user_id = p.id
  LEFT JOIN refs r ON r.user_id = p.id
  WHERE COALESCE(p.status, 'active') <> 'banned';
$function$;

REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO service_role;