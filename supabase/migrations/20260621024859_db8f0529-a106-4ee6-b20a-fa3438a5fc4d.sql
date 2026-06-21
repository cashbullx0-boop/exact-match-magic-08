CREATE OR REPLACE FUNCTION public.check_daily_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  today_count integer;
  bonus_label text;
  already_paid boolean;
BEGIN
  SELECT COUNT(*) INTO today_count
  FROM public.referrals r
  WHERE r.referrer_id = NEW.referrer_id
    AND DATE(r.created_at) = CURRENT_DATE;

  IF today_count > 0 AND today_count % 10 = 0 THEN
    bonus_label := 'Same-day 10 referrals bonus (day ' || CURRENT_DATE || ', count ' || today_count || ')';

    SELECT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.user_id = NEW.referrer_id
        AND t.type = 'bonus'
        AND t.description = ('🎉 ' || bonus_label)
    ) INTO already_paid;

    IF NOT already_paid THEN
      UPDATE public.profiles
        SET balance_cents = balance_cents + 10000,
            total_earned_cents = total_earned_cents + 10000,
            updated_at = now()
        WHERE id = NEW.referrer_id;

      INSERT INTO public.transactions (user_id, type, amount_cents, description)
        VALUES (NEW.referrer_id, 'bonus', 10000, '🎉 ' || bonus_label);

      INSERT INTO public.notifications (user_id, title, body, type)
        VALUES (
          NEW.referrer_id,
          '🎉 Referral Bonus Unlocked!',
          'Congratulations! You referred 10 people today and earned an extra $100 bonus!',
          'bonus'
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;