create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  level integer,
  xp integer,
  alltime_cents bigint,
  weekly_cents bigint,
  referral_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with trade_profit as (
    select t.user_id,
           sum(t.profit_amount_cents)::bigint as all_c,
           sum(case when coalesce(t.settled_at, t.created_at) > now() - interval '7 days'
                    then t.profit_amount_cents else 0 end)::bigint as wk_c
    from public.trades t
    where t.status in ('closed','completed','settled')
    group by t.user_id
  ),
  bonuses as (
    select x.user_id,
           sum(x.amount_cents)::bigint as all_c,
           sum(case when x.created_at > now() - interval '7 days' then x.amount_cents else 0 end)::bigint as wk_c
    from public.transactions x
    where x.type = 'bonus' and x.amount_cents > 0
    group by x.user_id
  ),
  refs as (
    select p.referred_by as user_id, count(*)::bigint as c
    from public.profiles p
    where p.referred_by is not null
    group by p.referred_by
  )
  select p.id,
         p.full_name,
         p.avatar_url,
         p.level,
         p.xp,
         (coalesce(tp.all_c,0) + coalesce(b.all_c,0))::bigint,
         (coalesce(tp.wk_c,0) + coalesce(b.wk_c,0))::bigint,
         coalesce(r.c,0)::bigint
  from public.profiles p
  left join trade_profit tp on tp.user_id = p.id
  left join bonuses b on b.user_id = p.id
  left join refs r on r.user_id = p.id
  where coalesce(p.status,'active') <> 'banned'
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;