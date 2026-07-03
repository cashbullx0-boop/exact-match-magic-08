
CREATE OR REPLACE FUNCTION public.get_downline_level(_level int, _limit int DEFAULT 25, _offset int DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  masked_email text,
  joined_at timestamptz,
  referred_by uuid,
  referrer_name text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_lvl int := GREATEST(1, LEAST(6, COALESCE(_level, 1)));
  v_lim int := GREATEST(1, LEAST(100, COALESCE(_limit, 25)));
  v_off int := GREATEST(0, COALESCE(_offset, 0));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, p.referred_by, p.full_name, p.created_at, 1 AS lvl
      FROM public.profiles p
      WHERE p.referred_by = uid
    UNION ALL
    SELECT p.id, p.referred_by, p.full_name, p.created_at, t.lvl + 1
      FROM public.profiles p
      JOIN tree t ON p.referred_by = t.id
      WHERE t.lvl < 6
  ),
  filtered AS (
    SELECT t.id, t.referred_by, t.full_name, t.created_at
    FROM tree t WHERE t.lvl = v_lvl
  ),
  counted AS ( SELECT COUNT(*)::bigint AS c FROM filtered )
  SELECT
    f.id,
    public._mask_identifier(COALESCE(NULLIF(f.full_name,''), split_part(COALESCE(au.email,''), '@', 1))),
    public._mask_identifier(au.email),
    f.created_at,
    f.referred_by,
    public._mask_identifier(COALESCE(NULLIF(rp.full_name,''), split_part(COALESCE(rau.email,''), '@', 1))),
    (SELECT c FROM counted)
  FROM filtered f
  LEFT JOIN auth.users au ON au.id = f.id
  LEFT JOIN public.profiles rp ON rp.id = f.referred_by
  LEFT JOIN auth.users rau ON rau.id = f.referred_by
  ORDER BY f.created_at DESC
  LIMIT v_lim OFFSET v_off;
END $$;
