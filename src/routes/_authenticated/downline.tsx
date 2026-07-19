import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Users, Network, RefreshCw, Coins, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/downline")({
  head: () => ({ meta: [{ title: "Downline — CashBullX" }] }),
  component: DownlinePage,
});

type LevelRow = {
  user_id: string;
  display_name: string;
  masked_email: string;
  joined_at: string;
  referred_by: string | null;
  referrer_name: string | null;
  total_count: number;
  balance_cents: number;
  status: string;
  commission_cents: number;
};

const PAGE_SIZE = 25;
const LEVELS = [1, 2, 3, 4, 5, 6] as const;

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(cents = 0) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function DownlinePage() {
  const [summary, setSummary] = useState<Record<number, number>>({});
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [commissions, setCommissions] = useState<Record<number, { count: number; total_cents: number }>>({});
  const [refreshToken, setRefreshToken] = useState(0);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    const [{ data, error: sumErr }, { data: comms, error: commErr }] = await Promise.all([
      supabase.rpc("get_downline_summary"),
      supabase.rpc("get_downline_commission_summary"),
    ]);
    if (sumErr) console.error("get_downline_summary failed:", sumErr);
    if (commErr) console.error("get_downline_commission_summary failed:", commErr);
    const m: Record<number, number> = {};
    (data ?? []).forEach((r: any) => { m[r.level] = Number(r.count); });
    setSummary(m);
    const cm: Record<number, { count: number; total_cents: number }> = {};
    (comms ?? []).forEach((r: any) => {
      cm[Number(r.level)] = { count: Number(r.count), total_cents: Number(r.total_cents) };
    });
    setCommissions(cm);
    setLoadingSummary(false);
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    const refresh = () => {
      loadSummary();
      setRefreshToken((v) => v + 1);
    };
    const channel = supabase
      .channel("downline-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, refresh)
      .subscribe();
    const fallback = window.setInterval(refresh, 30000);
    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [loadSummary]);

  const total = LEVELS.reduce((s, l) => s + (summary[l] ?? 0), 0);
  const totalCommissionCents = LEVELS.reduce((s, l) => s + (commissions[l]?.total_cents ?? 0), 0);

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Your Downline</h1>
          <p className="text-muted-foreground mt-1">All accounts across 6 referral levels beneath you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSummary}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </header>

      <Card className="glass-strong border-border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2"><Users className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Total: {loadingSummary ? "…" : total}</span></div>
          {LEVELS.map((l) => (
            <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-border">
              L{l}: <b className="text-foreground">{loadingSummary ? "…" : (summary[l] ?? 0)}</b>
            </span>
          ))}
        </div>
      </Card>

      <Card className="glass-strong border-border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Coins className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Trade commissions earned: <b className="text-accent">${(totalCommissionCents/100).toFixed(2)}</b></span>
          </div>
          {LEVELS.map((l) => {
            const c = commissions[l];
            const cents = c?.total_cents ?? 0;
            const cnt = c?.count ?? 0;
            return (
              <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-border">
                L{l}: <b className="text-accent">${(cents/100).toFixed(2)}</b>
                <span className="text-muted-foreground"> · {cnt}</span>
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Paid automatically each time a downline user's trade settles (L1 0.10% → L6 0.01% of trade principal).</p>
      </Card>

      <div className="space-y-3">
        {LEVELS.map((l) => (
          <LevelSection key={l} level={l} count={summary[l] ?? 0} refreshToken={refreshToken} />
        ))}
      </div>
    </div>
  );
}

function LevelSection({ level, count, refreshToken }: { level: number; count: number; refreshToken: number }) {
  const [open, setOpen] = useState(level === 1);
  const [rows, setRows] = useState<LevelRow[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [total, setTotal] = useState(count);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.rpc("get_downline_level", {
      _level: level, _limit: PAGE_SIZE, _offset: p * PAGE_SIZE,
    });
    if (error) {
      console.error(`get_downline_level failed (level ${level}):`, error);
      setErrorMsg(error.message || "Failed to load this level. Please try refreshing.");
      setRows([]);
    } else {
      setRows((data ?? []) as LevelRow[]);
      if (data && data.length > 0) setTotal(Number((data[0] as LevelRow).total_count));
      else setTotal(0);
    }
    setLoading(false);
    setLoaded(true);
  }, [level]);

  useEffect(() => {
    if (open && !loaded) load(0);
  }, [open, loaded, load]);

  useEffect(() => {
    if (open && loaded) load(page);
  }, [refreshToken, open, loaded, page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card className="glass-strong border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-3">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="font-semibold">Level {level}</span>
            <span className="text-xs text-muted-foreground">— {count} account{count === 1 ? "" : "s"}</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-5 pb-5">
          {loading && rows.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : errorMsg ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => load(page)}>Retry</Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No accounts at this level yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3">Name / Email</th>
                      <th className="text-left py-2 pr-3">Joined</th>
                      <th className="text-left py-2 pr-3">Referred by</th>
                      <th className="text-left py-2 pr-3">Balance</th>
                      <th className="text-left py-2 pr-3">Commission</th>
                      <th className="text-left py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} className="border-b border-border/40">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{r.display_name}</div>
                          <div className="text-xs text-muted-foreground">{r.masked_email}</div>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(r.joined_at)}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.referrer_name ?? "—"}</td>
                        <td className="py-2 pr-3 font-semibold text-foreground">{fmtMoney(r.balance_cents)}</td>
                        <td className="py-2 pr-3 font-semibold text-accent">{fmtMoney(r.commission_cents)}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{r.status ?? "active"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} · {total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0 || loading}
                    onClick={() => { const np = page - 1; setPage(np); load(np); }}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading}
                    onClick={() => { const np = page + 1; setPage(np); load(np); }}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
