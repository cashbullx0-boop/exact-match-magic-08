import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LEVELS, TIERS, levelFromTotalCents, nextLevel } from "@/lib/levels";
import { Check, Lock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/levels")({
  head: () => ({ meta: [{ title: "Membership Levels — CashBullX" }] }),
  component: LevelsPage,
});

function LevelsPage() {
  const { profile } = useAuth();
  const totalCents = profile?.total_earned_cents ?? 0;
  const current = useMemo(() => levelFromTotalCents(totalCents), [totalCents]);
  const next = nextLevel(current);
  const [filter, setFilter] = useState<string>("All");

  const totalUsd = totalCents / 100;
  const progressToNext = next
    ? Math.min(100, ((totalUsd - current.requiredUsd) / (next.requiredUsd - current.requiredUsd)) * 100)
    : 100;

  const visible = filter === "All" ? LEVELS : LEVELS.filter((l) => l.tier.name === filter);

  return (
    <div className="space-y-8 animate-float-up">
      <header className="space-y-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
          44 Membership Tiers
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">Membership <span className="brand-text">Levels</span></h1>
        <p className="text-muted-foreground max-w-2xl">
          Climb 44 tiers from Bronze to Legend. Each tier unlocks higher bonuses, faster withdrawals,
          and exclusive earning opportunities.
        </p>
      </header>

      {/* Current progress hero */}
      <Card className="glass-strong border-border p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
             style={{ background: current.tier.gradient }} />
        <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/10"
                 style={{ background: current.tier.gradient }}>
              <current.icon className="h-9 w-9 text-black/80" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your level</p>
              <p className="text-3xl font-bold">Lv {current.level}</p>
              <Badge className="mt-1 border-0 text-black" style={{ background: current.tier.gradient }}>
                {current.tier.name}
              </Badge>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total earned</span>
              <span className="font-semibold">${totalUsd.toFixed(2)}</span>
            </div>
            <Progress value={progressToNext} className="h-2.5" />
            <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
              <span>Lv {current.level} · ${current.requiredUsd.toLocaleString()}</span>
              {next ? (
                <span>Next: Lv {next.level} · ${next.requiredUsd.toLocaleString()}</span>
              ) : (
                <span>Max level reached 👑</span>
              )}
            </div>
          </div>

          <div className="hidden md:block">
            <Button className="btn-primary-gradient" disabled={!next}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {next ? `Earn $${(next.requiredUsd - totalUsd).toFixed(0)} more` : "Maxed out"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2">
        {["All", ...TIERS.map((t) => t.name)].map((name) => (
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((l) => {
          const unlocked = totalUsd >= l.requiredUsd;
          const isCurrent = l.level === current.level;
          const Icon = l.icon;
          return (
            <Card
              key={l.level}
              className={`relative overflow-hidden border-border glass-strong p-5 transition-all hover:-translate-y-1 hover:shadow-2xl ${
                isCurrent ? `ring-2 ${l.tier.ring}` : ""
              } ${!unlocked ? "opacity-90" : ""}`}
            >
              {/* Tier glow */}
              <div
                className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-25 pointer-events-none"
                style={{ background: l.tier.gradient }}
              />

              <div className="relative flex items-start justify-between">
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10"
                  style={{ background: l.tier.gradient }}
                >
                  <Icon className="h-6 w-6 text-black/80" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold leading-none">{l.level}</p>
                </div>
              </div>

              <div className="relative mt-4">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${l.tier.textGlow}`}>{l.tier.name}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/15 text-primary border border-primary/30">
                      Current
                    </Badge>
                  )}
                  {unlocked && !isCurrent && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-accent/15 text-accent border border-accent/30">
                      Unlocked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Required: ${l.requiredUsd.toLocaleString()}</p>
              </div>

              <ul className="relative mt-4 space-y-1.5">
                {l.benefits.map((b) => (
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}