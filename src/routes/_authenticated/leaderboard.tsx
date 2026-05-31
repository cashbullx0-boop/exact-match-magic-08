import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Medal, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — CashBullX" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: top }, { data: txns }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url,total_earned_cents,level,xp").order("total_earned_cents", { ascending: false }).limit(20),
        supabase.from("transactions").select("user_id,amount_cents").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).gt("amount_cents", 0),
        supabase.from("referrals").select("referrer_id"),
      ]);
      setTopEarners(top ?? []);

      const wkMap = new Map<string, number>();
      (txns ?? []).forEach((t: any) => wkMap.set(t.user_id, (wkMap.get(t.user_id) ?? 0) + t.amount_cents));
      const wkIds = Array.from(wkMap.keys());
      if (wkIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", wkIds);
        const list = (profs ?? []).map((p: any) => ({ ...p, weekly_cents: wkMap.get(p.id) ?? 0 }))
          .sort((a, b) => b.weekly_cents - a.weekly_cents).slice(0, 20);
        setWeekly(list);
      }

      const refMap = new Map<string, number>();
      (refs ?? []).forEach((r: any) => refMap.set(r.referrer_id, (refMap.get(r.referrer_id) ?? 0) + 1));
      const refIds = Array.from(refMap.keys());
      if (refIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", refIds);
        const list = (profs ?? []).map((p: any) => ({ ...p, count: refMap.get(p.id) ?? 0 }))
          .sort((a, b) => b.count - a.count).slice(0, 20);
        setReferrers(list);
      }
      setLoading(false);
    })();
  }, []);

  const rankIcon = (i: number) => i === 0 ? <Crown className="h-5 w-5 text-yellow-400" /> : i === 1 ? <Medal className="h-5 w-5 text-slate-300" /> : i === 2 ? <Medal className="h-5 w-5 text-amber-700" /> : <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;

  const Row = ({ p, i, value, suffix }: { p: any; i: number; value: string; suffix?: string }) => (
    <li className={`flex items-center gap-4 py-3 px-3 rounded-xl transition-colors ${i < 3 ? "bg-primary/5" : "hover:bg-white/5"}`}>
      <div className="w-8 flex justify-center">{rankIcon(i)}</div>
      <Avatar className="h-10 w-10">
        <AvatarImage src={p.avatar_url ?? undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">{(p.full_name ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{p.full_name ?? "Anonymous"}</p>
        {p.level && <p className="text-xs text-muted-foreground">Level {p.level} · {p.xp} XP</p>}
      </div>
      <span className="brand-text font-bold">{value}{suffix}</span>
    </li>
  );

  return (
    <div className="space-y-6 animate-float-up max-w-3xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">See who's crushing it on the platform.</p>
        </div>
      </header>

      <Tabs defaultValue="all-time">
        <TabsList className="glass-strong w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="all-time">All-time</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="all-time">
          <Card className="glass-strong border-border p-4">
            {loading ? <Loading /> : (
              <ul className="space-y-1">
                {topEarners.map((p, i) => <Row key={p.id} p={p} i={i} value={`$${(p.total_earned_cents / 100).toFixed(2)}`} />)}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="glass-strong border-border p-4">
            {loading ? <Loading /> : weekly.length === 0 ? <Empty /> : (
              <ul className="space-y-1">
                {weekly.map((p, i) => <Row key={p.id} p={p} i={i} value={`$${(p.weekly_cents / 100).toFixed(2)}`} />)}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card className="glass-strong border-border p-4">
            {loading ? <Loading /> : referrers.length === 0 ? <Empty /> : (
              <ul className="space-y-1">
                {referrers.map((p, i) => <Row key={p.id} p={p} i={i} value={String(p.count)} suffix=" friends" />)}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
}
function Empty() {
  return <div className="text-center text-muted-foreground py-12"><Users className="h-8 w-8 mx-auto mb-2 opacity-50" />No data yet.</div>;
}