import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Dices, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/spinner")({
  head: () => ({
    meta: [
      { title: "Spinner Settings — Admin — CashBullX" },
      { name: "description", content: "Configure Lucky Spinner cost, daily limit and prize probability schedule." },
    ],
  }),
  component: AdminSpinnerPage,
});

type Prize = { cents: number; weight: number };
type Config = {
  enabled: boolean;
  cost_cents: number;
  daily_limit: number;
  auto_guard: boolean;
  max_payout_percent: number;
  prizes: Prize[];
};

const DEFAULT_CONFIG: Config = {
  enabled: true,
  cost_cents: 100,
  daily_limit: 5,
  auto_guard: true,
  max_payout_percent: 60,
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

function AdminSpinnerPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "spinner_config")
        .maybeSingle();
      const v = data?.value as Partial<Config> | null;
      if (v) {
        setCfg({
          enabled: v.enabled !== false,
          cost_cents: Number(v.cost_cents ?? 100),
          daily_limit: Number(v.daily_limit ?? 5),
          auto_guard: v.auto_guard !== false,
          max_payout_percent: Number(v.max_payout_percent ?? 60),
          prizes: Array.isArray(v.prizes) && v.prizes.length
            ? v.prizes.map((p) => ({ cents: Number(p.cents ?? 0), weight: Number(p.weight ?? 0) }))
            : DEFAULT_CONFIG.prizes,
        });
      }
      setLoading(false);
    })();
  }, []);

  const totalWeight = useMemo(
    () => cfg.prizes.reduce((s, p) => s + (Number.isFinite(p.weight) ? Math.max(p.weight, 0) : 0), 0),
    [cfg.prizes],
  );

  const expectedPayout = useMemo(() => {
    if (!totalWeight) return 0;
    return cfg.prizes.reduce((s, p) => s + (Math.max(p.weight, 0) / totalWeight) * p.cents, 0);
  }, [cfg.prizes, totalWeight]);

  const houseEdge = cfg.cost_cents > 0 ? ((cfg.cost_cents - expectedPayout) / cfg.cost_cents) * 100 : 0;

  const setPrize = (i: number, patch: Partial<Prize>) =>
    setCfg((c) => ({ ...c, prizes: c.prizes.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));

  const save = async () => {
    if (!cfg.prizes.length || totalWeight <= 0) {
      toast.error("Add at least one prize with a weight above 0");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "spinner_config",
        value: {
          enabled: cfg.enabled,
          cost_cents: Math.max(0, Math.round(cfg.cost_cents)),
          daily_limit: Math.max(1, Math.round(cfg.daily_limit)),
          auto_guard: cfg.auto_guard,
          max_payout_percent: Math.min(95, Math.max(0, Math.round(cfg.max_payout_percent))),
          prizes: cfg.prizes.map((p) => ({
            cents: Math.max(0, Math.round(p.cents)),
            weight: Math.max(0, p.weight),
          })),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Spinner settings saved");
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="py-20 text-center text-muted-foreground">You don't have access to this page.</div>;
  }

  return (
    <div className="space-y-6 animate-float-up max-w-3xl">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-600 text-black">
          <Dices className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Spinner Settings</h1>
          <p className="text-muted-foreground mt-1">
            Set the spin cost, daily limit and the exact prize probability schedule.
          </p>
        </div>
      </header>

      <Card className="glass-strong border-border p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Lucky Spinner enabled</Label>
            <p className="text-xs text-muted-foreground mt-1">Turn OFF to block all spins instantly.</p>
          </div>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Cost per spin ($)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={cfg.cost_cents / 100}
              onChange={(e) => setCfg((c) => ({ ...c, cost_cents: Math.round(Number(e.target.value) * 100) || 0 }))}
            />
          </div>
          <div>
            <Label>Spins allowed per day</Label>
            <Input
              type="number"
              min="1"
              value={cfg.daily_limit}
              onChange={(e) => setCfg((c) => ({ ...c, daily_limit: Number(e.target.value) || 1 }))}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Auto profit protection</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Prizes are capped automatically so total payouts never exceed the share below — checked for
                today and for all-time. The house can never end up in loss.
              </p>
            </div>
            <Switch checked={cfg.auto_guard} onCheckedChange={(v) => setCfg((c) => ({ ...c, auto_guard: v }))} />
          </div>
          <div>
            <Label>Max payout share of entry fees (%)</Label>
            <Input
              type="number"
              min="0"
              max="95"
              value={cfg.max_payout_percent}
              disabled={!cfg.auto_guard}
              onChange={(e) =>
                setCfg((c) => ({ ...c, max_payout_percent: Math.min(95, Math.max(0, Number(e.target.value) || 0)) }))
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Guaranteed house margin: {(100 - cfg.max_payout_percent).toFixed(0)}% of every dollar spun.
            </p>
          </div>
        </div>
      </Card>

      <Card className="glass-strong border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Prize schedule</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Weights are relative — with a total of 100 each weight equals a percentage.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCfg((c) => ({ ...c, prizes: DEFAULT_CONFIG.prizes }))}
          >
            <RotateCcw className="h-4 w-4 mr-1" />Reset
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_90px_40px] gap-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Prize ($)</span>
            <span>Weight</span>
            <span>Probability</span>
            <span />
          </div>
          {cfg.prizes.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_90px_40px] gap-2 items-center">
              <Input
                type="number"
                step="0.5"
                min="0"
                value={p.cents / 100}
                onChange={(e) => setPrize(i, { cents: Math.round(Number(e.target.value) * 100) || 0 })}
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                value={p.weight}
                onChange={(e) => setPrize(i, { weight: Number(e.target.value) || 0 })}
              />
              <span className="text-sm tabular-nums text-muted-foreground">
                {totalWeight ? ((Math.max(p.weight, 0) / totalWeight) * 100).toFixed(1) : "0.0"}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCfg((c) => ({ ...c, prizes: c.prizes.filter((_, idx) => idx !== i) }))}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCfg((c) => ({ ...c, prizes: [...c.prizes, { cents: 0, weight: 1 }] }))}
        >
          <Plus className="h-4 w-4 mr-1" />Add prize
        </Button>

        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total weight</p>
            <p className="text-lg font-bold tabular-nums">{totalWeight}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg payout / spin</p>
            <p className="text-lg font-bold tabular-nums">${usd(expectedPayout)}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">House edge</p>
            <p className={`text-lg font-bold tabular-nums ${houseEdge < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {houseEdge.toFixed(1)}%
            </p>
          </div>
        </div>

        {houseEdge < 0 && (
          <p className="text-xs text-red-400">
            Warning: average payout is higher than the spin cost — this schedule loses money.
          </p>
        )}

        <Button onClick={save} disabled={saving} className="btn-primary-gradient w-full sm:w-auto">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save settings
        </Button>
      </Card>
    </div>
  );
}
