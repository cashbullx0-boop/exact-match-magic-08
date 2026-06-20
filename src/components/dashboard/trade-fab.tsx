import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, X, Wallet, Loader2, Clock, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { openRoiTrade, listTrades } from "@/lib/trades.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Trade = {
  id: string;
  user_id: string;
  amount_cents: number;
  duration_hours: number;
  profit_rate: number;
  profit_amount_cents: number;
  expires_at: string;
  settled_at: string | null;
  status: string;
  created_at: string;
};

const DURATIONS = [
  { hours: 4, label: "4 Hours", rate: 0.02, rateLabel: "+2% ROI", desc: "Fast", icon: Zap },
  { hours: 8, label: "8 Hours", rate: 0.02, rateLabel: "+2% ROI", desc: "Mid", icon: Clock },
  { hours: 12, label: "12 Hours", rate: 0.02, rateLabel: "+2% ROI", desc: "Long", icon: TrendingUp },
] as const;

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function useExpiryTimer(trade: Trade | null, onElapsed: () => void) {
  const [label, setLabel] = useState("--:--:--");
  const [under5, setUnder5] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!trade || trade.status !== "active" || !trade.expires_at) {
      setLabel("--:--:--");
      firedRef.current = false;
      return;
    }
    firedRef.current = false;
    let stop = false;
    const tick = () => {
      if (stop) return;
      const diff = new Date(trade.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Settling…");
        setUnder5(false);
        if (!firedRef.current) {
          firedRef.current = true;
          onElapsed();
        }
        return;
      }
      setUnder5(diff < 5 * 60 * 1000);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [trade?.id, trade?.expires_at, trade?.status, onElapsed]);

  return { label, under5 };
}

export function TradeFab() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [duration, setDuration] = useState<4 | 8 | 12>(4);
  const [placing, setPlacing] = useState(false);

  const { profile, user, refreshProfile } = useAuth();
  const qc = useQueryClient();

  // Realtime: when the server-side cron credits profit, balance changes on profiles.
  // Show a toast and refresh local data without requiring the user to be on this page.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { type?: string; amount_cents?: number } | null;
          if (row?.type === "profit" && typeof row.amount_cents === "number" && row.amount_cents > 0) {
            toast.success(`✅ +${fmt(row.amount_cents)} profit added to wallet!`);
          }
          refreshProfile();
          qc.invalidateQueries({ queryKey: ["trades", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-trade-fab", handler);
    return () => window.removeEventListener("open-trade-fab", handler);
  }, []);

  const openFn = useServerFn(openRoiTrade);
  const listFn = useServerFn(listTrades);

  const tradesQuery = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const activeTrade = (tradesQuery.data?.active?.[0] ?? null) as Trade | null;
  const balanceCents = profile?.balance_cents ?? 0;
  const cooldownInitial = tradesQuery.data?.cooldown_seconds ?? 0;

  // Live-decrementing cooldown
  const [cooldownSec, setCooldownSec] = useState(cooldownInitial);
  useEffect(() => { setCooldownSec(cooldownInitial); }, [cooldownInitial]);
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownSec > 0]);

  const cooldownLabel = (() => {
    const s = cooldownSec;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  })();

  const amountNum = parseFloat(amount) || 0;
  const amountCents = Math.round(amountNum * 100);
  const selectedDuration = DURATIONS.find((d) => d.hours === duration)!;
  const profitPreviewCents = Math.floor(amountCents * selectedDuration.rate);

  const amountError =
    amountCents < 5000
      ? "Minimum trade amount is $50"
      : amountCents % 1000 !== 0
      ? "Amount must be in multiples of $10 (50, 60, 70...)"
      : amountCents > balanceCents
      ? "Insufficient wallet balance"
      : null;

  const blockedReason =
    activeTrade
      ? "You have an active trade running"
      : cooldownSec > 0
      ? `Next trade in ${cooldownLabel}`
      : amountError;

  const refresh = async () => {
    await refreshProfile();
    await tradesQuery.refetch();
    qc.invalidateQueries();
  };

  const handlePlace = async () => {
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    setPlacing(true);
    try {
      await openFn({ data: { amount_cents: amountCents, duration_hours: duration } });
      toast.success(`Trade started: ${duration}h, +${(selectedDuration.rate * 100).toFixed(0)}% ROI`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place trade");
    } finally {
      setPlacing(false);
    }
  };

  // When the local timer hits zero, give the cron a few seconds, then refetch.
  const handleElapsed = useMemo(
    () => () => {
      const poll = (attempt = 0) => {
        if (attempt > 12) return;
        setTimeout(async () => {
          await refresh();
          const after = (await tradesQuery.refetch()).data;
          const stillActive = after?.active?.some((t: any) => t.id === activeTrade?.id);
          if (stillActive) poll(attempt + 1);
        }, 5000);
      };
      poll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTrade?.id]
  );

  const { label: cycleLabel, under5 } = useExpiryTimer(activeTrade, handleElapsed);

  return (
    <>
      {/* FAB — centered on mobile bottom nav */}
      <div
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open trading panel"
          className="pointer-events-auto h-16 w-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 ring-1 ring-amber-300/50"
          style={{
            background: "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)",
            boxShadow:
              "0 0 20px rgba(245, 158, 11, 0.6), 0 18px 38px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <span className="text-[16px] font-bold tracking-[0.12em] text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>
            CBX
          </span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full md:max-w-lg bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">CBX Trade</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Balance */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Wallet balance
                </span>
                <span className="font-mono font-semibold">{fmt(balanceCents)}</span>
              </div>

              {activeTrade ? (
                <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Active Trade</span>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                      {activeTrade.duration_hours}h · +{(activeTrade.profit_rate * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-mono font-semibold">{fmt(activeTrade.amount_cents)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Profit / cycle</div>
                      <div className="font-mono font-semibold text-emerald-500">+{fmt(activeTrade.profit_amount_cents)}</div>
                    </div>
                  </div>

                  <div className="text-center py-2">
                    <div className="text-xs text-muted-foreground mb-1">Next profit in</div>
                    <div
                      className={`font-mono text-3xl font-bold tabular-nums ${
                        under5 ? "text-emerald-400" : "text-foreground"
                      }`}
                    >
                      {cycleLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">Expected profit</div>
                      <div className="font-mono font-semibold text-emerald-500">+{fmt(activeTrade.profit_amount_cents)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Payout on completion</div>
                      <div className="font-mono font-semibold">{fmt(activeTrade.amount_cents + activeTrade.profit_amount_cents)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Completes after {activeTrade.duration_hours}h (one-time)
                  </div>
                </div>
              ) : (
                <>
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Trade amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={50}
                        step={10}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 font-mono"
                      />
                    </div>
                    {amountError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {amountError}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">Minimum $50, in multiples of $10.</p>
                  </div>

                  {/* Duration cards */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Duration</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DURATIONS.map((d) => {
                        const Icon = d.icon;
                        const selected = duration === d.hours;
                        return (
                          <button
                            key={d.hours}
                            type="button"
                            onClick={() => setDuration(d.hours as 4 | 8 | 12)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              selected
                                ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                                : "border-border bg-muted/30 hover:border-border/80"
                            }`}
                          >
                            <Icon className={`h-4 w-4 mb-1.5 ${selected ? "text-emerald-500" : "text-muted-foreground"}`} />
                            <div className="text-sm font-semibold">{d.label}</div>
                            <div className={`text-xs font-bold ${selected ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {d.rateLabel}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Profit preview */}
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <div className="text-xs text-muted-foreground mb-1">You will earn</div>
                    <div className="text-lg font-bold text-emerald-500 font-mono">
                      +{fmt(profitPreviewCents)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      after {duration} hours <span className="opacity-70">(one active trade at a time)</span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handlePlace}
                    disabled={placing || !!blockedReason}
                  >
                    {placing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : amountError ? (
                      amountError
                    ) : (
                      `Start Trade · ${fmt(amountCents)}`
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
