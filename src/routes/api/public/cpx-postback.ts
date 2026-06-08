import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";

export const Route = createFileRoute("/api/public/cpx-postback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const extUserId = url.searchParams.get("ext_user_id") ?? "";
        const rewardRaw = url.searchParams.get("reward") ?? "";
        const transId = url.searchParams.get("trans_id") ?? "";
        const status = url.searchParams.get("status") ?? "";
        const hash = url.searchParams.get("hash") ?? "";

        // Require server-side secret; reject all postbacks if not configured
        const securityKey = process.env.CPX_SECURITY_KEY;
        if (!securityKey) {
          console.error("[cpx-postback] CPX_SECURITY_KEY not configured");
          return new Response("OK", { status: 200 });
        }

        // Verify CPX hash: md5(ext_user_id + status + trans_id + ip + security_key)
        // CPX includes the requesting IP in the hash; use x-forwarded-for first hop.
        const xff = request.headers.get("x-forwarded-for") ?? "";
        const ip = xff.split(",")[0]?.trim() ?? "";
        const expected = createHash("md5")
          .update(extUserId + status + transId + ip + securityKey)
          .digest("hex");
        if (!hash || hash.toLowerCase() !== expected.toLowerCase()) {
          return new Response("INVALID", { status: 200 });
        }

        if (status !== "1") return new Response("OK", { status: 200 });

        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(extUserId)) return new Response("OK", { status: 200 });

        const reward = Number(rewardRaw);
        if (!Number.isFinite(reward) || reward <= 0 || reward > 10000) {
          return new Response("OK", { status: 200 });
        }
        if (!transId || transId.length > 128 || !/^[A-Za-z0-9_\-]+$/.test(transId)) {
          return new Response("OK", { status: 200 });
        }

        const cents = Math.round(reward * 100);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip if this trans_id was already credited
        const desc = `CPX Research reward (trans_id: ${transId})`;
        const { data: existing } = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("user_id", extUserId)
          .eq("description", desc)
          .maybeSingle();
        if (existing) return new Response("OK", { status: 200 });

        const { data: profile, error: pErr } = await supabaseAdmin
          .from("profiles")
          .select("balance_cents, total_earned_cents")
          .eq("id", extUserId)
          .maybeSingle();
        if (pErr || !profile) return new Response("OK", { status: 200 });

        await supabaseAdmin
          .from("profiles")
          .update({
            balance_cents: (profile.balance_cents ?? 0) + cents,
            total_earned_cents: (profile.total_earned_cents ?? 0) + cents,
            updated_at: new Date().toISOString(),
          })
          .eq("id", extUserId);

        await supabaseAdmin.from("transactions").insert({
          user_id: extUserId,
          type: "deposit",
          amount_cents: cents,
          description: desc,
        });

        await supabaseAdmin.from("notifications").insert({
          user_id: extUserId,
          title: "Reward credited",
          body: `You earned $${reward.toFixed(2)} from CPX Research.`,
          type: "system",
          link: "/wallet",
        });

        return new Response("OK", { status: 200 });
      },
    },
  },
});