import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Gift, Wallet, Trophy, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — CashBullX" }] }),
  component: NotificationsPage,
});

const ICONS: Record<string, any> = {
  reward: Gift, withdrawal: Wallet, achievement: Trophy, system: AlertCircle, task: CheckCheck,
};

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif-page:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <div className="space-y-6 animate-float-up max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/15"><Bell className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground text-sm">Real-time updates from your account.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4 mr-1" />Mark all read</Button>
      </header>

      <Card className="glass-strong border-border p-2">
        {loading ? (
          <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? AlertCircle;
              return (
                <li key={n.id} className={`flex gap-3 p-3 rounded-xl transition-colors ${n.read ? "opacity-60" : "bg-primary/5"}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${n.read ? "bg-muted" : "bg-primary/15"}`}>
                    <Icon className={`h-5 w-5 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}