import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Smartphone, ClipboardList, FileText, Gift, ExternalLink, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — CashBullX" }] }),
  component: TasksPage,
});

type DbTask = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  reward_cents: number;
  url: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  video: PlayCircle,
  app_install: Smartphone,
  survey: ClipboardList,
  offer: Gift,
};

function TaskCardComponent({
  task,
  completionStatus,
  onSubmit,
  submitting,
}: {
  task: DbTask;
  completionStatus: "approved" | "pending" | "rejected" | null;
  onSubmit: (taskId: string) => Promise<void>;
  submitting: boolean;
}) {
  const Icon = CATEGORY_ICONS[task.category] ?? FileText;
  const rewardUsd = (task.reward_cents / 100).toFixed(2);

  const handleStart = async () => {
    if (task.url) {
      window.open(task.url, "_blank", "noopener,noreferrer");
    }
    await onSubmit(task.id);
  };

  const done = completionStatus === "approved";
  const pending = completionStatus === "pending";

  return (
    <Card
      className="relative overflow-hidden border-border p-0 flex flex-col transition-all glass-strong hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
    >
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <Badge
            variant="outline"
            className="text-xs font-semibold border-emerald-500/40 text-emerald-400 bg-emerald-500/10 capitalize"
          >
            {task.category.replace("_", " ")}
          </Badge>
        </div>

        <h3 className="mt-4 text-lg font-bold">{task.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{task.description ?? ""}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xl font-bold brand-text">${rewardUsd} USDT</span>
          {task.estimated_minutes ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {task.estimated_minutes}m
            </span>
          ) : null}
        </div>

        <Button
          onClick={handleStart}
          disabled={submitting || done || pending}
          className="mt-5 w-full btn-primary-gradient"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed</>
          ) : pending ? (
            <><Clock className="h-4 w-4 mr-1.5" /> Pending review</>
          ) : (
            <>Start Task <ExternalLink className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </Card>
  );
}

function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<Record<string, "approved" | "pending" | "rejected">>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: t, error: tErr }, { data: c }] = await Promise.all([
      supabase.from("tasks").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      user
        ? supabase.from("task_completions").select("task_id, status").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { task_id: string; status: string }[] }),
    ]);
    if (tErr) toast.error(tErr.message);
    setTasks((t ?? []) as DbTask[]);
    const map: Record<string, "approved" | "pending" | "rejected"> = {};
    for (const row of (c ?? []) as { task_id: string; status: string }[]) {
      map[row.task_id] = row.status as "approved" | "pending" | "rejected";
    }
    setCompletions(map);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submitCompletion = async (taskId: string) => {
    if (!user) { toast.error("Please sign in"); return; }
    setSubmittingId(taskId);
    // reward_cents and status are forced by the task_completions_guard_insert trigger.
    const { error } = await supabase.from("task_completions").insert({
      user_id: user.id,
      task_id: taskId,
      reward_cents: 0,
    });
    setSubmittingId(null);
    if (error) { toast.error(error.message); return; }
    setCompletions((prev) => ({ ...prev, [taskId]: "pending" }));
    toast.success("Submitted! Reward will credit after review.");
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Earn Rewards</h1>
        <p className="text-muted-foreground mt-1">Complete tasks and earn USDT rewards instantly.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading tasks…
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No active tasks right now. Check back soon.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCardComponent
              key={task.id}
              task={task}
              completionStatus={completions[task.id] ?? null}
              onSubmit={submitCompletion}
              submitting={submittingId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
