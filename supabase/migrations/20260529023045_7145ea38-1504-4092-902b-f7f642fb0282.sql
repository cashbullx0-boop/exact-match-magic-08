
-- 1. Restrict profiles SELECT: remove broad "referral lookup" policy
DROP POLICY IF EXISTS "Users can view profiles by referral lookup" ON public.profiles;

-- Provide a safe SECURITY DEFINER lookup that returns ONLY the referrer's id
CREATE OR REPLACE FUNCTION public.get_referrer_id_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE referral_code = _code LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_referrer_id_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referrer_id_by_code(text) TO anon, authenticated;

-- 2. Remove user-side insert on notifications (server/admin/trigger only)
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

-- Allow users to create notifications addressed to themselves only, via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_self_notification(_title text, _body text, _type text DEFAULT 'system', _link text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (uid, left(coalesce(_title,''), 200), left(coalesce(_body,''), 1000), coalesce(_type,'system'), _link)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_self_notification(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text) TO authenticated;

-- 3. Remove user-side insert on user_achievements (server/admin/trigger only)
DROP POLICY IF EXISTS "Users insert own achievements" ON public.user_achievements;

-- 4. Restrict has_role EXECUTE: only service_role needs it; RLS uses it via SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- 5. Tighten avatars bucket: remove broad public SELECT (prevents listing).
-- Public bucket URLs continue to work via the CDN without a SELECT policy.
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
