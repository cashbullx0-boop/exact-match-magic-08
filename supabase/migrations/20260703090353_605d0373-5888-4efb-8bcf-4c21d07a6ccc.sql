
-- Indexes for recursive traversal performance
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- Mask helper: keep first 3 chars, mask the rest of local part; preserve domain suffix if present
CREATE OR REPLACE FUNCTION public._mask_identifier(_val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _val IS NULL OR length(_val) = 0 THEN 'User'
    WHEN position('@' in _val) > 0 THEN
      substr(split_part(_val,'@',1), 1, 3) || '***@' || split_part(_val,'@',2)
    WHEN length(_val) <= 3 THEN substr(_val,1,1) || '***'
    ELSE substr(_val,1,3) || '***'
  END
$$;

-- Summary: counts per level for auth.uid()
CREATE OR REPLACE FUNCTION public.get_downline_summary()
RETURNS TABLE(level int, count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
END $$;

-- One level paginated
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
  lvl int := GREATEST(1, LEAST(6, COALESCE(_level, 1)));
  lim int := GREATEST(1, LEAST(100, COALESCE(_limit, 25)));
  off int := GREATEST(0, COALESCE(_offset, 0));
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
  at_level AS (
    SELECT * FROM tree WHERE lvl = lvl
  ),
  filtered AS (
    SELECT t.id, t.referred_by, t.full_name, t.created_at
    FROM tree t WHERE t.lvl = lvl
  ),
  counted AS (
    SELECT (SELECT COUNT(*) FROM filtered) AS c
  )
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
  LIMIT lim OFFSET off;
END $$;

-- Direct children of a node, only if node is caller OR inside caller's 6-level downline
CREATE OR REPLACE FUNCTION public.get_downline_children(_parent_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  masked_email text,
  joined_at timestamptz,
  child_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Only return children while still within 6 levels total from caller
  IF parent_depth >= 6 THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id,
    public._mask_identifier(COALESCE(NULLIF(p.full_name,''), split_part(COALESCE(au.email,''), '@', 1))),
    public._mask_identifier(au.email),
    p.created_at,
    (SELECT COUNT(*) FROM public.profiles cp WHERE cp.referred_by = p.id)::bigint
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE p.referred_by = _parent_id
  ORDER BY p.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_downline_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_downline_level(int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_downline_children(uuid) TO authenticated;
