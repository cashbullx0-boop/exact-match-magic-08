import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_HOURS = [4, 8, 12] as const;

export const openRoiTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount_cents: number; duration_hours: number }) => {
    if (!Number.isInteger(d.amount_cents) || d.amount_cents < 5000 || d.amount_cents > 100_000_00) {
      throw new Error("Minimum trade amount is $50");
    }
    if (d.amount_cents % 1000 !== 0) throw new Error("Amount must be a multiple of $10");
    if (!ALLOWED_HOURS.includes(d.duration_hours as 4 | 8 | 12)) throw new Error("Invalid duration");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: trade, error } = await supabase.rpc("open_roi_trade", {
      _amount_cents: data.amount_cents,
      _duration_hours: data.duration_hours,
    });
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
