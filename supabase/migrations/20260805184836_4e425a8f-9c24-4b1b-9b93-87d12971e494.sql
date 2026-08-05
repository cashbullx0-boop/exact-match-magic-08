REVOKE EXECUTE ON FUNCTION public.submit_deposit_sender_address(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_deposit_slip(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_deposit_tx_hash(uuid, text) FROM anon;