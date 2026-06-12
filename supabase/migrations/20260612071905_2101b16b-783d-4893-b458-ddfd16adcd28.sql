-- Lock daily_checkins reward_cents and streak_day to server-calculated values.
CREATE OR REPLACE FUNCTION public.daily_checkins_guard_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_last_date date;
  v_streak integer;
  v_new_streak integer;
  v_yesterday date := (CURRENT_DATE - 1);
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Force ownership and date
  NEW.user_id := auth.uid();
  NEW.checkin_date := CURRENT_DATE;
  NEW.created_at := now();

  SELECT last_checkin_date, COALESCE(current_streak, 0)
    INTO v_last_date, v_streak
    FROM public.profiles
    WHERE id = auth.uid();

  IF v_last_date = CURRENT_DATE THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;

  IF v_last_date = v_yesterday THEN
    v_new_streak := v_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Server-enforced values (50c base + 10c per streak day, capped at 200c)
  NEW.streak_day := v_new_streak;
  NEW.reward_cents := LEAST(50 + (v_new_streak - 1) * 10, 200);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS daily_checkins_guard_insert_trg ON public.daily_checkins;
CREATE TRIGGER daily_checkins_guard_insert_trg
  BEFORE INSERT ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.daily_checkins_guard_insert();