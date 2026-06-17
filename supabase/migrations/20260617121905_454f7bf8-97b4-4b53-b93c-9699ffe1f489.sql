
-- Harden handle_new_user and (re)attach trigger on auth.users.
-- Root cause: the AFTER INSERT trigger on auth.users was missing, so no
-- profiles row was created for some signups, which silently broke balance
-- credits (UPDATE ... WHERE id = uid matched zero rows).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  attempt int := 0;
  display_name text;
BEGIN
  -- Never block auth signup: wrap everything and log on failure.
  BEGIN
    display_name := COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    );

    -- Generate a unique referral_code; retry on the rare collision.
    LOOP
      new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
      attempt := attempt + 1;
      IF attempt > 8 THEN
        -- Last resort: longer code, effectively collision-free.
        new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
        EXIT;
      END IF;
    END LOOP;

    INSERT INTO public.profiles (id, full_name, avatar_url, referral_code)
    VALUES (NEW.id, display_name, NEW.raw_user_meta_data->>'avatar_url', new_code)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: % / %', NEW.id, SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- (Re)create the trigger. DROP first in case a stale broken one exists.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any users still missing a profile (idempotent).
INSERT INTO public.profiles (id, full_name, referral_code)
SELECT
  u.id,
  COALESCE(
    NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'User'
  ),
  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill missing user_roles too.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
