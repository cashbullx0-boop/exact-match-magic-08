import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Lock, TrendingUp, Crown } from "lucide-react";

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

const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as const;

function LevelsPage() {
  const { profile } = useAuth();
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [filter, setFilter] = useState<string>("All");
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

  const tiersPresent = ["All", ...TIER_ORDER.filter((t) => levels.some((l) => l.tier === t))];
  const visible = filter === "All" ? levels : levels.filter((l) => l.tier === filter);

  return (
    <div className="space-y-8 animate-float-up">
      <header className="space-y-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
          15 Investment Levels
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">
          Investment <span className="brand-text">Levels</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Grow your balance to climb from Bronze to Diamond. Each level unlocks higher daily profit and exclusive perks.
        </p>
      </header>

      {/* Current progress hero */}
      <Card className="glass-strong border-border p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: current?.color ?? "#CD7F32" }}
        />
        <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl ring-2 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${current?.color ?? "#CD7F32"}, ${current?.color ?? "#CD7F32"}88)` }}
            >
              <span>{current?.icon ?? "🔒"}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your level</p>
              <p className="text-3xl font-bold">{current ? `Lv ${current.level}` : "—"}</p>
              <Badge className="mt-1 border-0 text-black" style={{ background: current?.color ?? "#CD7F32" }}>
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
              <span>{current ? `Lv ${current.level} · $${baseUsd.toLocaleString()}` : "Start at $50"}</span>
              {next ? (
                <span>Next: Lv {next.level} · ${nextUsd.toLocaleString()}</span>
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

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2">
        {tiersPresent.map((name) => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === name
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Levels grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading levels…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((l) => {
            const unlocked = balance >= l.min_deposit_cents;
            const isCurrent = current?.level === l.level;
            const needUsd = Math.max(0, (l.min_deposit_cents - balance) / 100);
            return (
              <Card
                key={l.id}
                className={`relative overflow-hidden border-border glass-strong p-5 transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  isCurrent ? "level-glow ring-2" : ""
                } ${!unlocked ? "opacity-90" : ""}`}
                style={isCurrent ? { boxShadow: `0 0 0 2px ${l.color}, 0 10px 40px -10px ${l.color}` } : undefined}
              >
                <div
                  className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                  style={{ background: l.color }}
                />
                {isCurrent && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20 animate-shimmer"
                    style={{
                      background: `linear-gradient(110deg, transparent 30%, ${l.color} 50%, transparent 70%)`,
                      backgroundSize: "200% 100%",
                    }}
                  />
                )}

                <div className="relative flex items-start justify-between">
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/10"
                    style={{ background: `linear-gradient(135deg, ${l.color}, ${l.color}88)` }}
                  >
                    <span>{l.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Level</p>
                    <p className="text-2xl font-bold leading-none">{l.level}</p>
                  </div>
                </div>

                <div className="relative mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: l.color }}>{l.name}</span>
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Min balance: <span className="font-semibold text-foreground">${(l.min_deposit_cents / 100).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Daily profit: <span className="font-semibold" style={{ color: l.color }}>${(l.daily_profit_cents / 100).toLocaleString()}</span>
                  </p>
                </div>

                <ul className="relative mt-4 space-y-1.5 min-h-[60px]">
                  {(l.perks ?? []).map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                      {unlocked ? (
                        <Check className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

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