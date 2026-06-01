import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TickerEvent = {
  username: string;
  country: string | null;
  amount: number;
  type: string;
  description: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  task_reward: "Task Reward",
  referral_bonus: "Referral Bonus",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  bonus: "Bonus",
  checkin: "Daily Check-in",
  adjustment: "Adjustment",
};

export const getRecentEarnings = createServerFn({ method: "GET" }).handler(async () => {
  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("user_id, type, amount_cents, description, created_at")
    .gt("amount_cents", 0)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !txs || txs.length === 0) return { events: [] as TickerEvent[] };

  const userIds = Array.from(new Set(txs.map((t) => t.user_id)));
  const [{ data: profiles }, { data: kycs }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, username, full_name").in("id", userIds),
    supabaseAdmin.from("kyc_submissions").select("user_id, country, submitted_at").in("user_id", userIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const countryMap = new Map<string, string>();
  for (const k of kycs ?? []) {
    if (!countryMap.has(k.user_id) && k.country) countryMap.set(k.user_id, k.country);
  }

  const events: TickerEvent[] = txs.map((t) => {
    const p = profileMap.get(t.user_id);
    const rawName = p?.username || p?.full_name || "User";
    const username = rawName.length > 18 ? rawName.slice(0, 18) : rawName;
    return {
      username,
      country: countryMap.get(t.user_id) ?? null,
      amount: t.amount_cents / 100,
      type: TYPE_LABEL[t.type as string] ?? String(t.type).replace(/_/g, " "),
      description: t.description,
    };
  });

  return { events };
});