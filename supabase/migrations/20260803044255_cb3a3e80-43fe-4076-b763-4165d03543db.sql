
DO $$
DECLARE v_user uuid := 'cdd3da1c-fc2e-4e7c-b70d-7b83d45d8c70';
        v_dup uuid := '6d5cbbd2-1dbb-4c81-8e82-b4aad9123d2b';
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
