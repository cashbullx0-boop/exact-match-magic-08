import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  head: () => ({ meta: [{ title: "Admin · Withdrawals — CashBullX" }] }),
  component: AdminWithdrawals,
});

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

function AdminWithdrawals() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    let q = supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (tab !== "all") q = q.eq("status", tab as any);
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("admin_approve_withdrawal", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Approved");
    load();
  };
  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason?")?.trim();
    if (!reason) return;
    const { error } = await supabase.rpc("admin_reject_withdrawal", {
      _id: id,
      _reason: reason,
    });
    if (error) return toast.error(error.message);
    toast.success("Rejected and refunded");
    load();
  };
  const markPaid = async (id: string, tx: string) => {
    if (!tx) return toast.error("Enter tx hash");
    const { error } = await supabase.rpc("admin_mark_withdrawal_paid", {
      _id: id,
      _tx_hash: tx,
    });
    if (error) return toast.error(error.message);
    toast.success("Marked as paid");
    load();
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Withdrawals</h1>
        <p className="text-muted-foreground mt-1">Review, approve, reject and finalize payouts.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full overflow-x-auto flex justify-start">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <Card className="glass-strong border-border p-4 mt-4">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No items.</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((w) => (
                  <Row key={w.id} w={w} onApprove={approve} onReject={reject} onPaid={markPaid} />
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  w,
  onApprove,
  onReject,
  onPaid,
}: {
  w: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPaid: (id: string, tx: string) => void;
}) {
  const [tx, setTx] = useState(w.tx_hash ?? "");
  return (
    <li className="py-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{fmt(w.amount_cents)}</span>
          <Badge variant="outline">USDT {w.network}</Badge>
          <Badge className="capitalize">{w.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
          {w.wallet_address}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          user {w.user_id.slice(0, 8)}… · {new Date(w.created_at).toLocaleString()}
          {w.rejection_reason ? ` · ${w.rejection_reason}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(w.status === "pending" || w.status === "approved") && (
          <>
            {w.status === "pending" && (
              <Button size="sm" onClick={() => onApprove(w.id)}>
                Approve
              </Button>
            )}
            <Input
              placeholder="tx hash"
              value={tx}
              onChange={(e) => setTx(e.target.value)}
              className="h-9 w-44 font-mono text-xs"
            />
            <Button size="sm" variant="secondary" onClick={() => onPaid(w.id, tx.trim())}>
              Mark paid
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReject(w.id)}>
              Reject
            </Button>
          </>
        )}
      </div>
    </li>
  );
}