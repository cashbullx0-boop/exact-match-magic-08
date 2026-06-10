import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users as UsersIcon, Search, ShieldX, ShieldCheck, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: AdminUsersPage,
});

type Row = {
  id: string; full_name: string | null; username: string | null;
  balance_cents: number; status: string; referral_code: string; created_at: string;
  ban_reason: string | null;
};

function AdminUsersPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    let query = supabase.from("profiles")
      .select("id,full_name,username,balance_cents,status,referral_code,created_at,ban_reason")
      .order("created_at", { ascending: false }).limit(200);
    if (q.trim()) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,referral_code.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) toast.error(error.message); else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin]);

  const setStatus = async (id: string, status: "active" | "suspended" | "banned", reason?: string) => {
    setBusy(id);
    const patch: any = { status };
    if (status === "banned") patch.ban_reason = reason ?? "Banned by admin";
    if (status === "active") patch.ban_reason = null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success(`User ${status}`); load(); }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <UsersIcon className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage user balances and account status.</p>
        </div>
      </header>

      <Card className="glass-strong border-amber-400/20 p-4">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, or referral code…" className="pl-9" />
          </div>
          <Button type="submit" className="bg-gradient-to-r from-amber-400 to-amber-600 text-[#2a1a00] font-semibold">Search</Button>
        </form>
      </Card>

      <Card className="glass-strong border-amber-400/20 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-amber-500/5 text-xs uppercase text-amber-200/80">
              <tr><th className="text-left p-3">User</th><th className="text-left p-3">Balance</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
              ) : rows.map((u) => (
                <tr key={u.id} className="hover:bg-amber-500/5">
                  <td className="p-3">
                    <p className="font-medium">{u.full_name ?? u.username ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{u.referral_code} · {u.id.slice(0,8)}…</p>
                  </td>
                  <td className="p-3 font-semibold text-amber-300">${(u.balance_cents/100).toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant={u.status === "active" ? "default" : u.status === "suspended" ? "secondary" : "destructive"} className="capitalize">{u.status}</Badge>
                    {u.ban_reason && <p className="text-[10px] text-muted-foreground mt-1">{u.ban_reason}</p>}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {u.status !== "active" && (
                      <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => setStatus(u.id, "active")}><ShieldCheck className="h-3.5 w-3.5" /> Activate</Button>
                    )}
                    {u.status !== "suspended" && (
                      <Button size="sm" variant="outline" disabled={busy === u.id} onClick={() => setStatus(u.id, "suspended")}><ShieldX className="h-3.5 w-3.5" /> Suspend</Button>
                    )}
                    {u.status !== "banned" && (
                      <Button size="sm" variant="destructive" disabled={busy === u.id} onClick={() => {
                        const r = window.prompt("Reason for ban?") ?? "";
                        if (r) setStatus(u.id, "banned", r);
                      }}><Ban className="h-3.5 w-3.5" /> Ban</Button>
                    )}
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