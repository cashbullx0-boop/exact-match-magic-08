import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, X, Wallet, Loader2, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { openTrade, settleTrade, listTrades } from "@/lib/trades.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const SYMBOLS = [
  { symbol: "BTC", name: "Bitcoin", base: 68240 },
  { symbol: "ETH", name: "Ethereum", base: 3540 },
  { symbol: "USDT", name: "Tether", base: 1.0 },
] as const;

const DURATIONS = [
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
] as const;

type LivePrice = { symbol: string; name: string; base: number; price: number; change: number };

function useFakeLivePrices() {
  const [prices, setPrices] = useState<LivePrice[]>(() =>
    SYMBOLS.map((s) => ({ symbol: s.symbol, name: s.name, base: s.base, price: s.base, change: 0 }))
  );
  useEffect(() => {
    const tick = () => {
      setPrices((prev) =>
        prev.map((p) => {
          const drift = p.symbol === "USDT" ? 0.0008 : 0.012;
          const delta = (Math.random() - 0.5) * 2 * drift;
          const next = Math.max(p.base * 0.9, p.price * (1 + delta));
          return { ...p, price: next, change: ((next - p.base) / p.base) * 100 };
        })
      );
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);
  return prices;
}

function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const firedRef = useRef(false);
  useEffect(() => {
    if (remaining <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire();
    }
  }, [remaining, onExpire]);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return <span className="font-mono tabular-nums">{m}:{s.toString().padStart(2, "0")}</span>;
}

export function TradeFab() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [duration, setDuration] = useState<60 | 300 | 900>(60);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC");
  const [placing, setPlacing] = useState(false);

  const { profile, user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const prices = useFakeLivePrices();

  const openFn = useServerFn(openTrade);
  const settleFn = useServerFn(settleTrade);
  const listFn = useServerFn(listTrades);

  const tradesQuery = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: () => listFn(),
    enabled: !!user && open,
    refetchInterval: open ? 5000 : false,
  });

  const balanceCents = profile?.balance_cents ?? 0;

  const refresh = async () => {
    await refreshProfile();
    qc.invalidateQueries();
  };

  const handlePlace = async () => {
    const amt = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amt) || amt < 100) {
      toast.error("Minimum trade is $1");
      return;
    }
    if (amt > balanceCents) {
      toast.error("Insufficient balance");
      return;
    }
    setPlacing(true);
    try {
      await openFn({ data: { amount_cents: amt, direction, duration_seconds: duration } });
      toast.success(`Trade placed: ${direction.toUpperCase()} ${duration}s`);
      await tradesQuery.refetch();
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place trade");
    } finally {
      setPlacing(false);
    }
  };

  const handleSettle = async (id: string) => {
    try {
      const res = await settleFn({ data: { trade_id: id } });
      const t = (res as any)?.trade;
      if (t?.result === "win") toast.success(`Trade WON +$${((t.profit_cents ?? 0) / 100).toFixed(2)}`);
      else if (t?.result === "loss") toast.error(`Trade LOST -$${((t.amount_cents ?? 0) / 100).toFixed(2)}`);
      await tradesQuery.refetch();
      await refresh();
    } catch (e) {
      // not yet expired or transient; ignore
    }
  };

  const selectedPrice = useMemo(
    () => prices.find((p) => p.symbol === selectedSymbol) ?? prices[0],
    [prices, selectedSymbol]
  );

  return (
    <>
      {/* FAB — centered on mobile bottom nav */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open trading panel"
        className="md:hidden fixed bottom-7 left-1/2 -translate-x-1/2 z-50 h-16 w-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #F59E0B 0%, #FFD24A 50%, #B8860B 100%)",
          boxShadow:
            "0 0 24px rgba(245,158,11,0.55), 0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
          border: "2px solid rgba(255, 215, 100, 0.6)",
        }}
      >
        <Wallet className="h-7 w-7 text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-primary/30 p-5 animate-float-up"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--background)) 0%, rgba(20,14,4,0.98) 100%)",
              boxShadow: "0 -12px 48px rgba(245,158,11,0.25), 0 0 0 1px rgba(245,158,11,0.18)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#F59E0B,#B8860B)" }}
                >
                  <Wallet className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#F59E0B" }}>
                    Quick Trade
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Balance: ${(balanceCents / 100).toFixed(2)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Live prices */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {prices.map((p) => {
                const active = selectedSymbol === p.symbol;
                const up = p.change >= 0;
                return (
                  <button
                    key={p.symbol}
                    onClick={() => setSelectedSymbol(p.symbol)}
                    className={`rounded-xl p-2 text-left border transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                        : "border-border/50 bg-white/5 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: active ? "#FFD24A" : undefined }}>
                        {p.symbol}
                      </span>
                      <span className={`text-[10px] font-mono ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? "▲" : "▼"} {Math.abs(p.change).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm font-mono tabular-nums mt-0.5">
                      ${p.price < 10 ? p.price.toFixed(4) : p.price.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live · trading {selectedPrice?.symbol} @ $
              {selectedPrice && (selectedPrice.price < 10 ? selectedPrice.price.toFixed(4) : selectedPrice.price.toFixed(2))}
            </div>

            {/* Amount */}
            <label className="text-xs text-muted-foreground">Amount (USD)</label>
            <div className="flex gap-2 mt-1 mb-3">
              <Input
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background/60 border-primary/30"
              />
              {[10, 50, 100].map((v) => (
                <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                  ${v}
                </Button>
              ))}
            </div>

            {/* Direction */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setDirection("up")}
                className={`rounded-xl py-3 flex items-center justify-center gap-2 font-bold border-2 transition-all ${
                  direction === "up"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.4)]"
                    : "border-border/50 text-muted-foreground hover:border-emerald-400/40"
                }`}
              >
                <TrendingUp className="h-4 w-4" /> UP
              </button>
              <button
                onClick={() => setDirection("down")}
                className={`rounded-xl py-3 flex items-center justify-center gap-2 font-bold border-2 transition-all ${
                  direction === "down"
                    ? "bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_18px_rgba(239,68,68,0.4)]"
                    : "border-border/50 text-muted-foreground hover:border-red-400/40"
                }`}
              >
                <TrendingDown className="h-4 w-4" /> DOWN
              </button>
            </div>

            {/* Duration */}
            <label className="text-xs text-muted-foreground">Duration</label>
            <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value as 60 | 300 | 900)}
                  className={`rounded-xl py-2 text-sm border-2 transition-all ${
                    duration === d.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <Button
              onClick={handlePlace}
              disabled={placing}
              className="w-full h-12 text-base font-bold text-black"
              style={{
                background: "linear-gradient(135deg,#FFD24A 0%,#F59E0B 50%,#B8860B 100%)",
                boxShadow: "0 8px 24px rgba(245,158,11,0.4)",
              }}
            >
              {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Trade · ${parseFloat(amount || "0").toFixed(2)}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Win returns original + 85% profit. 50/50 outcome.
            </p>

            {/* Active trades */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#F59E0B" }}>
                Active Trades
              </h3>
              {(tradesQuery.data?.active ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No active trades.</p>
              ) : (
                <div className="space-y-2">
                  {tradesQuery.data!.active.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-primary/20 bg-white/5 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {t.direction === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">${(t.amount_cents / 100).toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{t.direction} · {t.duration_seconds}s</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: "#FFD24A" }}>
                          <Countdown expiresAt={t.expires_at} onExpire={() => handleSettle(t.id)} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#F59E0B" }}>
                Trade History
              </h3>
              {(tradesQuery.data?.history ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No trades yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {tradesQuery.data!.history.map((t: any) => {
                    const won = t.result === "win";
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-white/[0.03] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {won ? (
                            <Trophy className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          )}
                          <div>
                            <div className="text-sm">${(t.amount_cents / 100).toFixed(2)}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">
                              {t.direction} · {t.duration_seconds}s
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-mono ${won ? "text-emerald-400" : "text-red-400"}`}>
                            {won ? "+" : ""}${((t.profit_cents ?? 0) / 100).toFixed(2)}
                          </span>
                          <Badge
                            className={
                              won
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-red-500/20 text-red-300 border-red-500/40"
                            }
                          >
                            {won ? "WIN" : "LOSS"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}