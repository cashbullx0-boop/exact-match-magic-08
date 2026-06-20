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
  referrer_id uuid;
  ref_value text;
BEGIN
  BEGIN
    display_name := COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    );

    LOOP
      new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
      attempt := attempt + 1;
      IF attempt > 8 THEN
        new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
        EXIT;
      END IF;
    END LOOP;

    ref_value := NULLIF(btrim(NEW.raw_user_meta_data->>'referral_code'), '');

    -- DEBUG: log raw referral_code from signup metadata
    RAISE LOG '[handle_new_user] user_id=% email=% raw_referral_code=%',
      NEW.id, NEW.email, ref_value;

    IF ref_value IS NOT NULL THEN
      referrer_id := public.get_referrer_id_by_username_or_code(ref_value);

      -- DEBUG: log resolved referrer_id (NULL = code did not match any user)
      RAISE LOG '[handle_new_user] user_id=% resolved referrer_id=% for ref_value=%',
        NEW.id, referrer_id, ref_value;

      IF referrer_id IS NULL THEN
        RAISE WARNING '[handle_new_user] referral_code "%" did not resolve to any referrer (user_id=%)',
          ref_value, NEW.id;
      END IF;
    ELSE
      RAISE LOG '[handle_new_user] user_id=% has no referral_code in metadata', NEW.id;
    END IF;

    INSERT INTO public.profiles (id, full_name, avatar_url, referral_code, referred_by)
    VALUES (NEW.id, display_name, NEW.raw_user_meta_data->>'avatar_url', new_code, referrer_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, bonus_cents)
      VALUES (referrer_id, NEW.id, 0)
      ON CONFLICT DO NOTHING;

      RAISE LOG '[handle_new_user] inserted referrals row referrer_id=% referred_id=%',
        referrer_id, NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: % / %', NEW.id, SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;