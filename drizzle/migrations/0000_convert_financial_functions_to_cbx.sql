CREATE OR REPLACE FUNCTION public.admin_approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  is_first boolean;
  referrer uuid;
  ref_cents integer;
  bonus_cents integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d.status IN ('approved'::public.deposit_status, 'completed'::public.deposit_status) THEN RETURN; END IF;
  IF d.status NOT IN ('pending'::public.deposit_status, 'confirming'::public.deposit_status) THEN RAISE EXCEPTION 'Deposit cannot be approved in its current state'; END IF;
  IF nullif(btrim(d.slip_path), '') IS NULL THEN RAISE EXCEPTION 'Payment slip is required before approval'; END IF;
  IF nullif(btrim(d.tx_hash), '') IS NULL THEN RAISE EXCEPTION 'Transaction hash is required before approval'; END IF;
  SELECT NOT EXISTS (SELECT 1 FROM public.deposits WHERE user_id=d.user_id AND status IN ('approved','completed') AND id<>d.id) INTO is_first;
  UPDATE public.deposits SET status='completed', confirmed_at=coalesce(confirmed_at,now()), updated_at=now() WHERE id=d.id;
  UPDATE public.profiles SET balance_cents=balance_cents+round(d.amount_usd*400)::integer, updated_at=now() WHERE id=d.user_id;
  INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id)
  SELECT d.user_id,'deposit',round(d.amount_usd*400)::integer,'USDT deposit converted to CBX',d.id
  WHERE NOT EXISTS (SELECT 1 FROM public.transactions WHERE related_id=d.id AND type='deposit');
  IF is_first THEN
    bonus_cents:=public.first_deposit_bonus_cents(d.amount_usd);
    IF bonus_cents>0 THEN
      UPDATE public.profiles SET balance_cents=balance_cents+bonus_cents,total_earned_cents=total_earned_cents+bonus_cents,updated_at=now() WHERE id=d.user_id;
      INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id)
      SELECT d.user_id,'bonus',bonus_cents,'🎁 First deposit reward',d.id
      WHERE NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id=d.user_id AND description='🎁 First deposit reward');
    END IF;
    SELECT referred_by INTO referrer FROM public.profiles WHERE id=d.user_id;
    ref_cents:=public.referral_reward_cents(now());
    IF referrer IS NOT NULL AND ref_cents>0 AND NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id=referrer AND related_id=d.user_id AND description LIKE '🎁 Referral first-deposit reward%') THEN
      UPDATE public.profiles SET balance_cents=balance_cents+ref_cents,total_earned_cents=total_earned_cents+ref_cents,updated_at=now() WHERE id=referrer;
      INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id) VALUES(referrer,'bonus',ref_cents,'🎁 Referral first-deposit reward',d.user_id);
    END IF;
  END IF;
END;$function$;

CREATE OR REPLACE FUNCTION public.first_deposit_bonus_cents(_amount_usd numeric) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$ SELECT CASE WHEN _amount_usd>=50 THEN 2000 ELSE 0 END $function$;
CREATE OR REPLACE FUNCTION public.referral_reward_cents(_ts timestamptz DEFAULT now()) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$ SELECT 2000 $function$;

CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount_cents integer,_network text,_wallet_address text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid(); bal integer; addr text:=btrim(coalesce(_wallet_address,'')); net public.withdrawal_network; new_id uuid; otp_ok boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF public.is_maintenance_mode() AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'CashBullX is currently under maintenance. Please try again shortly.'; END IF;
 IF _amount_cents IS NULL OR _amount_cents<4000 THEN RAISE EXCEPTION 'Minimum withdrawal is 40 CBX'; END IF;
 IF _amount_cents>1000000000 THEN RAISE EXCEPTION 'Amount too large'; END IF;
 IF _network NOT IN ('TRC20','BEP20','ERC20') THEN RAISE EXCEPTION 'Invalid network'; END IF;
 net:=_network::public.withdrawal_network;
 IF length(addr)<20 OR length(addr)>128 OR addr!~'^[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Invalid wallet address'; END IF;
 SELECT public.check_withdrawal_otp_complete(uid) INTO otp_ok; IF NOT otp_ok THEN RAISE EXCEPTION 'Withdrawal OTP not verified'; END IF;
 SELECT balance_cents INTO bal FROM public.profiles WHERE id=uid FOR UPDATE; IF bal IS NULL OR bal<_amount_cents THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
 PERFORM set_config('app.bypass_profile_guard','on',true);
 UPDATE public.profiles SET balance_cents=balance_cents-_amount_cents,updated_at=now() WHERE id=uid;
 PERFORM set_config('app.bypass_profile_guard','off',true);
 INSERT INTO public.withdrawals(user_id,amount_cents,network,wallet_address) VALUES(uid,_amount_cents,net,addr) RETURNING id INTO new_id;
 DELETE FROM public.withdrawal_otps WHERE user_id=uid AND email_verified=true AND phone_verified=true;
 INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id) VALUES(uid,'withdrawal',-_amount_cents,'Withdrawal request ('||_network||')',new_id);
 INSERT INTO public.notifications(user_id,title,body,type,link) VALUES(uid,'Withdrawal requested','Your withdrawal of '||(_amount_cents/100.0)::text||' CBX ('||(_amount_cents/400.0)::text||' USDT) is pending review.','system','/wallet');
 RETURN new_id;
END;$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(_id uuid,_notes text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user uuid;v_status public.withdrawal_status;v_amt integer;
BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only';END IF; SELECT user_id,status,amount_cents INTO v_user,v_status,v_amt FROM public.withdrawals WHERE id=_id FOR UPDATE; IF v_user IS NULL THEN RAISE EXCEPTION 'Withdrawal not found';END IF;IF v_status<>'pending' THEN RAISE EXCEPTION 'Withdrawal already finalized';END IF; UPDATE public.withdrawals SET status='approved',admin_notes=_notes,updated_at=now() WHERE id=_id; INSERT INTO public.notifications(user_id,title,body,type,link) VALUES(v_user,'Withdrawal approved','Your withdrawal of '||(v_amt/100.0)::text||' CBX is approved; payout value is '||(v_amt/400.0)::text||' USDT.','system','/wallet'); END;$function$;
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(_id uuid,_tx_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_user uuid;v_status public.withdrawal_status;v_amt integer;
BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only';END IF; SELECT user_id,status,amount_cents INTO v_user,v_status,v_amt FROM public.withdrawals WHERE id=_id FOR UPDATE; IF v_user IS NULL THEN RAISE EXCEPTION 'Withdrawal not found';END IF;IF v_status NOT IN('pending','approved') THEN RAISE EXCEPTION 'Withdrawal already finalized';END IF; UPDATE public.withdrawals SET status='paid',tx_hash=_tx_hash,processed_at=now(),updated_at=now() WHERE id=_id; INSERT INTO public.notifications(user_id,title,body,type,link) VALUES(v_user,'Withdrawal paid','Your withdrawal payout of '||(v_amt/400.0)::text||' USDT has been sent.'||CASE WHEN _tx_hash IS NOT NULL THEN ' Tx: '||_tx_hash ELSE '' END,'system','/wallet'); END;$function$;

CREATE OR REPLACE FUNCTION public.open_roi_trade(_amount_cents integer,_duration_hours integer) RETURNS trades LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid();bal integer;profit_cents integer;current_day date;existing_today int;next_boundary_utc timestamptz;remaining interval;new_trade public.trades;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';END IF;
 IF public.is_maintenance_mode() AND NOT public.has_role(uid,'admin') THEN RAISE EXCEPTION 'CashBullX is currently under maintenance. Please try again shortly.';END IF;
 IF _amount_cents IS NULL OR _amount_cents<4000 THEN RAISE EXCEPTION 'Minimum trade amount is 40 CBX';END IF;
 IF _amount_cents%4000<>0 THEN RAISE EXCEPTION 'Amount must be in multiples of 40 CBX (40, 80, 120...)';END IF;
 IF _duration_hours NOT IN(4,8,12) THEN RAISE EXCEPTION 'Invalid duration. Choose 4, 8 or 12 hours';END IF;
 current_day:=((now() AT TIME ZONE 'Europe/London')-interval '4 hours')::date;
 SELECT count(*) INTO existing_today FROM public.trades WHERE user_id=uid AND (((created_at AT TIME ZONE 'Europe/London')-interval '4 hours')::date)=current_day;
 IF existing_today>0 THEN next_boundary_utc:=((current_day+1)::timestamp+interval '4 hours') AT TIME ZONE 'Europe/London';remaining:=next_boundary_utc-now();RAISE EXCEPTION 'You can place your next trade in % hours % minutes (one trade per day, resets 4:00 AM UK time).',extract(hour from remaining)::int,extract(minute from remaining)::int;END IF;
 SELECT balance_cents INTO bal FROM public.profiles WHERE id=uid FOR UPDATE;IF bal IS NULL OR bal<_amount_cents THEN RAISE EXCEPTION 'Insufficient wallet balance';END IF;
 profit_cents:=floor(_amount_cents*0.02)::integer;
 PERFORM set_config('app.bypass_profile_guard','on',true);UPDATE public.profiles SET balance_cents=balance_cents-_amount_cents,updated_at=now() WHERE id=uid;PERFORM set_config('app.bypass_profile_guard','off',true);
 INSERT INTO public.trades(user_id,amount_cents,status,duration_hours,profit_rate,profit_amount_cents,expires_at) VALUES(uid,_amount_cents,'active',_duration_hours,0.02,profit_cents,now()+make_interval(hours=>_duration_hours)) RETURNING * INTO new_trade;
 INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id) VALUES(uid,'withdrawal',-_amount_cents,'Investment opened ('||_duration_hours||'h, 2% ROI)',new_trade.id);
 RETURN new_trade;
END;$function$;

CREATE OR REPLACE FUNCTION public.create_investment(_asset text,_asset_name text,_amount_cents integer,_entry_price numeric) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid();has_deposit boolean;bal integer;new_id uuid;dup_count integer;
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';END IF;IF _amount_cents<20000 THEN RAISE EXCEPTION 'Minimum investment is 200 CBX';END IF;IF _asset NOT IN('XAU','BTC','ETH','WTI') THEN RAISE EXCEPTION 'Invalid asset';END IF;SELECT count(*) INTO dup_count FROM public.investments WHERE user_id=uid AND asset=_asset AND status='active';IF dup_count>0 THEN RAISE EXCEPTION 'You already have an active investment at this level';END IF;SELECT EXISTS(SELECT 1 FROM public.deposits WHERE user_id=uid AND status IN('approved','completed')) INTO has_deposit;IF NOT has_deposit THEN RAISE EXCEPTION 'Approved deposit required';END IF;SELECT balance_cents INTO bal FROM public.profiles WHERE id=uid FOR UPDATE;IF bal IS NULL OR bal<_amount_cents THEN RAISE EXCEPTION 'Insufficient balance';END IF;PERFORM set_config('app.bypass_profile_guard','on',true);UPDATE public.profiles SET balance_cents=balance_cents-_amount_cents,updated_at=now() WHERE id=uid;PERFORM set_config('app.bypass_profile_guard','off',true);INSERT INTO public.investments(user_id,asset,asset_name,amount_cents,entry_price) VALUES(uid,_asset,_asset_name,_amount_cents,coalesce(_entry_price,0)) RETURNING id INTO new_id;INSERT INTO public.transactions(user_id,type,amount_cents,description,related_id) VALUES(uid,'withdrawal',-_amount_cents,'Investment in '||_asset_name,new_id);RETURN new_id;END;$function$;

CREATE OR REPLACE FUNCTION public.claim_daily_checkin() RETURNS TABLE(streak_day integer,reward_cents integer,xp_gain integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid();v_last date;v_streak integer;v_new_streak integer;v_reward integer;v_xp_gain integer;v_yesterday date:=CURRENT_DATE-1;v_profile_xp integer;
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated';END IF;SELECT last_checkin_date,coalesce(current_streak,0),xp INTO v_last,v_streak,v_profile_xp FROM public.profiles WHERE id=uid FOR UPDATE;IF v_last=CURRENT_DATE THEN RAISE EXCEPTION 'Already checked in today';END IF;v_new_streak:=CASE WHEN v_last=v_yesterday THEN v_streak+1 ELSE 1 END;v_reward:=LEAST(200+(v_new_streak-1)*40,800);v_xp_gain:=20+v_new_streak*5;INSERT INTO public.daily_checkins(user_id,checkin_date,reward_cents,streak_day) VALUES(uid,CURRENT_DATE,v_reward,v_new_streak);PERFORM set_config('app.bypass_profile_guard','on',true);UPDATE public.profiles SET balance_cents=balance_cents+v_reward,total_earned_cents=total_earned_cents+v_reward,current_streak=v_new_streak,longest_streak=GREATEST(coalesce(longest_streak,0),v_new_streak),last_checkin_date=CURRENT_DATE,xp=v_profile_xp+v_xp_gain,level=(v_profile_xp+v_xp_gain)/500+1,updated_at=now() WHERE id=uid;PERFORM set_config('app.bypass_profile_guard','off',true);INSERT INTO public.transactions(user_id,type,amount_cents,description) VALUES(uid,'task_reward',v_reward,'Daily check-in (day '||v_new_streak||')');RETURN QUERY SELECT v_new_streak,v_reward,v_xp_gain;END;$function$;
CREATE OR REPLACE FUNCTION public.daily_checkins_guard_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_last_date date;v_streak integer;v_new_streak integer;v_yesterday date:=CURRENT_DATE-1;
BEGIN IF public.has_role(auth.uid(),'admin') THEN RETURN NEW;END IF;NEW.user_id:=auth.uid();NEW.checkin_date:=CURRENT_DATE;NEW.created_at:=now();SELECT last_checkin_date,coalesce(current_streak,0) INTO v_last_date,v_streak FROM public.profiles WHERE id=auth.uid();IF v_last_date=CURRENT_DATE THEN RAISE EXCEPTION 'Already checked in today';END IF;v_new_streak:=CASE WHEN v_last_date=v_yesterday THEN v_streak+1 ELSE 1 END;NEW.streak_day:=v_new_streak;NEW.reward_cents:=LEAST(200+(v_new_streak-1)*40,800);RETURN NEW;END;$function$;

CREATE OR REPLACE FUNCTION public.check_daily_referral_bonus() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE today_count integer;bonus_label text;already_paid boolean;
BEGIN SELECT count(*) INTO today_count FROM public.referrals r WHERE r.referrer_id=NEW.referrer_id AND date(r.created_at)=CURRENT_DATE;IF today_count>0 AND today_count%10=0 THEN bonus_label:='Same-day 10 referrals bonus (day '||CURRENT_DATE||', count '||today_count||')';SELECT EXISTS(SELECT 1 FROM public.transactions t WHERE t.user_id=NEW.referrer_id AND t.type='bonus' AND t.description=('🎉 '||bonus_label)) INTO already_paid;IF NOT already_paid THEN UPDATE public.profiles SET balance_cents=balance_cents+40000,total_earned_cents=total_earned_cents+40000,updated_at=now() WHERE id=NEW.referrer_id;INSERT INTO public.transactions(user_id,type,amount_cents,description) VALUES(NEW.referrer_id,'bonus',40000,'🎉 '||bonus_label);INSERT INTO public.notifications(user_id,title,body,type) VALUES(NEW.referrer_id,'🎉 Referral Bonus Unlocked!','Congratulations! You referred 10 people today and earned an extra 400 CBX bonus!','bonus');END IF;END IF;RETURN NEW;END;$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_referral_challenge() RETURNS TABLE(total_direct_last_7d integer,deposited_last_7d integer,target integer,reward_cents integer,last_claim_at timestamptz,next_eligible_at timestamptz,can_claim boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE uid uuid:=auth.uid();v_start timestamptz;v_end timestamptz;total_n int:=0;dep_n int:=0;last_claim timestamptz;
BEGIN IF uid IS NULL THEN RETURN;END IF;SELECT window_start,window_end INTO v_start,v_end FROM public._current_referral_challenge_window();SELECT count(*) INTO total_n FROM public.profiles p WHERE p.referred_by=uid AND p.created_at>=v_start AND p.created_at<v_end;SELECT count(DISTINCT p.id) INTO dep_n FROM public.profiles p WHERE p.referred_by=uid AND p.created_at>=v_start AND p.created_at<v_end AND EXISTS(SELECT 1 FROM public.deposits d WHERE d.user_id=p.id AND d.status IN('approved','completed') AND d.created_at>=v_start AND d.created_at<v_end);SELECT max(awarded_at) INTO last_claim FROM public.weekly_referral_rewards WHERE user_id=uid AND window_start=v_start;IF dep_n>=10 AND last_claim IS NULL THEN PERFORM public.try_claim_weekly_referral_bonus(uid);SELECT max(awarded_at) INTO last_claim FROM public.weekly_referral_rewards WHERE user_id=uid AND window_start=v_start;END IF;RETURN QUERY SELECT total_n,dep_n,10,20000,last_claim,v_end,false;END;$function$;
CREATE OR REPLACE FUNCTION public.try_claim_weekly_referral_bonus(p_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_start timestamptz;v_end timestamptz;dep_n int:=0;
BEGIN IF p_user_id IS NULL THEN RETURN false;END IF;SELECT window_start,window_end INTO v_start,v_end FROM public._current_referral_challenge_window();IF EXISTS(SELECT 1 FROM public.weekly_referral_rewards WHERE user_id=p_user_id AND window_start=v_start) THEN RETURN false;END IF;SELECT count(DISTINCT p.id) INTO dep_n FROM public.profiles p WHERE p.referred_by=p_user_id AND p.created_at>=v_start AND p.created_at<v_end AND EXISTS(SELECT 1 FROM public.deposits d WHERE d.user_id=p.id AND d.status IN('approved','completed') AND d.created_at>=v_start AND d.created_at<v_end);IF dep_n<10 THEN RETURN false;END IF;PERFORM set_config('app.bypass_profile_guard','on',true);UPDATE public.profiles SET balance_cents=balance_cents+20000,total_earned_cents=total_earned_cents+20000,updated_at=now() WHERE id=p_user_id;PERFORM set_config('app.bypass_profile_guard','off',true);INSERT INTO public.transactions(user_id,type,amount_cents,description) VALUES(p_user_id,'bonus',20000,'🚀 Daily Referral Challenge — 10 depositing referrals reward');INSERT INTO public.weekly_referral_rewards(user_id,window_start,window_end,qualifying_referral_count,amount_cents) VALUES(p_user_id,v_start,v_end,dep_n,20000);BEGIN INSERT INTO public.notifications(user_id,title,body,type) VALUES(p_user_id,'🎉 Daily Challenge Complete!','You earned 200 CBX for bringing 10 depositing referrals today!','bonus');EXCEPTION WHEN OTHERS THEN NULL;END;RETURN true;END;$function$;