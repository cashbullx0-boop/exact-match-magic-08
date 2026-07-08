import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, TrendingUp, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/levels")({
  head: () => ({ meta: [{ title: "Investment Levels — CashBullX" }] }),
  component: LevelsPage,
});

type LevelRow = {
  id: string;
  level: number;
  name: string;
  tier: string;
  min_deposit_cents: number;
  daily_profit_cents: number;
  color: string;
  icon: string;
  perks: string[] | null;
};

const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#C0C0C0",
  Gold: "#FFD700",
  Platinum: "#E5E4E2",
  Diamond: "#B9F2FF",
};

function LevelsPage() {
  const { profile } = useAuth();
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const balance = (profile as { balance_cents?: number } | null)?.balance_cents ?? 0;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase.from("investment_levels").select("*").order("level");
      setLevels((rows as LevelRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const current = useMemo(() => {
    const eligible = levels.filter((l) => l.min_deposit_cents <= balance);
    return eligible.length ? eligible[eligible.length - 1] : null;
  }, [levels, balance]);

  const next = useMemo(() => {
    if (!current) return levels[0] ?? null;
    return levels.find((l) => l.level === current.level + 1) ?? null;
  }, [levels, current]);

  const totalUsd = balance / 100;
  const baseUsd = (current?.min_deposit_cents ?? 0) / 100;
  const nextUsd = (next?.min_deposit_cents ?? baseUsd) / 100;
  const progressToNext = next
    ? Math.min(100, Math.max(0, ((totalUsd - baseUsd) / (nextUsd - baseUsd)) * 100))
    : 100;

  const colorFor = (l: LevelRow) => TIER_COLORS[l.name] ?? l.color ?? "#CD7F32";
  const currentColor = current ? colorFor(current) : "#CD7F32";

  return (
    <div className="space-y-8 animate-float-up">
      <header className="space-y-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
          5 Investment Levels
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">
          Investment <span className="brand-text">Levels</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Grow your balance to climb from Bronze to Diamond. Each level unlocks a higher daily profit.
        </p>
      </header>

      {/* Current progress hero */}
      <Card className="glass-strong border-border p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: currentColor }}
        />
        <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl ring-2 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${currentColor}, ${currentColor}88)` }}
            >
              <span>{current?.icon ?? "🔒"}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your level</p>
              <p className="text-3xl font-bold">{current?.name ?? "—"}</p>
              <Badge className="mt-1 border-0 text-black" style={{ background: currentColor }}>
                {current?.name ?? "Not unlocked"}
              </Badge>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Current balance</span>
              <span className="font-semibold">${totalUsd.toLocaleString()}</span>
            </div>
            <Progress value={progressToNext} className="h-2.5" />
            <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
              <span>{current ? `${current.name} · $${baseUsd.toLocaleString()}` : "Start at $50"}</span>
              {next ? (
                <span>Next: {next.name} · ${nextUsd.toLocaleString()}</span>
              ) : (
                <span>Max level reached 👑</span>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <Link to="/deposit">
              <Button className="btn-primary-gradient" disabled={!next}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {next ? `Add $${Math.max(0, nextUsd - totalUsd).toLocaleString()} balance` : "Maxed out"}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Levels grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading levels…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {levels.map((l) => {
            const color = colorFor(l);
            const unlocked = balance >= l.min_deposit_cents;
            const isCurrent = current?.level === l.level;
            const needUsd = Math.max(0, (l.min_deposit_cents - balance) / 100);
            return (
              <Card
                key={l.id}
                className={`relative overflow-hidden border-border glass-strong p-5 transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  isCurrent ? "level-glow ring-2" : ""
                } ${!unlocked ? "opacity-90" : ""}`}
                style={isCurrent ? { boxShadow: `0 0 0 2px ${color}, 0 10px 40px -10px ${color}` } : undefined}
              >
                <div
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                  style={{ background: color }}
                />
                <div className="relative flex items-start justify-between">
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/10"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
                  >
                    <span>{l.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Level {l.level}</p>
                    <p className="text-lg font-bold leading-none" style={{ color }}>{l.name}</p>
                  </div>
                </div>

                <div className="relative mt-4 space-y-1">
                  {isCurrent && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/15 text-primary border border-primary/30">
                      <Crown className="h-3 w-3 mr-0.5" /> Current
                    </Badge>
                  )}
                  {unlocked && !isCurrent && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-accent/15 text-accent border border-accent/30">
                      Unlocked
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Min balance: <span className="font-semibold text-foreground">${(l.min_deposit_cents / 100).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Daily profit: <span className="font-semibold" style={{ color }}>
                      ${((balance * 0.02) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                </div>

                {!unlocked && (
                  <div className="relative mt-4 pt-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Need ${needUsd.toLocaleString()} more balance to unlock
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}