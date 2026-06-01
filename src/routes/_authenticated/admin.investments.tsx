import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/investments")({
  head: () => ({ meta: [{ title: "Admin Investments — CashBullX" }] }),
  component: AdminInvestmentsPage,
});

function AdminInvestmentsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [returns, setReturns] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    const { data } = await (supabase as any).from("investments")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const complete = async (id: string) => {
    const pct = parseFloat(returns[id] ?? "0");
    if (isNaN(pct)) { toast.error("Enter a valid return %"); return; }
    const { error } = await (supabase.rpc as any)("admin_complete_investment", {
      _id: id, _return_percent: pct,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Investment completed");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase.rpc as any)("admin_cancel_investment", {
      _id: id, _reason: "Cancelled by admin",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Investment cancelled, principal refunded");
    load();
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Investment management</h1>
        <p className="text-muted-foreground mt-1">Set returns and complete user investments.</p>
      </header>

      <Card className="glass-strong border-border p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Return %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{r.user_id.slice(0, 8)}</TableCell>
                  <TableCell>{r.asset_name} <span className="text-xs text-muted-foreground">({r.asset})</span></TableCell>
                  <TableCell>${(r.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.status === "active" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                        : r.status === "completed" ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : "bg-red-500/20 text-red-300 border-red-500/30"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "active" ? (
                      <Input
                        type="number" step="0.01" placeholder="e.g. 8.5"
                        className="h-8 w-24"
                        value={returns[r.id] ?? ""}
                        onChange={(e) => setReturns({ ...returns, [r.id]: e.target.value })}
                      />
                    ) : (
                      <span className="tabular-nums">{Number(r.return_percent).toFixed(2)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "active" ? (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => complete(r.id)} className="btn-primary-gradient">Complete</Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No investments yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}