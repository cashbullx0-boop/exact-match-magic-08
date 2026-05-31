import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, ListChecks, Users, Flame, Gift, Zap, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { levelFromTotalCents, nextLevel } from "@/lib/levels";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { VipBadge } from "@/components/dashboard/vip-badge";
import { DotsLoader } from "@/components/dashboard/dots-loader";

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
  const [claiming, setClaiming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyCheckedIn = profile?.last_checkin_date === today;
  const streak = profile?.current_streak ?? 0;
  const nextRewardCents = Math.min(50 + streak * 10, 200);

  const totalUsd = (profile?.total_earned_cents ?? 0) / 100;
  const memLevel = levelFromTotalCents(profile?.total_earned_cents ?? 0);
  const memNext = nextLevel(memLevel);
  const memProgress = memNext
    ? Math.min(100, ((totalUsd - memLevel.requiredUsd) / (memNext.requiredUsd - memLevel.requiredUsd)) * 100)
    : 100;

  const claimCheckin = async () => {
    if (!user || !profile || alreadyCheckedIn) return;
    setClaiming(true);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = profile.last_checkin_date === yesterday ? streak + 1 : 1;
    const reward = Math.min(50 + (newStreak - 1) * 10, 200);
    const xpGain = 20 + newStreak * 5;

    const { error } = await supabase.from("daily_checkins").insert({
      user_id: user.id, checkin_date: today, reward_cents: reward, streak_day: newStreak,
    });
    if (error) { toast.error(error.message); setClaiming(false); return; }

    await supabase.from("transactions").insert({
      user_id: user.id, type: "task_reward", amount_cents: reward,
      description: `Daily check-in (day ${newStreak})`,
    });
    await supabase.from("profiles").update({
      balance_cents: profile.balance_cents + reward,
      total_earned_cents: profile.total_earned_cents + reward,
      current_streak: newStreak,
      longest_streak: Math.max(profile.longest_streak, newStreak),
      last_checkin_date: today,
      xp: profile.xp + xpGain,
      level: Math.floor((profile.xp + xpGain) / 500) + 1,
    }).eq("id", user.id);
    await supabase.rpc("create_self_notification", {
      _title: `Day ${newStreak} streak claimed!`,
      _body: `+$${(reward / 100).toFixed(2)} and +${xpGain} XP added to your wallet.`,
      _type: "reward",
    });
    setClaiming(false);
    toast.success(`+$${(reward / 100).toFixed(2)} · +${xpGain} XP`);
    refreshProfile();
  };

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
      const { data: weekTxns } = await supabase.from("transactions").select("amount_cents,created_at").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      (weekTxns ?? []).forEach((t) => {
        const key = new Date(t.created_at).toISOString().slice(5, 10);
        if (key in days && t.amount_cents > 0) days[key] += t.amount_cents;
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

      {/* Daily check-in + level */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-strong border-border p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full opacity-30 blur-2xl" style={{ background: "var(--gradient-primary)" }} />
          <div className="flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-400" /><span className="text-xs uppercase tracking-wider text-muted-foreground">Daily streak</span></div>
              <p className="text-4xl font-bold mt-2">{streak} <span className="text-base font-normal text-muted-foreground">day{streak === 1 ? "" : "s"}</span></p>
              <p className="text-xs text-muted-foreground mt-1">Longest: {profile?.longest_streak ?? 0}</p>
            </div>
            <Button onClick={claimCheckin} disabled={alreadyCheckedIn || claiming} className={alreadyCheckedIn ? "" : "btn-primary-gradient"} size="sm">
              <Gift className="h-4 w-4 mr-1" />
              {alreadyCheckedIn ? "Claimed today" : `Claim +$${(nextRewardCents / 100).toFixed(2)}`}
            </Button>
          </div>
          <div className="mt-4 flex gap-1 relative">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${i < (streak % 7 || (alreadyCheckedIn ? 7 : 0)) ? "bg-primary" : "bg-white/10"}`} />
            ))}
          </div>
        </Card>

        <Card className="glass-strong border-border p-6 relative overflow-hidden">
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

      {/* Membership level tracker */}
      <Card className="glass-strong border-border p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-25 blur-3xl pointer-events-none"
             style={{ background: memLevel.tier.gradient }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10 shrink-0"
                 style={{ background: memLevel.tier.gradient }}>
              <memLevel.icon className="h-6 w-6 text-black/80" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Membership</span>
              </div>
              <p className="text-xl font-bold mt-0.5">Lv {memLevel.level} · {memLevel.tier.name}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1.5 text-muted-foreground">
              <span>${totalUsd.toFixed(2)} earned</span>
              {memNext ? <span>Next: Lv {memNext.level} · ${memNext.requiredUsd.toLocaleString()}</span> : <span>Max level 👑</span>}
            </div>
            <Progress value={memProgress} className="h-2" />
          </div>
          <Link to="/levels" className="shrink-0">
            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
              All 44 levels <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </Card>

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