import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, CheckCircle2, Clock, RefreshCw, SkipForward } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  head: () => ({ meta: [{ title: "Job Monitoring — Admin" }] }),
  component: JobsPage,
});

type Run = {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: string;
  trades_processed: number;
  cycles_credited: number;
  missed_cycles: number;
  total_credited_cents: number;
  skipped: boolean;
  error_message: string | null;
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const ago = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function JobsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("cron_job_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRuns((data ?? []) as Run[]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [isAdmin]);

  const stats = useMemo(() => {
    const recent = runs.slice(0, 60); // ~last hour
    return {
      total: recent.length,
      success: recent.filter((r) => r.status === "success").length,
      errors: recent.filter((r) => r.status === "error").length,
      skipped: recent.filter((r) => r.skipped).length,
      avgDuration: recent.length
        ? Math.round(
            recent.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / recent.length
          )
        : 0,
      credited: recent.reduce((s, r) => s + (r.total_credited_cents ?? 0), 0),
      cycles: recent.reduce((s, r) => s + (r.cycles_credited ?? 0), 0),
    };
  }, [runs]);

  const lastRun = runs[0];
  const lastSuccess = runs.find((r) => r.status === "success");
  const lastError = runs.find((r) => r.status === "error");
  const stale = lastRun ? Date.now() - new Date(lastRun.started_at).getTime() > 5 * 60 * 1000 : true;

  if (loading || !isAdmin) return null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Job Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">
            Background cron jobs (auto trade profits, etc.)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Health banner */}
      <Card
        className={`p-4 border-2 ${
          stale
            ? "border-destructive/40 bg-destructive/5"
            : lastError && lastError.id === lastRun?.id
            ? "border-destructive/40 bg-destructive/5"
            : "border-emerald-500/40 bg-emerald-500/5"
        }`}
      >
        <div className="flex items-center gap-3">
          {stale ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : lastError && lastError.id === lastRun?.id ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              {stale
                ? "⚠️ Job has not run in the last 5 minutes"
                : lastError && lastError.id === lastRun?.id
                ? "❌ Last run failed"
                : "✅ Job is healthy"}
            </div>
            <div className="text-xs text-muted-foreground">
              {lastRun
                ? `Last run ${ago(lastRun.started_at)} · ${lastRun.status}`
                : "No runs recorded yet"}
              {lastSuccess && lastSuccess.id !== lastRun?.id && (
                <> · last success {ago(lastSuccess.started_at)}</>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Runs (last ~hour)" value={stats.total.toString()} />
        <StatCard
          label="Success / Errors"
          value={`${stats.success} / ${stats.errors}`}
          tone={stats.errors > 0 ? "danger" : "ok"}
        />
        <StatCard label="Avg duration" value={`${stats.avgDuration} ms`} />
        <StatCard
          label="Credited"
          value={fmt(stats.credited)}
          subtle={`${stats.cycles} cycles`}
        />
      </div>

      {/* Runs table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Recent runs</h2>
          <span className="text-xs text-muted-foreground">Auto-refresh every 15s</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Duration</th>
                <th className="text-right px-3 py-2">Trades</th>
                <th className="text-right px-3 py-2">Cycles</th>
                <th className="text-right px-3 py-2">Missed</th>
                <th className="text-right px-3 py-2">Credited</th>
                <th className="text-left px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No runs yet. The cron job runs every minute.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-mono text-xs">{new Date(r.started_at).toLocaleTimeString()}</div>
                    <div className="text-[10px] text-muted-foreground">{ago(r.started_at)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} skipped={r.skipped} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {r.duration_ms != null ? `${r.duration_ms}ms` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.trades_processed}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.cycles_credited}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {r.missed_cycles > 0 ? (
                      <span className="text-amber-500">{r.missed_cycles}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-500">
                    {r.total_credited_cents > 0 ? `+${fmt(r.total_credited_cents)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-destructive max-w-[280px] truncate">
                    {r.error_message ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, subtle, tone }: { label: string; value: string; subtle?: string; tone?: "ok" | "danger" }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-bold font-mono ${
          tone === "danger" ? "text-destructive" : tone === "ok" ? "text-emerald-500" : ""
        }`}
      >
        {value}
      </div>
      {subtle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtle}</div>}
    </Card>
  );
}

function StatusBadge({ status, skipped }: { status: string; skipped: boolean }) {
  if (skipped) {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-500 gap-1">
        <SkipForward className="h-3 w-3" /> skipped
      </Badge>
    );
  }
  if (status === "success") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 gap-1">
        <CheckCircle2 className="h-3 w-3" /> success
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
        <AlertCircle className="h-3 w-3" /> error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" /> {status}
    </Badge>
  );
}