REVOKE ALL ON FUNCTION public.depositing_direct_referrals(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_balance_cap_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.depositing_direct_referrals(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_balance_cap_status() TO authenticated;