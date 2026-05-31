
REVOKE ALL ON FUNCTION public.admin_approve_deposit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_deposit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;
