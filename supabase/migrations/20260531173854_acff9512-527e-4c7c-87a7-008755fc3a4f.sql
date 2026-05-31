
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.balance_cents := OLD.balance_cents;
  NEW.total_earned_cents := OLD.total_earned_cents;
  NEW.xp := OLD.xp;
  NEW.level := OLD.level;
  NEW.status := OLD.status;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.current_streak := OLD.current_streak;
  NEW.longest_streak := OLD.longest_streak;
  NEW.last_checkin_date := OLD.last_checkin_date;
  NEW.two_factor_enabled := OLD.two_factor_enabled;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.deposits_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.user_id := OLD.user_id;
  NEW.amount_usd := OLD.amount_usd;
  NEW.network := OLD.network;
  NEW.wallet_address := OLD.wallet_address;
  NEW.provider := OLD.provider;
  NEW.status := OLD.status;
  NEW.provider_payment_id := OLD.provider_payment_id;
  NEW.confirmations := OLD.confirmations;
  NEW.notes := OLD.notes;
  NEW.expires_at := OLD.expires_at;
  NEW.confirmed_at := OLD.confirmed_at;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deposits_guard_update ON public.deposits;
CREATE TRIGGER deposits_guard_update BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.deposits_guard_update();

DROP POLICY IF EXISTS "Users update own pending tx hash" ON public.deposits;
CREATE POLICY "Users update own pending tx hash" ON public.deposits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','confirming'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','confirming'));

CREATE OR REPLACE FUNCTION public.task_completions_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reward integer; v_active boolean;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  SELECT reward_cents, is_active INTO v_reward, v_active FROM public.tasks WHERE id = NEW.task_id;
  IF v_reward IS NULL OR NOT v_active THEN
    RAISE EXCEPTION 'Task not found or inactive';
  END IF;
  NEW.reward_cents := v_reward;
  NEW.status := 'pending'::completion_status;
  NEW.reviewed_at := NULL;
  NEW.created_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS task_completions_guard_insert ON public.task_completions;
CREATE TRIGGER task_completions_guard_insert BEFORE INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.task_completions_guard_insert();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deposits_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.task_completions_guard_insert() FROM PUBLIC, anon, authenticated;
