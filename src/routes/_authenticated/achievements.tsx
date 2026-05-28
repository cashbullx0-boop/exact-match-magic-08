import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Flame, Target, DollarSign, TrendingUp, Users, Trophy, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Achievements — CashBullX" }] }),
  component: AchievementsPage,
});

const ICONS: Record<string, any> = { target: Target, flame: Flame, "dollar-sign": DollarSign, "trending-up": TrendingUp, users: Users, award: Award };

function AchievementsPage() {
  const { user, profile } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: a }, { data: u }] = await Promise.all([
        supabase.from("achievements").select("*").order("xp_reward"),
        supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
      ]);
      setAchievements(a ?? []);
      setUnlocked(new Set((u ?? []).map((x: any) => x.achievement_id)));
      setLoading(false);
    })();
  }, [user]);

  const xpToNext = ((profile?.level ?? 1) * 500);
  const xpProgress = Math.min(100, ((profile?.xp ?? 0) % 500) / 5);

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Award className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground text-sm">Earn badges, level up, unlock rewards.</p>
        </div>
      </header>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current level</p>
            <p className="text-4xl font-bold brand-text mt-1">Level {profile?.level ?? 1}</p>
          </div>
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{profile?.xp ?? 0} XP</span>
            <span>Next: {xpToNext} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border text-center">
          <div><p className="text-2xl font-bold">{unlocked.size}</p><p className="text-xs text-muted-foreground">Unlocked</p></div>
          <div><p className="text-2xl font-bold">{achievements.length - unlocked.size}</p><p className="text-xs text-muted-foreground">Locked</p></div>
          <div><p className="text-2xl font-bold brand-text">{profile?.current_streak ?? 0}</p><p className="text-xs text-muted-foreground">Day streak</p></div>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => {
            const isUnlocked = unlocked.has(a.id);
            const Icon = ICONS[a.icon ?? "award"] ?? Award;
            return (
              <Card key={a.id} className={`glass-strong border-border p-5 transition-all hover:-translate-y-0.5 ${isUnlocked ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isUnlocked ? "" : "bg-muted"}`} style={isUnlocked ? { background: "var(--gradient-primary)" } : {}}>
                    {isUnlocked ? <Icon className="h-6 w-6 text-primary-foreground" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                    <p className="text-xs brand-text font-semibold mt-2">+{a.xp_reward} XP</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}