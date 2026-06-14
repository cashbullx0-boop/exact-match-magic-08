REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_wallet_change(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_investment(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_investment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_daily_profits() TO authenticated;

GRANT EXECUTE ON FUNCTION public.attach_verified_phone(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_withdrawal_otp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_otp(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_downline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_trade(integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_okx_wallet(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_change(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_wallet_change(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit_slip(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_deposit_tx_hash(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_investment(text, text, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referrer_id_by_username_or_code(text) TO authenticated;