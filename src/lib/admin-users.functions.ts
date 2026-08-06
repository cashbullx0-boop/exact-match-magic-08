import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUserIdentity = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
};

/** Admin-only: resolve display identity (email + account name) for user ids. */
export const listUserIdentities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userIds: string[] }) => {
    if (!data || !Array.isArray(data.userIds)) throw new Error("userIds required");
    return { userIds: data.userIds.filter((id) => typeof id === "string").slice(0, 500) };
  })
  .handler(async ({ context, data }): Promise<AdminUserIdentity[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Forbidden: admin only");

    const ids = Array.from(new Set(data.userIds));
    if (ids.length === 0) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", ids);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return await Promise.all(
      ids.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        const p = profileMap.get(uid);
        return {
          user_id: uid,
          email: u?.user?.email ?? null,
          full_name: p?.full_name ?? null,
          username: p?.username ?? null,
        };
      }),
    );
  });
