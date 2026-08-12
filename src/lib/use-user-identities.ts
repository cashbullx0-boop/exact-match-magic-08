import { useEffect, useMemo, useState } from "react";
import { listUserIdentities, type AdminUserIdentity } from "@/lib/admin-users.functions";

/**
 * Admin-only helper: resolves account name + email for a list of user ids.
 * Results are cached per session so repeated admin screens don't refetch.
 */
const cache = new Map<string, AdminUserIdentity>();

export function useUserIdentities(userIds: string[]) {
  const key = useMemo(() => Array.from(new Set(userIds)).sort().join(","), [userIds]);
  const [identities, setIdentities] = useState<Record<string, AdminUserIdentity>>({});

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) { setIdentities({}); return; }
    // Serve cached entries immediately, fetch only what's missing.
    const known = Object.fromEntries(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]));
    setIdentities(known);
    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listUserIdentities({ data: { userIds: missing } });
        rows.forEach((r) => cache.set(r.user_id, r));
        if (!cancelled) {
          setIdentities((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.user_id, r])) }));
        }
      } catch { /* identity lookup is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [key]);

  return identities;
}

export function identityName(i?: AdminUserIdentity, fallbackId?: string) {
  return i?.full_name || (i?.username ? `@${i.username}` : null) || (fallbackId ? `${fallbackId.slice(0, 8)}…` : "—");
}
