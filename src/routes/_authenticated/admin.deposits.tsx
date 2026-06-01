import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ShieldCheck, ShieldX, Eye, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  head: () => ({ meta: [{ title: "Deposits Review — Admin" }] }),
  component: AdminDepositsPage,
});

type Row = {
  id: string;
  user_id: string;
  amount_usd: number;
  network: string;
  wallet_address: string;
  tx_hash: string | null;
  slip_path: string | null;
  status: "pending" | "confirming" | "approved" | "completed" | "failed" | "expired";
  rejection_reason: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  confirming: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  expired: "bg-muted text-muted-foreground",
};

function AdminDepositsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [slipUrl, setSlipUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.tx_hash ?? "").toLowerCase().includes(s)
        || r.user_id.includes(s)
        || r.wallet_address.toLowerCase().includes(s);
    }
    return true;
  }), [rows, filter, search]);

  const openDetail = async (r: Row) => {
    setSelected(r);
    setReason(r.rejection_reason ?? "");
    setSlipUrl(undefined);
    if (r.slip_path) {
      const { data } = await supabase.storage.from("deposit-slips").createSignedUrl(r.slip_path, 600);
      setSlipUrl(data?.signedUrl);
    }
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_approve_deposit", { _deposit_id: selected.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit approved and balance credited");
    setSelected(null);
    load();
  };

  const reject = async () => {
    if (!selected) return;
    if (!reason.trim()) { toast.error("Provide a rejection reason"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_reject_deposit", { _deposit_id: selected.id, _reason: reason.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit rejected");
    setSelected(null);
    load();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Deposit Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Review, approve, or reject user deposits.</p>
      </div>

      <Card className="p-4 glass-strong">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-10" placeholder="Search tx hash, user id, address..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirming">Confirming</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="failed">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass-strong overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No deposits found</p>
        ) : (
          <>
          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-border/40">
            {filtered.map((r) => (
              <li key={r.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-base">${Number(r.amount_usd).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{r.user_id.slice(0, 12)}…</p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.network.replace("USDT_", "")} · {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <Button size="sm" variant="outline" className="h-11 mt-1" onClick={() => openDetail(r)}>
                  <Eye className="h-4 w-4 mr-1" /> Review
                </Button>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Network</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Tx hash</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-medium">${Number(r.amount_usd).toFixed(2)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{r.network.replace("USDT_", "")}</td>
                    <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs truncate max-w-[160px]">{r.tx_hash ?? "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetail(r)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Deposit Review</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Field label="User ID" value={selected.user_id} mono />
                <Field label="Amount" value={`$${Number(selected.amount_usd).toFixed(2)} USDT`} />
                <Field label="Network" value={selected.network} />
                <Field label="Submitted" value={new Date(selected.created_at).toLocaleString()} />
                <Field label="Wallet address" value={selected.wallet_address} mono />
                <Field label="Tx hash" value={selected.tx_hash ?? "—"} mono copy />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Deposit slip</div>
                {slipUrl ? (
                  <a href={slipUrl} target="_blank" rel="noopener noreferrer">
                    <img src={slipUrl} alt="slip" loading="lazy" decoding="async" className="w-full max-h-80 object-contain rounded-md border border-border/50 bg-black/30" />
                  </a>
                ) : (
                  <div className="w-full h-32 rounded-md border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">No slip uploaded</div>
                )}
              </div>

              {selected.status !== "approved" && selected.status !== "completed" && (
                <div>
                  <Label>Rejection reason (required to reject)</Label>
                  <Textarea className="mt-1" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Tx hash not found on blockchain" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="outline" onClick={reject} disabled={busy || selected.status === "approved" || selected.status === "completed"} className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10">
                  <ShieldX className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={approve} disabled={busy || selected.status === "approved" || selected.status === "completed"} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <ShieldCheck className="h-4 w-4" /> Approve & credit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono, copy }: { label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 break-all flex items-center gap-2 ${mono ? "font-mono text-xs" : ""}`}>
        <span className="flex-1">{value}</span>
        {copy && value !== "—" && (
          <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}