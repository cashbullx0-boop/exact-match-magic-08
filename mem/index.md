 # Project Memory
 
## Core
Never revoke EXECUTE on public-schema RPCs (e.g. get_referrer_public_info, get_referrer_id_by_username_or_code) from anon/authenticated during security fixes — frontend calls them via supabase.rpc(). Tighten security via RLS on tables and input validation inside the function instead. After any security migration, list every function whose GRANT/permission changed so the user can verify the frontend still works.

## Memories
- [TRC20 deposit address](mem://deposits/trc20-address) — Current live TRC20 (USDT) receiving wallet for deposits
