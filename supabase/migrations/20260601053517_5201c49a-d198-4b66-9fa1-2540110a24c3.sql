CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

ALTER FUNCTION public.has_role(uuid, public.app_role) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users create own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users create their own deposit requests" ON public.deposits;
DROP POLICY IF EXISTS "Users view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can view their own deposits only" ON public.deposits;
DROP POLICY IF EXISTS "Admins manage deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can view and update all deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can update all deposits" ON public.deposits;

CREATE POLICY "Users create their own deposit requests"
ON public.deposits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deposits only"
ON public.deposits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all deposits"
ON public.deposits
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_user uuid;
  d_amount numeric;
  d_status public.deposit_status;
  cents integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT user_id, amount_usd, status INTO d_user, d_amount, d_status
    FROM public.deposits
    WHERE id = _deposit_id
    FOR UPDATE;

  IF d_user IS NULL THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF d_status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN
    RETURN;
  END IF;

  cents := round(d_amount * 100);

  UPDATE public.deposits
  SET status = 'approved'::public.deposit_status,
      confirmed_at = now(),
      updated_at = now()
  WHERE id = _deposit_id;

  UPDATE public.profiles
  SET balance_cents = balance_cents + cents,
      total_earned_cents = total_earned_cents + cents,
      updated_at = now()
  WHERE id = d_user;

  INSERT INTO public.transactions (user_id, type, amount_cents, description, related_id)
  VALUES (d_user, 'deposit', cents, 'Deposit approved', _deposit_id);

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (d_user, 'Deposit approved', 'Your deposit of $' || d_amount || ' has been credited.', 'system', '/deposit');
END;
$$;

ALTER FUNCTION public.admin_approve_deposit(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_approve_deposit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_downline()
RETURNS TABLE(slot integer, referred_id uuid, full_name text, username text, avatar_url text, country text, balance_cents integer, total_deposit_cents bigint, joined_at timestamp with time zone, status text, bonus_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
              WHERE d.user_id = f.referred_id
                AND d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status)), 0) AS total_deposit_cents,
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

ALTER FUNCTION public.get_my_downline() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_downline() TO authenticated, service_role;