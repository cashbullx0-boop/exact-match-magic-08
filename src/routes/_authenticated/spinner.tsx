import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Trophy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import spinnerPromo from "@/assets/spinner-promo.jpeg.asset.json";

export const Route = createFileRoute("/_authenticated/spinner")({
  head: () => ({
    meta: [
      { title: "Lucky Spinner — Spin & Win | CashBullX" },
      {
        name: "description",
        content:
          "Spin the CashBullX Lucky Spinner for instant cash rewards. Low entry cost, daily spins and instant credit to your wallet.",
      },
      { property: "og:title", content: "Lucky Spinner — Spin & Win | CashBullX" },
      {
        property: "og:description",
        content: "Spin the CashBullX Lucky Spinner for instant cash rewards credited straight to your wallet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpinnerPage,
});

type Prize = { cents: number; weight: number };
type Config = { enabled: boolean; cost_cents: number; daily_limit: number; prizes: Prize[] };

const DEFAULT_CONFIG: Config = {
  enabled: true,
  cost_cents: 100,
  daily_limit: 5,
  prizes: [
    { cents: 0, weight: 20 },
    { cents: 50, weight: 25 },
    { cents: 100, weight: 25 },
    { cents: 200, weight: 15 },
    { cents: 300, weight: 8 },
    { cents: 500, weight: 6 },
    { cents: 1000, weight: 1 },
  ],
};

const usd = (cents: number) => (cents / 100).toFixed(2);

/** Today's date key in Europe/London — matches the server-side spin_date. */
function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

const SEGMENT_COLORS = [
  "#f59e0b",
  "#0f172a",
  "#22c55e",
  "#0f172a",
  "#3b82f6",
  "#0f172a",
  "#ef4444",
  "#0f172a",
  "#a855f7",
  "#0f172a",
  "#14b8a6",
  "#0f172a",
];

function SpinnerPage() {
  const { profile, refreshProfile } = useAuth();
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [spinsToday, setSpinsToday] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ won: boolean; cents: number } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: setting }, { data: spins }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "spinner_config").maybeSingle(),
        supabase.from("spins").select("id").eq("spin_date", londonToday()),
      ]);
      const v = setting?.value as Partial<Config> | null;
      if (v) {
        setCfg({
          enabled: v.enabled !== false,
          cost_cents: Number(v.cost_cents ?? 100),
          daily_limit: Number(v.daily_limit ?? 5),
          prizes:
            Array.isArray(v.prizes) && v.prizes.length
              ? v.prizes.map((p) => ({ cents: Number(p.cents ?? 0), weight: Number(p.weight ?? 0) }))
              : DEFAULT_CONFIG.prizes,
        });
      }
      setSpinsToday(spins?.length ?? 0);
      setLoading(false);
    })();
  }, []);

  const segments = cfg.prizes;
  const segAngle = segments.length ? 360 / segments.length : 360;

  const gradient = useMemo(() => {
    if (!segments.length) return "conic-gradient(#0f172a 0deg 360deg)";
    const stops = segments.map((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      return `${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`;
    });
    return `conic-gradient(from -${segAngle / 2}deg, ${stops.join(", ")})`;
  }, [segments, segAngle]);

  const balance = profile?.balance_cents ?? 0;
  const spinsLeft = Math.max(0, cfg.daily_limit - spinsToday);
  const canSpin =
    cfg.enabled && !spinning && spinsLeft > 0 && balance >= cfg.cost_cents && segments.length > 0;

  const handleSpin = async () => {
    if (!canSpin) return;
    setSpinning(true);
    setResult(null);

    const { data, error } = await supabase.rpc("perform_spin");

    if (error) {
      setSpinning(false);
      toast.error(error.message);
      return;
    }

    const payload = data as { reward_cents: number; won: boolean; spins_remaining: number };
    const idx = Math.max(
      0,
      segments.findIndex((p) => p.cents === payload.reward_cents),
    );

    // Land the pointer (top) on the winning segment after several full turns.
    const target = 360 * 6 - idx * segAngle;
    setRotation((r) => r + (target - (r % 360)) + 360);

    window.setTimeout(() => {
      setSpinning(false);
      setSpinsToday((n) => n + 1);
      setResult({ won: payload.won, cents: payload.reward_cents });
      void refreshProfile();
      if (payload.won) toast.success(`You won $${usd(payload.reward_cents)}!`);
      else toast("No prize this time — try again!");
    }, 4200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 animate-float-up">
      <header className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live now
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Lucky Spinner</h1>
        <p className="mt-2 text-muted-foreground">
          ${usd(cfg.cost_cents)} per spin · instant rewards credited to your wallet
        </p>
      </header>

      {!cfg.enabled && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm text-amber-300">
          The Lucky Spinner is temporarily paused. Please check back soon.
        </Card>
      )}

      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 md:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex flex-col items-center">
          {/* pointer */}
          <div className="relative z-10 -mb-3 h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-primary drop-shadow" />

          <div className="relative h-72 w-72 md:h-80 md:w-80">
            <div className="absolute inset-0 rounded-full border-4 border-primary/40 shadow-2xl" />
            <div
              ref={wheelRef}
              className="absolute inset-1 rounded-full"
              style={{
                background: gradient,
                transform: `rotate(${rotation}deg)`,
                transition: "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)",
              }}
            >
              {segments.map((p, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 origin-left text-xs font-bold text-white drop-shadow"
                  style={{
                    transform: `rotate(${i * segAngle}deg) translateX(38%)`,
                  }}
                >
                  {p.cents === 0 ? "Try again" : `$${usd(p.cents)}`}
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-primary/50 bg-background">
              <Sparkles className={`h-6 w-6 text-primary ${spinning ? "animate-spin" : ""}`} />
            </div>
          </div>

          <Button
            onClick={handleSpin}
            disabled={!canSpin}
            className="btn-primary-gradient mt-8 h-12 w-full max-w-xs text-base font-bold"
          >
            {spinning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Spinning…
              </>
            ) : (
              `Spin for $${usd(cfg.cost_cents)}`
            )}
          </Button>

          {balance < cfg.cost_cents && (
            <p className="mt-3 text-xs text-red-400">
              Insufficient balance — deposit at least ${usd(cfg.cost_cents)} to spin.
            </p>
          )}
          {spinsLeft === 0 && (
            <p className="mt-3 text-xs text-amber-300">
              Daily limit reached. Come back tomorrow for more spins.
            </p>
          )}

          {result && !spinning && (
            <div
              className={`animate-scale-in mt-5 rounded-xl border px-5 py-3 text-center ${
                result.won
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border bg-white/5 text-muted-foreground"
              }`}
            >
              {result.won ? (
                <>
                  <Trophy className="mx-auto mb-1 h-5 w-5" />
                  <p className="font-bold">You won ${usd(result.cents)}</p>
                </>
              ) : (
                <p className="font-medium">No prize this time — better luck on the next spin!</p>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your balance</p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums">
            <Wallet className="h-4 w-4 text-primary" />${usd(balance)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Spins left today</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            {spinsLeft} / {cfg.daily_limit}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Top prize</p>
          <p className="mt-1 text-lg font-bold tabular-nums">
            ${usd(Math.max(...segments.map((p) => p.cents), 0))}
          </p>
        </Card>
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/30 bg-[#0a0f1e] shadow-xl">
        <img
          src={spinnerPromo.url}
          alt="CashBullX Spin & Win — instant cash rewards"
          loading="lazy"
          className="h-auto w-full object-contain"
        />
      </div>
    </div>
  );
}
