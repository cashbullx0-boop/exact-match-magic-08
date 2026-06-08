import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Direction = "up" | "down";

const ALLOWED_DURATIONS = [60, 300, 900] as const;

export const openTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_cents: number; direction: Direction; duration_seconds: number }) => {
    if (!Number.isInteger(d.amount_cents) || d.amount_cents < 100 || d.amount_cents > 100_000_00) {
      throw new Error("Amount must be between $1 and $100,000");
    }
    if (d.direction !== "up" && d.direction !== "down") throw new Error("Invalid direction");
    if (!ALLOWED_DURATIONS.includes(d.duration_seconds as 60 | 300 | 900)) throw new Error("Invalid duration");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("balance_cents").eq("id", userId).single();
    if (pErr || !profile) throw new Error("Profile not found");
    if ((profile.balance_cents ?? 0) < data.amount_cents) throw new Error("Insufficient balance");

    const newBal = (profile.balance_cents ?? 0) - data.amount_cents;
    const { error: uErr } = await supabaseAdmin
      .from("profiles").update({ balance_cents: newBal, updated_at: new Date().toISOString() }).eq("id", userId);
    if (uErr) throw new Error("Failed to deduct balance");

    const expiresAt = new Date(Date.now() + data.duration_seconds * 1000).toISOString();
    const { data: trade, error: tErr } = await supabaseAdmin
      .from("trades")
      .insert({
        user_id: userId,
        amount_cents: data.amount_cents,
        direction: data.direction,
        duration_seconds: data.duration_seconds,
        status: "active",
        expires_at: expiresAt,
      })
      .select("*").single();
    if (tErr || !trade) {
      // refund on failure
      await supabaseAdmin.from("profiles").update({ balance_cents: profile.balance_cents }).eq("id", userId);
      throw new Error("Failed to open trade");
    }

    await supabaseAdmin.from("transactions").insert({
      user_id: userId, type: "withdrawal", amount_cents: -data.amount_cents,
      description: `Trade opened (${data.direction.toUpperCase()} ${data.duration_seconds}s)`,
      related_id: trade.id,
    });

    return { trade, balance_cents: newBal };
  });

export const settleTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trade_id: string }) => {
    if (!d?.trade_id || typeof d.trade_id !== "string") throw new Error("Invalid trade_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: trade, error } = await supabaseAdmin
      .from("trades").select("*").eq("id", data.trade_id).eq("user_id", userId).single();
    if (error || !trade) throw new Error("Trade not found");
    if (trade.status !== "active") return { trade, balance_cents: null };
    if (new Date(trade.expires_at).getTime() > Date.now()) throw new Error("Trade not yet expired");

    const won = Math.random() < 0.5;
    const profit = won ? Math.floor(trade.amount_cents * 0.85) : 0;
    const credit = won ? trade.amount_cents + profit : 0;

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("balance_cents,total_earned_cents").eq("id", userId).single();
    const newBal = (prof?.balance_cents ?? 0) + credit;
    const newEarned = (prof?.total_earned_cents ?? 0) + profit;

    await supabaseAdmin.from("profiles").update({
      balance_cents: newBal,
      total_earned_cents: newEarned,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);

    const { data: updated } = await supabaseAdmin.from("trades").update({
      status: "settled",
      result: won ? "win" : "loss",
      profit_cents: won ? profit : -trade.amount_cents,
    }).eq("id", trade.id).select("*").single();

    if (credit > 0) {
      await supabaseAdmin.from("transactions").insert({
        user_id: userId, type: "deposit", amount_cents: credit,
        description: `Trade win payout (+$${(profit / 100).toFixed(2)} profit)`,
        related_id: trade.id,
      });
    }

    return { trade: updated ?? trade, balance_cents: newBal };
  });

export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: active } = await supabase
      .from("trades").select("*").eq("user_id", userId).eq("status", "active")
      .order("created_at", { ascending: false });
    const { data: history } = await supabase
      .from("trades").select("*").eq("user_id", userId).neq("status", "active")
      .order("created_at", { ascending: false }).limit(10);
    return { active: active ?? [], history: history ?? [] };
  });