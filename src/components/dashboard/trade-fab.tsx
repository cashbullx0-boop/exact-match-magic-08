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

const HISTORY_LEN = 60;

function CrispPriceChart({
  history,
  up,
  active,
  height = 140,
}: {
  history: number[];
  up: boolean;
  active: boolean;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cssWidth, setCssWidth] = useState(0);

  // Track container width; resize canvas backing store via DPR for crispness
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setCssWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssWidth <= 0) return;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const w = cssWidth;
    const h = height;
    // Resize backing store only when needed (avoids flicker)
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = history.length > 1 ? history : [history[0] ?? 0, history[0] ?? 0];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || Math.max(Math.abs(max) * 0.001, 0.0001);
    const padY = 10;
    const innerH = h - padY * 2;
    const stepX = w / Math.max(1, data.length - 1);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = Math.round((h / 4) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const color = up ? "#10b981" : "#ef4444";
    const colorSoft = up ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)";
    const colorFaint = up ? "rgba(16,185,129,0)" : "rgba(239,68,68,0)";

    // Build smooth path
    const pts = data.map((v, i) => ({
      x: i * stepX,
      y: padY + innerH - ((v - min) / range) * innerH,
    }));

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colorSoft);
    grad.addColorStop(1, colorFaint);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, cx, (p0.y + p1.y) / 2);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.lineTo(pts[pts.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line (smooth)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, cx, (p0.y + p1.y) / 2);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = color;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Last-point dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colorSoft;
    ctx.fill();
  }, [history, up, cssWidth, height]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="block" />
      {active && (
        <div className="pointer-events-none absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
          Live trade
        </div>
      )}
    </div>
  );
}

function useFakeLivePrices() {
  const [prices, setPrices] = useState<LivePrice[]>(() =>
    SYMBOLS.map((s) => ({ symbol: s.symbol, name: s.name, base: s.base, price: s.base, change: 0 }))
  );
  const [histories, setHistories] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(SYMBOLS.map((s) => [s.symbol, Array(HISTORY_LEN).fill(s.base)]))
  );
  useEffect(() => {
    const tick = () => {
      setPrices((prev) => {
        const next = prev.map((p) => {
          const drift = p.symbol === "USDT" ? 0.0008 : 0.012;
          const delta = (Math.random() - 0.5) * 2 * drift;
          const nextPrice = Math.max(p.base * 0.9, p.price * (1 + delta));
          return { ...p, price: nextPrice, change: ((nextPrice - p.base) / p.base) * 100 };
        });
        setHistories((h) => {
          const out: Record<string, number[]> = { ...h };
          for (const p of next) {
            const arr = h[p.symbol] ?? [];
            out[p.symbol] = [...arr, p.price].slice(-HISTORY_LEN);
          }
          return out;
        });
        return next;
      });
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { prices, histories };
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

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-trade-fab", handler);
    return () => window.removeEventListener("open-trade-fab", handler);
  }, []);
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
  const hasActiveTrade = (tradesQuery.data?.active ?? []).length > 0;
  const amountCents = Math.round((parseFloat(amount) || 0) * 100);
  const insufficient = amountCents > balanceCents;
  const belowMin = amountCents < 100;
  const disabledReason = hasActiveTrade
    ? "You have an active trade. Please wait for it to complete"
    : insufficient
    ? "Insufficient balance"
    : belowMin
    ? "Minimum trade is $1"
    : null;

  const refresh = async () => {
    await refreshProfile();
    qc.invalidateQueries();
  };

  const handlePlace = async () => {
    const amt = amountCents;
    if (hasActiveTrade) {
      toast.error("You have an active trade. Please wait for it to complete");
      return;
    }
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
      <div className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none"
           style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open CBX trading panel"
          className="pointer-events-auto h-16 w-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 ring-1 ring-amber-300/50"
          style={{
            background:
              "linear-gradient(135deg,#F59E0B 0%,#D97706 100%)",
            boxShadow:
              "0 0 20px rgba(245, 158, 11, 0.6), 0 18px 38px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <span
            className="text-[16px] font-bold tracking-[0.12em] text-white"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
          >
            CBX
          </span>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-white/[0.06] p-6 md:p-7 animate-float-up"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, rgba(245,158,11,0.08) 0%, transparent 60%), linear-gradient(180deg, #0c0d12 0%, #08090d 100%)",
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center ring-1 ring-white/10"
                  style={{
                    background: "linear-gradient(135deg,#F59E0B,#B8860B)",
                    boxShadow: "0 8px 20px -6px rgba(245,158,11,0.55)",
                  }}
                >
                  <Wallet className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Quick Trade</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Balance <span className="font-mono tabular-nums text-foreground/90">${(balanceCents / 100).toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="rounded-full text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Live prices */}
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Markets</div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {prices.map((p) => {
                const active = selectedSymbol === p.symbol;
                const up = p.change >= 0;
                return (
                  <button
                    key={p.symbol}
                    onClick={() => setSelectedSymbol(p.symbol)}
                    className={`rounded-xl p-3 text-left border transition-all ${
                      active
                        ? "border-primary/60 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_24px_-12px_rgba(245,158,11,0.4)]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold tracking-wide ${active ? "text-primary" : "text-foreground/90"}`}>
                        {p.symbol}
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? "▲" : "▼"} {Math.abs(p.change).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm font-mono tabular-nums mt-1 text-foreground">
                      ${p.price < 10 ? p.price.toFixed(4) : p.price.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-muted-foreground mb-5 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="uppercase tracking-wider text-emerald-400/90 font-semibold">Live</span>
              <span>·</span>
              <span>{selectedPrice?.symbol} @</span>
              <span className="font-mono tabular-nums text-foreground/90">
                ${selectedPrice && (selectedPrice.price < 10 ? selectedPrice.price.toFixed(4) : selectedPrice.price.toFixed(2))}
              </span>
            </div>

            {/* Amount */}
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Amount (USD)</label>
            <div className="flex gap-2 mt-2 mb-4">
              <Input
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 bg-white/[0.03] border-white/10 focus-visible:border-primary/60 focus-visible:ring-0 font-mono tabular-nums text-base"
              />
              {[10, 50, 100].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(v))}
                  className="h-11 px-3 bg-white/[0.02] border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-foreground/80"
                >
                  ${v}
                </Button>
              ))}
            </div>

            {/* Direction */}
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Direction</label>
            <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
              <button
                onClick={() => setDirection("up")}
                className={`rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide border transition-all ${
                  direction === "up"
                    ? "bg-emerald-500/[0.12] border-emerald-400/60 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_10px_28px_-14px_rgba(16,185,129,0.5)]"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-emerald-400/30 hover:text-emerald-300/80"
                }`}
              >
                <TrendingUp className="h-4 w-4" /> UP
              </button>
              <button
                onClick={() => setDirection("down")}
                className={`rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold tracking-wide border transition-all ${
                  direction === "down"
                    ? "bg-red-500/[0.12] border-red-400/60 text-red-300 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_10px_28px_-14px_rgba(239,68,68,0.5)]"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-red-400/30 hover:text-red-300/80"
                }`}
              >
                <TrendingDown className="h-4 w-4" /> DOWN
              </button>
            </div>

            {/* Duration */}
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Duration</label>
            <div className="grid grid-cols-3 gap-2 mt-2 mb-5">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value as 60 | 300 | 900)}
                  className={`rounded-xl py-2.5 text-sm font-medium border transition-all ${
                    duration === d.value
                      ? "border-primary/60 bg-primary/[0.10] text-primary shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <Button
              onClick={handlePlace}
              disabled={placing || !!disabledReason}
              className="w-full h-12 text-sm font-semibold tracking-wide text-black rounded-xl"
              style={{
                background: "linear-gradient(135deg,#FFD24A 0%,#F59E0B 50%,#B8860B 100%)",
                boxShadow: "0 14px 32px -10px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              {placing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {disabledReason ?? <>Place Trade · <span className="font-mono tabular-nums">${parseFloat(amount || "0").toFixed(2)}</span></>}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-3 tracking-wide">
              Every trade wins · Returns original + 85% profit
            </p>

            <div className="h-px bg-white/[0.06] my-6" />

            {/* Active trades */}
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
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
                        <span className="text-sm font-semibold text-emerald-400">
                          <Countdown expiresAt={t.expires_at} onExpire={() => handleSettle(t.id)} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
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