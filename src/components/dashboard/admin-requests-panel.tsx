import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, KeyRound } from "lucide-react";
import { toast } from "sonner";

type WalletReq = { id: string; user_id: string; old_wallet: string | null; new_wallet: string; status: string; requested_at: string };
type ResetReq = { id: string; user_id: string; status: string; requested_at: string };

export function AdminRequestsPanel() {
  const [wallets, setWallets] = useState<WalletReq[]>([]);
  const [resets, setResets] = useState<ResetReq[]>([]);

  const load = async () => {
    const [{ data: w }, { data: r }] = await Promise.all([
      supabase.from("wallet_change_requests").select("id,user_id,old_wallet,new_wallet,status,requested_at")
        .eq("status", "pending").order("requested_at", { ascending: false }).limit(20),
      supabase.from("password_reset_requests").select("id,user_id,status,requested_at")
        .eq("status", "pending").order("requested_at", { ascending: false }).limit(20),
    ]);
    setWallets((w as WalletReq[]) ?? []);
    setResets((r as ResetReq[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const approveWallet = async (id: string) => {
    const { error } = await supabase.rpc("admin_approve_wallet_change", { _request_id: id });
    if (error) toast.error(error.message); else { toast.success("Approved — OTP sent"); load(); }
  };
  const approveReset = async (id: string) => {
    const { error } = await supabase.rpc("admin_approve_password_reset", { _request_id: id });
    if (error) toast.error(error.message); else { toast.success("Approved — OTP sent"); load(); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Wallet change requests
          <Badge variant="secondary">{wallets.length}</Badge>
        </h2>
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-border">
            {wallets.map((w) => (
              <li key={w.id} className="py-3 space-y-1">
                <p className="text-xs text-muted-foreground">User: <span className="font-mono">{w.user_id.slice(0, 8)}…</span></p>
                <p className="text-xs break-all"><span className="text-muted-foreground">New:</span> <span className="font-mono">{w.new_wallet}</span></p>
                <Button size="sm" onClick={() => approveWallet(w.id)} className="btn-primary-gradient mt-2">Approve & send OTP</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Password reset requests
          <Badge variant="secondary">{resets.length}</Badge>
        </h2>
        {resets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-border">
            {resets.map((r) => (
              <li key={r.id} className="py-3 space-y-1">
                <p className="text-xs text-muted-foreground">User: <span className="font-mono">{r.user_id.slice(0, 8)}…</span></p>
                <p className="text-xs text-muted-foreground">Requested {new Date(r.requested_at).toLocaleString()}</p>
                <Button size="sm" onClick={() => approveReset(r.id)} className="btn-primary-gradient mt-2">Approve & send OTP</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}