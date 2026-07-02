import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Coins, Info, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/spinner")({
  component: SpinnerPage,
});

// Wheel segments (cents). Order defines their visual position on the wheel.
const SEGMENTS: { cents: number; label: string; color: string }[] = [
  { cents: 0, label: "$0", color: "#1f2937" },
  { cents: 25, label: "$0.25", color: "#0ea5e9" },
  { cents: 50, label: "$0.50", color: "#8b5cf6" },
  { cents: 100, label: "$1", color: "#f59e0b" },
  { cents: 0, label: "$0", color: "#334155" },
  { cents: 25, label: "$0.25", color: "#06b6d4" },
  { cents: 50, label: "$0.50", color: "#a855f7" },
  { cents: 500, label: "$5", color: "#ef4444" },
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

  const wheelGradient = useMemo(() => {
    let acc = 0;
    const stops = SEGMENTS.map((s) => {
      const from = acc;
      const to = acc + SEG_ANGLE;
      acc = to;
      return `${s.color} ${from}deg ${to}deg`;
    }).join(", ");
    return `conic-gradient(from 0deg, ${stops})`;
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold brand-text">🎰 Lucky Spinner</h1>
        <p className="text-sm text-muted-foreground">Spin daily to win instant cash rewards</p>
      </div>

      {/* Stats bar */}
      <Card className="glass-strong">
        <CardContent className="p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spins Left</p>
            <p className="text-lg font-bold text-primary">{spinsRemaining}/{MAX_SPINS_PER_DAY}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Balance</p>
            <p className="text-lg font-bold">{fmt(balanceCents)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost / Spin</p>
            <p className="text-lg font-bold text-amber-400">$1.00</p>
          </div>
        </CardContent>
      </Card>

      {/* Wheel */}
      <div className="relative mx-auto w-[300px] h-[340px] md:w-[380px] md:h-[420px] flex items-start justify-center">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.7)]" />
        </div>

        <div className={`relative mt-6 w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full ${disabled ? "opacity-50 grayscale" : ""}`}>
          <motion.div
            className="absolute inset-0 rounded-full shadow-[0_0_40px_rgba(139,92,246,0.4)]"
            style={{ background: wheelGradient, border: "6px solid hsl(var(--border))" }}
            animate={{ rotate: rotation }}
            transition={{ duration: 2.8, ease: [0.17, 0.67, 0.2, 0.99] }}
          >
            {SEGMENTS.map((seg, i) => {
              const angle = i * SEG_ANGLE + SEG_ANGLE / 2;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 origin-[0_0] text-white font-bold text-xs md:text-sm pointer-events-none"
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -42%)`,
                  }}
                >
                  <div style={{ transform: "translate(-50%, -110px) rotate(90deg)" }} className="whitespace-nowrap drop-shadow-md">
                    {seg.label}
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Center hub with SPIN button */}
          <button
            onClick={handleSpin}
            disabled={disabled}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-lg shadow-[0_0_30px_rgba(251,191,36,0.6)] border-4 border-background disabled:cursor-not-allowed disabled:opacity-70 transition-transform active:scale-95 hover:scale-105"
          >
            {spinning ? "..." : "SPIN"}
          </button>
        </div>
      </div>

      {/* Disabled state message */}
      {(spinsRemaining === 0 || insufficient) && !spinning && (
        <div className="text-center text-sm text-amber-400/90 font-medium">
          {insufficient
            ? "Insufficient balance — deposit or earn $1 to spin."
            : "Come back tomorrow for more spins!"}
        </div>
      )}

      {/* Rules */}
      <Card className="glass">
        <CardContent className="p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-4 w-4" /> Rules
          </div>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            <li>$1 per spin, max 5 spins per day</li>
            <li>Instant rewards added to wallet</li>
            <li>Resets daily at 4:00 AM UK time (in {countdown})</li>
            <li>Rewards: $0, $0.25, $0.50, $1, or $5</li>
          </ul>
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
              className="relative w-full max-w-sm rounded-2xl glass-strong border border-border p-6 text-center"
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {lastResult.won ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center mb-3">
                    <Coins className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">🎉 You won {fmt(lastResult.cents)}!</h2>
                  <p className="text-sm text-muted-foreground mb-5">Added to your wallet.</p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Better luck next time!</h2>
                  <p className="text-sm text-muted-foreground mb-5">Try again for a chance at $5.</p>
                </>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Close</Button>
                {spinsRemaining > 0 && !insufficient && (
                  <Button
                    className="flex-1"
                    onClick={() => { setModalOpen(false); setTimeout(handleSpin, 200); }}
                  >
                    Spin Again
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
