
-- Ensure has_role and related security-definer functions are executable by clients
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_referrer_id_by_code(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_referrer_id_by_username_or_code(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_referrer_public_info(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_self_notification(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_downline() TO authenticated, service_role;
