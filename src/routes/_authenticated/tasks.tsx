import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Smartphone, ClipboardList, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — CashBullX" }] }),
  component: TasksPage,
});

type TaskCard = {
  id: string;
  title: string;
  description: string;
  reward: string;
  icon: React.ElementType;
  status: "active" | "coming_soon";
  hasIframe?: boolean;
};

const TASKS: TaskCard[] = [
  {
    id: "video-views",
    title: "Watch Videos & Earn",
    description: "Watch short videos and earn USDT rewards",
    reward: "0.5 USDT per video",
    icon: PlayCircle,
    status: "active",
    hasIframe: true,
  },
  {
    id: "app-installs",
    title: "Install Apps & Earn",
    description: "Install partner apps and earn big rewards",
    reward: "Up to 5 USDT per install",
    icon: Smartphone,
    status: "coming_soon",
  },
  {
    id: "surveys",
    title: "Complete Surveys & Earn",
    description: "Share your opinion and get paid",
    reward: "1-3 USDT per survey",
    icon: ClipboardList,
    status: "coming_soon",
  },
];

function TaskCardComponent({ task }: { task: TaskCard }) {
  const [iframeOpen, setIframeOpen] = useState(false);
  const isActive = task.status === "active";
  const Icon = task.icon;

  const handleStart = () => {
    if (!isActive) return;
    if (task.hasIframe) {
      setIframeOpen(true);
      toast.success("Video rewards platform loaded!");
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border-border p-0 flex flex-col transition-all ${
        isActive
          ? "glass-strong hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
          : "bg-muted/30 border-muted/50 opacity-70"
      }`}
    >
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex items-center justify-center h-12 w-12 rounded-xl ${
              isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-semibold ${
              isActive
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                : "border-amber-500/40 text-amber-400 bg-amber-500/10"
            }`}
          >
            {isActive ? "ACTIVE" : "COMING SOON"}
          </Badge>
        </div>

        <h3 className="mt-4 text-lg font-bold">{task.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xl font-bold brand-text">{task.reward}</span>
        </div>

        <Button
          onClick={handleStart}
          disabled={!isActive}
          className={`mt-5 w-full ${isActive ? "btn-primary-gradient" : ""}`}
        >
          {isActive ? (
            <>
              Start Task <ExternalLink className="h-4 w-4 ml-1" />
            </>
          ) : (
            "Coming Soon"
          )}
        </Button>
      </div>

      {task.hasIframe && iframeOpen && (
        <div className="border-t border-border p-4 bg-black/40">
          <p className="text-xs text-muted-foreground mb-2">Video Rewards Platform</p>
          <div className="w-full aspect-video rounded-lg bg-muted border border-border flex items-center justify-center">
            <div className="text-center p-4">
              <PlayCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Video platform iframe placeholder</p>
              <p className="text-xs text-muted-foreground mt-1">Integration coming soon</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function TasksPage() {
  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Earn Rewards</h1>
        <p className="text-muted-foreground mt-1">Complete tasks and earn USDT rewards instantly.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TASKS.map((task) => (
          <TaskCardComponent key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
