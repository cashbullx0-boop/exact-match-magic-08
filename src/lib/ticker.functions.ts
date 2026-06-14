import { createServerFn } from "@tanstack/react-start";

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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("user_id, type, amount_cents, created_at")
    .gt("amount_cents", 0)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !txs || txs.length === 0) return { events: [] as TickerEvent[] };

  const userIds = Array.from(new Set(txs.map((t) => t.user_id)));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Anonymize display name: first char + asterisks (e.g. "j***")
  const maskName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return "User";
    const first = trimmed[0];
    return first + "***";
  };

  const events: TickerEvent[] = txs.map((t) => {
    const p = profileMap.get(t.user_id);
    const rawName = p?.username || p?.full_name || "User";
    return {
      username: maskName(rawName),
      country: null,
      amount: t.amount_cents / 100,
      type: TYPE_LABEL[t.type as string] ?? String(t.type).replace(/_/g, " "),
      description: null,
    };
  });

  return { events };
});