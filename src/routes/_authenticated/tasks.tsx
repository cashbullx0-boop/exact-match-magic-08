import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Smartphone, ClipboardList, FileText, Gift, ExternalLink, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  onSubmit: (taskId: string, watchedSeconds?: number) => Promise<void>;
  submitting: boolean;
}) {
  const Icon = CATEGORY_ICONS[task.category] ?? FileText;
  const rewardUsd = (task.reward_cents / 100).toFixed(2);

  const isVideo = task.category === "video";
  const estimatedMinutes = task.estimated_minutes ?? 0;
  const requiredSeconds = isVideo ? Math.ceil(estimatedMinutes * 60 * 0.7) : 0;

  const [watched, setWatched] = useState(0);
  const [started, setStarted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick only while our tab is hidden (user is on the video tab).
  useEffect(() => {
    if (!started || !isVideo) return;

    const startTicking = () => {
      if (tickRef.current) return;
      tickRef.current = setInterval(() => {
        setWatched((s) => (s < requiredSeconds ? s + 1 : s));
      }, 1000);
    };
    const stopTicking = () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) startTicking();
      else stopTicking();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopTicking();
    };
  }, [started, isVideo, requiredSeconds]);

  const done = completionStatus === "approved";
  const pending = completionStatus === "pending";

  const handleStart = async () => {
    if (task.url) {
      window.open(task.url, "_blank", "noopener,noreferrer");
    }
    if (isVideo) {
      setStarted(true);
      return; // wait for the user to come back and claim
    }
    await onSubmit(task.id);
  };

  const handleClaim = async () => {
    await onSubmit(task.id, watched);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const canClaim = isVideo && started && watched >= requiredSeconds && !done && !pending;
  const showProgress = isVideo && started && !done && !pending;

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

        {showProgress ? (
          <div className="mt-4 space-y-1.5">
            <Progress value={Math.min(100, (watched / Math.max(requiredSeconds, 1)) * 100)} />
            <p className="text-xs text-muted-foreground">
              Watched {fmt(Math.min(watched, requiredSeconds))} / {fmt(requiredSeconds)} needed
              {!document.hidden && watched < requiredSeconds ? " — switch to the video tab to keep watching" : ""}
            </p>
          </div>
        ) : null}

        {canClaim ? (
          <Button
            onClick={handleClaim}
            disabled={submitting}
            className="mt-5 w-full btn-primary-gradient"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Claim Reward</>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={submitting || done || pending || (isVideo && started)}
            className="mt-5 w-full btn-primary-gradient"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
            ) : done ? (
              <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed</>
            ) : pending ? (
              <><Clock className="h-4 w-4 mr-1.5" /> Pending review</>
            ) : isVideo && started ? (
              <><Clock className="h-4 w-4 mr-1.5" /> Keep watching…</>
            ) : (
              <>Start Task <ExternalLink className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        )}
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

  const submitCompletion = async (taskId: string, watchedSeconds?: number) => {
    if (!user) { toast.error("Please sign in"); return; }
    setSubmittingId(taskId);
    // reward_cents and status are forced by the task_completions_guard_insert trigger.
    const payload: {
      user_id: string;
      task_id: string;
      reward_cents: number;
      watched_seconds?: number;
    } = {
      user_id: user.id,
      task_id: taskId,
      reward_cents: 0,
    };
    if (typeof watchedSeconds === "number") payload.watched_seconds = watchedSeconds;
    const { error } = await supabase.from("task_completions").insert(payload);
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
