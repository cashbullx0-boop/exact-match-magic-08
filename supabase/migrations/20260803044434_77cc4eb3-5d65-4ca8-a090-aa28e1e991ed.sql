
DO $$
DECLARE v_user uuid := 'c2ba7b27-b24f-489c-a36e-4d67646f4565';
        v_dup uuid := 'fbdd8a84-66ab-4b9e-a780-5b66177288cb';
BEGIN
  IF EXISTS (SELECT 1 FROM public.transactions WHERE id = v_dup) THEN
    PERFORM set_config('app.bypass_profile_guard','on', true);
    UPDATE public.profiles
      SET balance_cents = GREATEST(balance_cents - 500, 0),
          total_earned_cents = GREATEST(total_earned_cents - 500, 0),
          updated_at = now()
      WHERE id = v_user;
    PERFORM set_config('app.bypass_profile_guard','off', true);
    DELETE FROM public.transactions WHERE id = v_dup;
  END IF;
END $$;
