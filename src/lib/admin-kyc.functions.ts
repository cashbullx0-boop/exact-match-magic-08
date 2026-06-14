import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listKycSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;
    // Verify admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Forbidden: admin only");
    }

    const { data: subs, error } = await supabaseAdmin
      .from("kyc_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
    const emailMap: Record<string, string> = {};
    await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailMap[uid] = data.user.email;
      }),
    );

    return (subs ?? []).map((s) => ({ ...s, email: emailMap[s.user_id] ?? null }));
  });