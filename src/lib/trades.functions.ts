import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Direction = "up" | "down";

const ALLOWED_DURATIONS = [60, 300, 900] as const;

export const openTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_cents: number; direction: Direction; duration_seconds: number }) => {
    if (!Number.isInteger(d.amount_cents) || d.amount_cents < 5000 || d.amount_cents > 100_000_00) {
      throw new Error("Minimum trade amount is $50");
    }
    if (d.direction !== "up" && d.direction !== "down") throw new Error("Invalid direction");
    if (!ALLOWED_DURATIONS.includes(d.duration_seconds as 60 | 300 | 900)) throw new Error("Invalid duration");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: trade, error } = await supabase.rpc("place_trade", {
      _amount_cents: data.amount_cents,
      _direction: data.direction,
      _duration_seconds: data.duration_seconds,
    });
    if (error) throw new Error(error.message);
    return { trade };
  });

export const settleTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { trade_id: string }) => {
    if (!d?.trade_id || typeof d.trade_id !== "string") throw new Error("Invalid trade_id");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: trade, error } = await supabase.rpc("settle_trade", { _trade_id: data.trade_id });
    if (error) throw new Error(error.message);
    return { trade };
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