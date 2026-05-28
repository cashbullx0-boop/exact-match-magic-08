import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, Smartphone, Gift, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — CashBullX" }] }),
  component: TasksPage,
});

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "survey", label: "Surveys", icon: CheckCircle2 },
  { key: "video", label: "Videos", icon: PlayCircle },
  { key: "app_install", label: "App installs", icon: Smartphone },
  { key: "offer", label: "Offers", icon: Gift },
] as const;

function TasksPage() {
  const { user, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("tasks").select("*").eq("is_active", true).order("reward_cents", { ascending: false }),
      user ? supabase.from("task_completions").select("task_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
    ]);
    setTasks(t ?? []);
    setCompletedIds(new Set((c ?? []).map((x: any) => x.task_id)));
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const complete = async (task: any) => {
    if (!user) return;
    if (task.url) window.open(task.url, "_blank");
    const { error } = await supabase.from("task_completions").insert({
      user_id: user.id, task_id: task.id, reward_cents: task.reward_cents, status: "approved",
    });
    if (error) { toast.error(error.message); return; }
    // Credit wallet
    await supabase.from("transactions").insert({
      user_id: user.id, type: "task_reward", amount_cents: task.reward_cents,
      description: `Reward: ${task.title}`, related_id: task.id,
    });
    const { data: p } = await supabase.from("profiles").select("balance_cents,total_earned_cents,xp,level").eq("id", user.id).single();
    if (p) {
      const xpGain = Math.max(10, Math.floor(task.reward_cents / 5));
      const newXp = p.xp + xpGain;
      await supabase.from("profiles").update({
        balance_cents: p.balance_cents + task.reward_cents,
        total_earned_cents: p.total_earned_cents + task.reward_cents,
        xp: newXp,
        level: Math.floor(newXp / 500) + 1,
      }).eq("id", user.id);
      await supabase.from("notifications").insert({
        user_id: user.id, type: "task",
        title: "Task completed",
        body: `+$${(task.reward_cents / 100).toFixed(2)} and +${xpGain} XP from "${task.title}"`,
      });
    }
    toast.success(`+$${(task.reward_cents / 100).toFixed(2)} earned!`);
    refreshProfile();
    load();
  };

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.category === filter);

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Available tasks</h1>
        <p className="text-muted-foreground mt-1">Pick a task, complete it, get paid.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button key={c.key} variant={filter === c.key ? "default" : "outline"} size="sm" onClick={() => setFilter(c.key)} className={filter === c.key ? "btn-primary-gradient" : ""}>
            {c.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : visible.length === 0 ? (
        <Card className="glass-strong border-border p-10 text-center text-muted-foreground">
          No tasks here yet. Check back soon!
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const done = completedIds.has(t.id);
            return (
              <Card key={t.id} className="glass-strong border-border p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="capitalize">{t.category.replace("_", " ")}</Badge>
                  <span className="text-lg font-bold brand-text">${(t.reward_cents / 100).toFixed(2)}</span>
                </div>
                <h3 className="mt-3 font-semibold">{t.title}</h3>
                {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{t.description}</p>}
                {t.estimated_minutes && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> ~{t.estimated_minutes} min</p>
                )}
                <Button onClick={() => complete(t)} disabled={done} className={`mt-4 ${done ? "" : "btn-primary-gradient"}`}>
                  {done ? "Completed ✓" : (<>Start task <ExternalLink className="h-4 w-4 ml-1" /></>)}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}