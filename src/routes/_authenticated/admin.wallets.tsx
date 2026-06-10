import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallet Changes — Admin" }] }),
  component: AdminWalletsPage,
});

type Row = { id: string; user_id: string; old_wallet: string | null; new_wallet: string; status: string; requested_at: string; admin_note: string | null };

function AdminWalletsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true }); }, [isAdmin, loading, navigate]);

  const load = async () => {
    const { data, error } = await supabase.from("wallet_change_requests")
      .select("id,user_id,old_wallet,new_wallet,status,requested_at,admin_note")
      .order("requested_at", { ascending: false }).limit(100);
    if (error) toast.error(error.message); else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_approve_wallet_change", { _request_id: id });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success("Approved — OTP sent"); load(); }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Wallet change requests</h1>
          <p className="text-muted-foreground text-sm">Review and approve user wallet address changes.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card className="glass-strong border-amber-400/20 p-8 text-center text-muted-foreground">No requests.</Card>
      ) : rows.map((r) => (
        <Card key={r.id} className="glass-strong border-amber-400/20 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">User {r.user_id.slice(0,8)}… · {new Date(r.requested_at).toLocaleString()}</p>
            <Badge variant={r.status === "pending" ? "secondary" : "default"} className="capitalize">{r.status}</Badge>
          </div>
          <p className="text-xs"><span className="text-muted-foreground">Old:</span> <span className="font-mono break-all">{r.old_wallet ?? "—"}</span></p>
          <p className="text-xs"><span className="text-muted-foreground">New:</span> <span className="font-mono break-all text-amber-300">{r.new_wallet}</span></p>
          {r.status === "pending" && (
            <Button disabled={busy === r.id} onClick={() => approve(r.id)} className="bg-gradient-to-r from-amber-400 to-amber-600 text-[#2a1a00] font-semibold">Approve & send OTP</Button>
          )}
        </Card>
      ))}
    </div>
  );
}