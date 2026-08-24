import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateTradeInput } from "./trades.constants";

export const openRoiTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateTradeInput)

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
    const { data: cdSec } = await supabase.rpc("trade_cooldown_seconds");
    return {
      active: active ?? [],
      history: history ?? [],
      cooldown_seconds: (cdSec as number | null) ?? 0,
    };
  });
