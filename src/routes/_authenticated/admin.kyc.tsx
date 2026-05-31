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
import { Search, ShieldCheck, ShieldX, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  head: () => ({ meta: [{ title: "KYC Review — Admin" }] }),
  component: AdminKycPage,
});

type Row = {
  id: string;
  user_id: string;
  full_legal_name: string;
  date_of_birth: string;
  country: string;
  id_type: string;
  id_number: string;
  id_front_path: string;
  id_back_path: string | null;
  selfie_path: string | null;
  status: "unverified" | "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  verified: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  unverified: "bg-muted text-muted-foreground",
};

function AdminKycPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<{ front?: string; back?: string; selfie?: string }>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("kyc_submissions").select("*").order("submitted_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return r.full_legal_name.toLowerCase().includes(s)
          || r.country.toLowerCase().includes(s)
          || r.id_number.toLowerCase().includes(s)
          || r.user_id.includes(s);
      }
      return true;
    });
  }, [rows, filter, search]);

  const openDetail = async (r: Row) => {
    setSelected(r);
    setRejectReason(r.rejection_reason ?? "");
    const paths = [r.id_front_path, r.id_back_path, r.selfie_path].filter(Boolean) as string[];
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrls(paths, 600);
    const map: any = {};
    data?.forEach((d, i) => {
      const key = paths[i] === r.id_front_path ? "front" : paths[i] === r.id_back_path ? "back" : "selfie";
      map[key] = d.signedUrl;
    });
    setSigned(map);
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.from("kyc_submissions").update({
      status: "verified", rejection_reason: null, reviewed_at: new Date().toISOString(),
    }).eq("id", selected.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("KYC approved");
    await supabase.from("notifications").insert({
      user_id: selected.user_id, title: "KYC Verified ✓",
      body: "Your identity verification has been approved.", type: "system", link: "/kyc",
    });
    setSelected(null);
    load();
  };

  const reject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) { toast.error("Provide a rejection reason"); return; }
    setBusy(true);
    const { error } = await supabase.from("kyc_submissions").update({
      status: "rejected", rejection_reason: rejectReason.trim(), reviewed_at: new Date().toISOString(),
    }).eq("id", selected.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("KYC rejected");
    await supabase.from("notifications").insert({
      user_id: selected.user_id, title: "KYC Rejected",
      body: `Your KYC was rejected: ${rejectReason.trim()}`, type: "system", link: "/kyc",
    });
    setSelected(null);
    load();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">KYC Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve user identity verifications.</p>
      </div>

      <Card className="p-4 glass-strong">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-10" placeholder="Search name, country, ID number..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass-strong overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No submissions found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Country</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">ID Type</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Submitted</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_legal_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{r.country}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{r.id_type}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</td>
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
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>KYC Review</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Field label="Full legal name" value={selected.full_legal_name} />
                <Field label="Date of birth" value={selected.date_of_birth} />
                <Field label="Country" value={selected.country} />
                <Field label="ID type" value={selected.id_type} />
                <Field label="ID number" value={selected.id_number} />
                <Field label="Submitted" value={new Date(selected.submitted_at).toLocaleString()} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <DocImage label="ID Front" url={signed.front} />
                <DocImage label="ID Back" url={signed.back} />
                <DocImage label="Selfie with ID" url={signed.selfie} />
              </div>

              {selected.status !== "verified" && (
                <div>
                  <Label>Rejection reason (required to reject)</Label>
                  <Textarea className="mt-1" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Selfie photo is blurry, please retake" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="outline" onClick={reject} disabled={busy} className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10">
                  <ShieldX className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={approve} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <ShieldCheck className="h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function DocImage({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img src={url} alt={label} loading="lazy" decoding="async" className="w-full h-40 object-cover rounded-md border border-border/50 hover:border-primary/60 transition" />
        </a>
      ) : (
        <div className="w-full h-40 rounded-md border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">Not provided</div>
      )}
    </div>
  );
}