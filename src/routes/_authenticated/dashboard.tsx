import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, ListChecks, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CashBullX" }] }),
  component: DashboardPage,
});

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function DashboardPage() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ completed: 0, referrals: 0 });
  const [series, setSeries] = useState<{ day: string; earned: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: completed }, { count: referrals }, { data: txns }] = await Promise.all([
        supabase.from("task_completions").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);
      setStats({ completed: completed ?? 0, referrals: referrals ?? 0 });
      setRecent(txns ?? []);

      // Build 7-day earnings series
      const days: Record<string, number> = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        days[d.toISOString().slice(5, 10)] = 0;
      }
      const { data: weekTxns } = await supabase.from("transactions").select("amount_cents,created_at").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      (weekTxns ?? []).forEach((t) => {
        const key = new Date(t.created_at).toISOString().slice(5, 10);
        if (key in days && t.amount_cents > 0) days[key] += t.amount_cents;
      });
      setSeries(Object.entries(days).map(([day, earned]) => ({ day, earned: earned / 100 })));
    })();
  }, [user]);

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0] ?? "earner"} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's how your earnings are going.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Wallet} label="Wallet balance" value={fmt(profile?.balance_cents ?? 0)} accent="primary" />
        <StatCard icon={TrendingUp} label="Total earned" value={fmt(profile?.total_earned_cents ?? 0)} accent="accent" />
        <StatCard icon={ListChecks} label="Tasks completed" value={String(stats.completed)} />
        <StatCard icon={Users} label="Referrals" value={String(stats.referrals)} />
      </div>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Earnings · last 7 days</h2>
          <span className="text-xs text-muted-foreground">USD</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.17 85)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.82 0.17 85)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="oklch(0.7 0.03 255)" fontSize={12} />
              <YAxis stroke="oklch(0.7 0.03 255)" fontSize={12} />
              <Tooltip contentStyle={{ background: "oklch(0.2 0.04 265)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="earned" stroke="oklch(0.82 0.17 85)" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Recent transactions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet — complete a task to start earning.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.description ?? t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-sm font-semibold ${t.amount_cents >= 0 ? "text-accent" : "text-destructive"}`}>
                  {t.amount_cents >= 0 ? "+" : ""}{fmt(t.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: "primary" | "accent" }) {
  return (
    <Card className="glass-strong border-border p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === "primary" ? "text-primary" : accent === "accent" ? "text-accent" : "text-muted-foreground"}`} />
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
    </Card>
  );
}