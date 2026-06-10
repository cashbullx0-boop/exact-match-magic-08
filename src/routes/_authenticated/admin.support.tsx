import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({ meta: [{ title: "Support Tickets — Admin" }] }),
  component: AdminSupportPage,
});

type Row = { id: string; user_id: string; subject: string; message: string; status: string; admin_reply: string | null; created_at: string };

function AdminSupportPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    const { data, error } = await supabase.from("support_tickets")
      .select("*").in("status", ["open", "pending"]).order("created_at", { ascending: false }).limit(100);
    if (error) toast.error(error.message); else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const reply = async (id: string) => {
    const r = (replies[id] ?? "").trim();
    if (!r) { toast.error("Write a reply"); return; }
    setBusy(id);
    const { error } = await supabase.from("support_tickets")
      .update({ admin_reply: r, status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Reply sent"); setReplies((s) => ({ ...s, [id]: "" })); load(); }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <LifeBuoy className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Support tickets</h1>
          <p className="text-muted-foreground text-sm">Reply to open user tickets.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card className="glass-strong border-amber-400/20 p-8 text-center text-muted-foreground">No open tickets.</Card>
      ) : rows.map((t) => (
        <Card key={t.id} className="glass-strong border-amber-400/20 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground font-mono">{t.user_id.slice(0,8)}… · {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <Badge variant="secondary" className="capitalize">{t.status}</Badge>
          </div>
          <p className="text-sm bg-amber-500/5 border border-amber-400/10 rounded-lg p-3 whitespace-pre-wrap">{t.message}</p>
          <Textarea value={replies[t.id] ?? ""} onChange={(e) => setReplies((s) => ({ ...s, [t.id]: e.target.value }))} placeholder="Write your reply…" rows={3} />
          <Button disabled={busy === t.id} onClick={() => reply(t.id)} className="bg-gradient-to-r from-amber-400 to-amber-600 text-[#2a1a00] font-semibold">
            <Send className="h-4 w-4" /> Send reply & close
          </Button>
        </Card>
      ))}
    </div>
  );
}