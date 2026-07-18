import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, ListChecks, Users, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { VipBadge } from "@/components/dashboard/vip-badge";
import { DotsLoader } from "@/components/dashboard/dots-loader";
import { DepositDeadlineRing } from "@/components/dashboard/deposit-deadline-ring";
import { InvestmentLevelWidget } from "@/components/dashboard/investment-level-widget";
import { PromoCarousel } from "@/components/dashboard/promo-carousel";
import { OffersSection } from "@/components/dashboard/offers-section";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CashBullX" }] }),
  component: DashboardPage,
});

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function DashboardPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ completed: 0, referrals: 0 });
  const [series, setSeries] = useState<{ day: string; earned: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
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
      // Only legitimate earnings — exclude trade win payouts and other trade txns
      const { data: weekTxns } = await supabase
        .from("transactions")
        .select("amount_cents,created_at,description,type")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      (weekTxns ?? []).forEach((t: any) => {
        const key = new Date(t.created_at).toISOString().slice(5, 10);
        if (!(key in days)) return;
        if (t.amount_cents <= 0) return;
        const desc = String(t.description ?? "").toLowerCase();
        // Exclude trade win payouts / trade-related credits
        if (desc.includes("trade")) return;
        days[key] += t.amount_cents;
      });
      setSeries(Object.entries(days).map(([day, earned]) => ({ day, earned: earned / 100 })));
      setLoadingData(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0] ?? "earner"} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's how your earnings are going.</p>
        </div>
        <VipBadge totalCents={profile?.total_earned_cents ?? 0} />
      </header>

      <DepositDeadlineRing />

      <PromoCarousel />

      <OffersSection />

      {/* Level progress */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-strong border-border p-6 relative overflow-hidden max-w-md">
          <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full opacity-30 blur-2xl" style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 165), oklch(0.62 0.22 295))" }} />
          <div className="flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-accent" /><span className="text-xs uppercase tracking-wider text-muted-foreground">Level progress</span></div>
              <p className="text-4xl font-bold mt-2 brand-text">Lv {profile?.level ?? 1}</p>
              <p className="text-xs text-muted-foreground mt-1">{profile?.xp ?? 0} / {(profile?.level ?? 1) * 500} XP</p>
            </div>
          </div>
          <Progress value={Math.min(100, ((profile?.xp ?? 0) % 500) / 5)} className="mt-4 h-2 relative" />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStatCard icon={Wallet} label="Wallet balance" cents={profile?.balance_cents ?? 0} accent="primary" />
        <AnimatedStatCard icon={TrendingUp} label="Total earned" cents={profile?.total_earned_cents ?? 0} accent="accent" />
        <StatCard icon={ListChecks} label="Tasks completed" value={String(stats.completed)} />
        <StatCard icon={Users} label="Referrals" value={String(stats.referrals)} />
      </div>

      <InvestmentLevelWidget />

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
        {loadingData ? (
          <DotsLoader label="Loading transactions" />
        ) : recent.length === 0 ? (
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

function AnimatedStatCard({ icon: Icon, label, cents, accent }: { icon: any; label: string; cents: number; accent?: "primary" | "accent" }) {
  return (
    <Card className="glass-strong border-border p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === "primary" ? "text-primary" : accent === "accent" ? "text-accent" : "text-muted-foreground"}`} />
      </div>
      <p className={`text-2xl font-bold mt-3 ${accent === "accent" ? "brand-text" : ""}`}>
        <AnimatedNumber value={cents / 100} prefix="$" />
      </p>
    </Card>
  );
}
