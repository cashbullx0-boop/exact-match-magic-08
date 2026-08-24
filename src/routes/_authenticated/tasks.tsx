import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ClipboardList, Clock } from "lucide-react";

/** Tasks unlock 90 days after 24 Aug 2026 → 22 Nov 2026, 00:00 UTC. */
const LAUNCH_AT = Date.UTC(2026, 10, 22, 0, 0, 0);

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  return {
    done: ms === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — CashBullX" }] }),
  component: TasksComingSoon,
});

function TasksComingSoon() {
  const t = useCountdown(LAUNCH_AT);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-lg w-full p-10 text-center bg-card/60 backdrop-blur border-border/50 shadow-xl">
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <ClipboardList className="w-12 h-12 text-primary" />
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {t.done ? "Tasks Are Live" : "Tasks Coming Soon"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {t.done
            ? "Tasks are unlocking now — refresh to get started."
            : "Tasks unlock in 90 days. Rewards are on their way — stay tuned!"}
        </p>

        {!t.done && (
          <div className="mt-7 grid grid-cols-4 gap-2">
            {[
              { label: "Days", value: t.days },
              { label: "Hours", value: t.hours },
              { label: "Mins", value: t.minutes },
              { label: "Secs", value: t.seconds },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border/60 bg-white/5 py-3">
                <p className="text-2xl font-bold tabular-nums">{String(c.value).padStart(2, "0")}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}