CREATE OR REPLACE FUNCTION public.claim_referral_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_already_referred uuid;
  v_code text := btrim(coalesce(p_code, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF v_code = '' THEN
    RETURN false;
  END IF;

  SELECT referred_by INTO v_already_referred
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF v_already_referred IS NOT NULL THEN
    RETURN false;
  END IF;

  v_referrer_id := public.get_referrer_id_by_username_or_code(v_code);
  IF v_referrer_id IS NULL OR v_referrer_id = auth.uid() THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET referred_by = v_referrer_id,
        updated_at = now()
    WHERE id = auth.uid()
      AND referred_by IS NULL;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.referrals (referrer_id, referred_id, bonus_cents)
  VALUES (v_referrer_id, auth.uid(), 0)
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RAISE;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_referral_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.referrals_validate_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_referrer uuid;
BEGIN
  IF NEW.referrer_id IS NULL OR NEW.referred_id IS NULL OR NEW.referrer_id = NEW.referred_id THEN
    RAISE EXCEPTION 'Invalid referral link';
  END IF;

  SELECT referred_by INTO existing_referrer
  FROM public.profiles
  WHERE id = NEW.referred_id;

  IF existing_referrer IS NOT NULL AND existing_referrer <> NEW.referrer_id THEN
    RAISE EXCEPTION 'This user is already linked to another referrer';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS referrals_validate_link_trg ON public.referrals;
CREATE TRIGGER referrals_validate_link_trg
BEFORE INSERT OR UPDATE OF referrer_id, referred_id ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.referrals_validate_link();

CREATE OR REPLACE FUNCTION public.referrals_sync_profile_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  syncing text;
BEGIN
  BEGIN syncing := current_setting('app.syncing_referral', true); EXCEPTION WHEN OTHERS THEN syncing := NULL; END;
  IF syncing = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.syncing_referral', 'on', true);
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
    SET referred_by = NEW.referrer_id,
        updated_at = now()
    WHERE id = NEW.referred_id
      AND referred_by IS NULL;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  PERFORM set_config('app.syncing_referral', 'off', true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  PERFORM set_config('app.syncing_referral', 'off', true);
  RAISE;
END;
$function$;

DROP TRIGGER IF EXISTS referrals_sync_profile_link_trg ON public.referrals;
CREATE TRIGGER referrals_sync_profile_link_trg
AFTER INSERT OR UPDATE OF referrer_id, referred_id ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.referrals_sync_profile_link();

CREATE OR REPLACE FUNCTION public.profiles_sync_referral_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  syncing text;
BEGIN
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.referred_by = NEW.id THEN
    RAISE EXCEPTION 'A user cannot refer themself';
  END IF;

  BEGIN syncing := current_setting('app.syncing_referral', true); EXCEPTION WHEN OTHERS THEN syncing := NULL; END;
  IF syncing = 'on' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.syncing_referral', 'on', true);
  INSERT INTO public.referrals (referrer_id, referred_id, bonus_cents)
  VALUES (NEW.referred_by, NEW.id, 0)
  ON CONFLICT (referred_id) DO NOTHING;
  PERFORM set_config('app.syncing_referral', 'off', true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.syncing_referral', 'off', true);
  RAISE;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_sync_referral_row_trg ON public.profiles;
CREATE TRIGGER profiles_sync_referral_row_trg
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
WHEN (NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.profiles_sync_referral_row();

DROP FUNCTION IF EXISTS public.get_downline_level(integer, integer, integer);
DROP FUNCTION IF EXISTS public.get_downline_children(uuid);

CREATE OR REPLACE FUNCTION public.get_downline_summary()
RETURNS TABLE(level integer, count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, 1 AS lvl
      FROM public.profiles p
      WHERE p.referred_by = uid
    UNION ALL
    SELECT p.id, t.lvl + 1
      FROM public.profiles p
      JOIN tree t ON p.referred_by = t.id
      WHERE t.lvl < 6
  )
  SELECT t.lvl, COUNT(*)::bigint
  FROM tree t
  GROUP BY t.lvl
  ORDER BY t.lvl;
END $function$;

CREATE FUNCTION public.get_downline_level(_level integer, _limit integer DEFAULT 25, _offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  masked_email text,
  joined_at timestamp with time zone,
  referred_by uuid,
  referrer_name text,
  total_count bigint,
  balance_cents integer,
  status text,
  commission_cents bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  v_lvl int := GREATEST(1, LEAST(6, COALESCE(_level, 1)));
  v_lim int := GREATEST(1, LEAST(100, COALESCE(_limit, 25)));
  v_off int := GREATEST(0, COALESCE(_offset, 0));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, p.referred_by, p.full_name, p.created_at, p.balance_cents, p.status, 1 AS lvl
      FROM public.profiles p
      WHERE p.referred_by = uid
    UNION ALL
    SELECT p.id, p.referred_by, p.full_name, p.created_at, p.balance_cents, p.status, t.lvl + 1
      FROM public.profiles p
      JOIN tree t ON p.referred_by = t.id
      WHERE t.lvl < 6
  ),
  filtered AS (
    SELECT t.id, t.referred_by, t.full_name, t.created_at, t.balance_cents, t.status, t.lvl
    FROM tree t WHERE t.lvl = v_lvl
  ),
  counted AS (SELECT COUNT(*)::bigint AS c FROM filtered),
  comms AS (
    SELECT related_id, SUM(amount_cents)::bigint AS cents
    FROM public.transactions
    WHERE user_id = uid
      AND type = 'bonus'::public.txn_type
      AND description = ('⛓️ Level ' || v_lvl || ' downline trade commission')
    GROUP BY related_id
  ),
  user_comm AS (
    SELECT tr.user_id, COALESCE(SUM(c.cents), 0)::bigint AS cents
    FROM comms c
    JOIN public.trades tr ON tr.id = c.related_id
    GROUP BY tr.user_id
  )
  SELECT
    f.id,
    public._mask_identifier(COALESCE(NULLIF(f.full_name,''), split_part(COALESCE(au.email,''), '@', 1))),
    public._mask_identifier(au.email),
    f.created_at,
    f.referred_by,
    public._mask_identifier(COALESCE(NULLIF(rp.full_name,''), split_part(COALESCE(rau.email,''), '@', 1))),
    (SELECT c FROM counted),
    f.balance_cents,
    f.status,
    COALESCE(uc.cents, 0)::bigint
  FROM filtered f
  LEFT JOIN auth.users au ON au.id = f.id
  LEFT JOIN public.profiles rp ON rp.id = f.referred_by
  LEFT JOIN auth.users rau ON rau.id = f.referred_by
  LEFT JOIN user_comm uc ON uc.user_id = f.id
  ORDER BY f.created_at DESC
  LIMIT v_lim OFFSET v_off;
END $function$;

CREATE FUNCTION public.get_downline_children(_parent_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  masked_email text,
  joined_at timestamp with time zone,
  child_count bigint,
  balance_cents integer,
  status text,
  commission_cents bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  allowed boolean;
  parent_depth int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _parent_id IS NULL THEN RAISE EXCEPTION 'parent_id required'; END IF;

  IF _parent_id = uid THEN
    allowed := true;
    parent_depth := 0;
  ELSE
    WITH RECURSIVE tree AS (
      SELECT p.id, 1 AS lvl FROM public.profiles p WHERE p.referred_by = uid
      UNION ALL
      SELECT p.id, t.lvl + 1 FROM public.profiles p JOIN tree t ON p.referred_by = t.id WHERE t.lvl < 6
    )
    SELECT lvl INTO parent_depth FROM tree WHERE id = _parent_id LIMIT 1;
    allowed := parent_depth IS NOT NULL;
  END IF;

  IF NOT allowed THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF parent_depth >= 6 THEN RETURN; END IF;

  RETURN QUERY
  WITH child_rows AS (
    SELECT p.id, p.full_name, p.created_at, p.balance_cents, p.status, parent_depth + 1 AS lvl
    FROM public.profiles p
    WHERE p.referred_by = _parent_id
  ),
  comms AS (
    SELECT
      tr.user_id,
      NULLIF((regexp_match(t.description, '^⛓️ Level (\d+) '))[1], '')::int AS lvl,
      SUM(t.amount_cents)::bigint AS cents
    FROM public.transactions t
    JOIN public.trades tr ON tr.id = t.related_id
    WHERE t.user_id = uid
      AND t.type = 'bonus'::public.txn_type
      AND t.description LIKE '⛓️ Level%'
    GROUP BY tr.user_id, NULLIF((regexp_match(t.description, '^⛓️ Level (\d+) '))[1], '')::int
  )
  SELECT
    p.id,
    public._mask_identifier(COALESCE(NULLIF(p.full_name,''), split_part(COALESCE(au.email,''), '@', 1))),
    public._mask_identifier(au.email),
    p.created_at,
    (SELECT COUNT(*) FROM public.profiles cp WHERE cp.referred_by = p.id)::bigint,
    p.balance_cents,
    p.status,
    COALESCE(c.cents, 0)::bigint
  FROM child_rows p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN comms c ON c.user_id = p.id AND c.lvl = p.lvl
  ORDER BY p.created_at DESC;
END $function$;

GRANT EXECUTE ON FUNCTION public.get_downline_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_downline_level(integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_downline_children(uuid) TO authenticated;