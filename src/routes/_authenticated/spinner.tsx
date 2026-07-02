import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Coins, Info, X, Wallet, Ticket, Clock, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/spinner")({
  component: SpinnerPage,
});

// Wheel segments (cents). Alternating premium palette; order defines wheel position.
const SEGMENTS: { cents: number; label: string; from: string; to: string }[] = [
  { cents: 0,   label: "$0",    from: "#1e293b", to: "#0f172a" },
  { cents: 25,  label: "$0.25", from: "#0ea5e9", to: "#0369a1" },
  { cents: 50,  label: "$0.50", from: "#8b5cf6", to: "#6d28d9" },
  { cents: 100, label: "$1",    from: "#f59e0b", to: "#b45309" },
  { cents: 0,   label: "$0",    from: "#334155", to: "#1e293b" },
  { cents: 25,  label: "$0.25", from: "#06b6d4", to: "#0e7490" },
  { cents: 50,  label: "$0.50", from: "#a855f7", to: "#7e22ce" },
  { cents: 500, label: "$5",    from: "#ef4444", to: "#991b1b" },
];
const SEG_ANGLE = 360 / SEGMENTS.length;
const MAX_SPINS_PER_DAY = 5;
const SPIN_COST_CENTS = 100;

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// London "trading day" boundary at 4:00 AM Europe/London.
function londonSpinDateKey(d = new Date()): string {
  // Take current London time components, subtract 4h, use ISO date.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d).reduce<Record<string,string>>((a,p)=>{a[p.type]=p.value;return a;},{});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const shifted = new Date(asUtc - 4 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function SpinnerPage() {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinsToday, setSpinsToday] = useState(0);
  const [lastResult, setLastResult] = useState<{ cents: number; won: boolean } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState("");

  const balanceCents = profile?.balance_cents ?? 0;
  const spinsRemaining = Math.max(0, MAX_SPINS_PER_DAY - spinsToday);
  const insufficient = balanceCents < SPIN_COST_CENTS;
  const disabled = spinning || spinsRemaining <= 0 || insufficient;

  const loadSpins = async () => {
    if (!user) return;
    const key = londonSpinDateKey();
    const { count } = await supabase
      .from("spins" as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("spin_date", key);
    setSpinsToday(count ?? 0);
  };

  useEffect(() => { loadSpins(); }, [user?.id]);

  // Countdown to next 4am London
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Compute next 4am London as UTC ms.
      const londonNowStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", year:"numeric", month:"2-digit", day:"2-digit",
        hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false,
      }).formatToParts(now).reduce<Record<string,string>>((a,p)=>{a[p.type]=p.value;return a;},{});
      const lHour = +londonNowStr.hour;
      const addDays = lHour >= 4 ? 1 : 0;
      // Build target date string in London for next 4am
      const target = new Date(Date.UTC(+londonNowStr.year, +londonNowStr.month-1, +londonNowStr.day + addDays, 4, 0, 0));
      // Approximate: London offset (0 or 1). Compute offset from difference.
      const londonAsUtc = Date.UTC(+londonNowStr.year, +londonNowStr.month-1, +londonNowStr.day, lHour, +londonNowStr.minute, +londonNowStr.second);
      const offsetMs = londonAsUtc - now.getTime();
      const diff = target.getTime() - now.getTime() - offsetMs;
      const h = Math.max(0, Math.floor(diff / 3600000));
      const m = Math.max(0, Math.floor((diff % 3600000) / 60000));
      const s = Math.max(0, Math.floor((diff % 60000) / 1000));
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fireConfetti = () => {
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 200);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 200);
  };

  const handleSpin = async () => {
    if (disabled) return;
    setSpinning(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.rpc("perform_spin" as any);
      if (error) throw error;
      const result = data as { reward_cents: number; spins_remaining: number; won: boolean };

      // Find target segment index matching reward_cents
      const candidates = SEGMENTS
        .map((s, i) => ({ s, i }))
        .filter((x) => x.s.cents === result.reward_cents);
      const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? { i: 0 };

      // Wheel pointer at top (0deg). Center each segment under pointer.
      const targetAngle = 360 - (pick.i * SEG_ANGLE + SEG_ANGLE / 2);
      const spins = 6; // full revolutions
      const finalRotation = rotation - (rotation % 360) + spins * 360 + targetAngle;
      setRotation(finalRotation);

      // Wait for animation
      await new Promise((r) => setTimeout(r, 2800));

      setLastResult({ cents: result.reward_cents, won: result.won });
      setModalOpen(true);
      if (result.won) fireConfetti();

      // Refresh state
      await Promise.all([loadSpins(), refreshProfile?.()]);
    } catch (e: any) {
      const msg = e?.message ?? "Something went wrong";
      if (/limit/i.test(msg)) toast.error("Daily spin limit reached (5/day)");
      else if (/insufficient|balance/i.test(msg)) toast.error("Insufficient balance");
      else toast.error(msg);
    } finally {
      setSpinning(false);
    }
  };

  // Build SVG wedge paths once
  const wedges = useMemo(() => {
    const R = 200;
    const cx = 200, cy = 200;
    const toXY = (deg: number, r = R) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
    };
    return SEGMENTS.map((seg, i) => {
      const start = i * SEG_ANGLE;
      const end = start + SEG_ANGLE;
      const [x1, y1] = toXY(start);
      const [x2, y2] = toXY(end);
      const largeArc = SEG_ANGLE > 180 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const mid = start + SEG_ANGLE / 2;
      const [lx, ly] = toXY(mid, R * 0.68);
      return { d, seg, i, mid, lx, ly };
    });
  }, []);

  return (
    <div className="relative mx-auto max-w-3xl space-y-8 pb-10">
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-[520px] -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-16 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-widest text-amber-300">
          <Trophy className="h-3.5 w-3.5" /> Daily Rewards
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Lucky Spinner
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Spin the wheel of fortune — win up to <span className="text-amber-300 font-semibold">$5</span> instantly to your wallet.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={<Ticket className="h-4 w-4" />} label="Spins Left" value={`${spinsRemaining}/${MAX_SPINS_PER_DAY}`} accent="text-primary" />
        <StatTile icon={<Wallet className="h-4 w-4" />} label="Balance" value={fmt(balanceCents)} />
        <StatTile icon={<Coins className="h-4 w-4" />} label="Cost / Spin" value="$1.00" accent="text-amber-300" />
      </div>

      {/* Wheel */}
      <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center">
        {/* Pointer */}
        <div className="relative z-30 -mb-3">
          <div className="relative flex flex-col items-center">
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[26px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_4px_10px_rgba(251,191,36,0.9)]" />
            <div className="mt-[-6px] h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
          </div>
        </div>

        <div className={`relative aspect-square w-full max-w-[380px] transition ${disabled ? "opacity-60 saturate-50" : ""}`}>
          {/* Glow ring */}
          <div aria-hidden className="absolute -inset-3 rounded-full bg-gradient-to-tr from-amber-400/40 via-fuchsia-500/30 to-cyan-400/30 blur-2xl opacity-70" />

          {/* Outer bezel */}
          <div className="relative h-full w-full rounded-full p-[6px] bg-gradient-to-br from-white/20 via-white/5 to-white/20 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]">
            <div className="relative h-full w-full rounded-full p-[3px] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-background">
                <motion.svg
                  viewBox="0 0 400 400"
                  className="h-full w-full"
                  animate={{ rotate: rotation }}
                  transition={{ duration: 2.8, ease: [0.17, 0.67, 0.2, 0.99] }}
                >
                  <defs>
                    {wedges.map((w) => (
                      <linearGradient key={`g-${w.i}`} id={`seg-${w.i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={w.seg.from} />
                        <stop offset="100%" stopColor={w.seg.to} />
                      </linearGradient>
                    ))}
                  </defs>
                  {wedges.map((w) => (
                    <g key={w.i}>
                      <path d={w.d} fill={`url(#seg-${w.i})`} stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
                      <g transform={`translate(${w.lx} ${w.ly}) rotate(${w.mid})`}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={w.seg.cents === 500 ? 24 : 18}
                          fontWeight={900}
                          fill="#fff"
                          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
                        >
                          {w.seg.label}
                        </text>
                      </g>
                    </g>
                  ))}
                  {/* Decorative dots on rim */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    const a = (i * 360) / 24;
                    const rad = ((a - 90) * Math.PI) / 180;
                    const x = 200 + 192 * Math.cos(rad);
                    const y = 200 + 192 * Math.sin(rad);
                    return <circle key={i} cx={x} cy={y} r={2.5} fill="rgba(255,255,255,0.55)" />;
                  })}
                </motion.svg>
              </div>
            </div>
          </div>

          {/* Center hub with SPIN button */}
          <button
            onClick={handleSpin}
            disabled={disabled}
            className="group absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 h-24 w-24 md:h-28 md:w-28 rounded-full border-4 border-background bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-black font-black shadow-[0_0_40px_rgba(251,191,36,0.55),inset_0_-6px_10px_rgba(0,0,0,0.25),inset_0_6px_10px_rgba(255,255,255,0.35)] transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex flex-col items-center justify-center leading-tight">
              <span className={`text-lg tracking-wider ${spinning ? "animate-pulse" : ""}`}>
                {spinning ? "…" : "SPIN"}
              </span>
              {!spinning && <span className="mt-0.5 text-[10px] font-bold opacity-70">$1</span>}
            </span>
          </button>
        </div>

        {/* Disabled state message */}
        {(spinsRemaining === 0 || insufficient) && !spinning && (
          <div className="mt-6 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-200">
            {insufficient
              ? "Insufficient balance — deposit or earn $1 to spin."
              : "You've used all spins. Come back tomorrow!"}
          </div>
        )}
      </div>

      {/* Prize legend */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { label: "$0", cls: "bg-slate-700/50 text-slate-300 border-slate-600/50" },
          { label: "$0.25", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
          { label: "$0.50", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
          { label: "$1", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
          { label: "$5 🏆", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
        ].map((p) => (
          <span key={p.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${p.cls}`}>
            {p.label}
          </span>
        ))}
      </div>

      {/* Rules */}
      <Card className="glass border-border/60 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4 text-primary" /> How it works
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> Resets in <span className="font-mono text-foreground">{countdown}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Rule>$1 per spin, up to 5 spins daily</Rule>
            <Rule>Rewards credited instantly to your wallet</Rule>
            <Rule>Resets daily at 4:00 AM UK time</Rule>
            <Rule>Prizes: $0, $0.25, $0.50, $1 or $5</Rule>
          </div>
        </CardContent>
      </Card>

      {/* Result modal */}
      <AnimatePresence>
        {modalOpen && lastResult && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border/60 bg-background/95 p-6 text-center shadow-2xl"
              initial={{ scale: 0.85, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div aria-hidden className={`absolute inset-x-0 -top-24 h-48 blur-3xl ${lastResult.won ? "bg-amber-400/40" : "bg-muted/30"}`} />
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-3 right-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative">
              {lastResult.won ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 12 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.7)]"
                  >
                    <Coins className="h-10 w-10 text-black" />
                  </motion.div>
                  <p className="text-xs uppercase tracking-widest text-amber-300 mb-1">You Won</p>
                  <h2 className="text-4xl font-black mb-2 bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">
                    {fmt(lastResult.cents)}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">Instantly added to your wallet 🎉</p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/40">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">So close!</h2>
                  <p className="text-sm text-muted-foreground mb-6">Better luck on the next spin — $5 is waiting.</p>
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Close</Button>
                {spinsRemaining > 0 && !insufficient && (
                  <Button
                    className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90"
                    onClick={() => { setModalOpen(false); setTimeout(handleSpin, 200); }}
                  >
                    Spin Again
                  </Button>
                )}
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatTile({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background/70 to-background/30 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="opacity-80">{icon}</span>
        {label}
      </div>
      <p className={`mt-1.5 text-xl font-black ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-muted-foreground">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      <span>{children}</span>
    </div>
  );
}
