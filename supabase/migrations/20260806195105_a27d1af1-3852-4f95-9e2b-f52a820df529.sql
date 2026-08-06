-- Block ALL activity for suspended/banned accounts
CREATE OR REPLACE FUNCTION public.check_user_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_status TEXT;
  target_user UUID;
BEGIN
  target_user := NEW.user_id;
  IF target_user IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO user_status FROM public.profiles WHERE id = target_user;

  IF user_status = 'suspended' THEN
    RAISE EXCEPTION 'Your account is suspended. All activity is disabled. Please contact support.';
  ELSIF user_status = 'banned' THEN
    RAISE EXCEPTION 'Your account has been banned. All activity is disabled. Please contact support.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_user_status ON public.deposits;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.withdrawals;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.trades;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.investments;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.spins;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.spins
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.daily_checkins;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.task_completions;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();

DROP TRIGGER IF EXISTS trg_check_user_status ON public.wallet_change_requests;
CREATE TRIGGER trg_check_user_status BEFORE INSERT ON public.wallet_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_user_status();
