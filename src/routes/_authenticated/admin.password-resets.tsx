import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/password-resets")({
  head: () => ({ meta: [{ title: "Password Resets — Admin" }] }),
  component: AdminPasswordResetsPage,
});

type Row = { id: string; user_id: string; status: string; requested_at: string };

function AdminPasswordResetsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true }); }, [isAdmin, loading, navigate]);

  const load = async () => {
    const { data, error } = await supabase.from("password_reset_requests")
      .select("id,user_id,status,requested_at")
      .order("requested_at", { ascending: false }).limit(100);
    if (error) toast.error(error.message); else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const approve = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("admin_approve_password_reset" as any, { _request_id: id } as any);
    if (error) { setBusy(null); toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : (data as any);
    const rawToken = row?.token as string | undefined;
    const email = row?.email as string | undefined;
    if (!rawToken || !email) { setBusy(null); toast.error("Approval returned no token"); return; }

    // Send the reset link via Lovable Emails.
    try {
      const resetUrl = `${window.location.origin}/reset-password?rid=${encodeURIComponent(id)}&token=${encodeURIComponent(rawToken)}`;
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      const res = await fetch("/lovable/email/transactional/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          templateName: "password-reset-link",
          recipientEmail: email,
          idempotencyKey: `pwd-reset-link-${id}`,
          templateData: { resetUrl, siteName: "CashBullX" },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("Failed to send reset link email", res.status, body);
        toast.error("Approved, but email failed to send");
      } else {
        toast.success(`Approved — reset link emailed to ${email}`);
      }
    } catch (err) {
      console.error("Failed to send reset link email", err);
      toast.error("Approved, but email failed to send");
    } finally {
      setBusy(null);
      load();
    }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Password reset requests</h1>
          <p className="text-muted-foreground text-sm">Approve a request to email the user a secure single-use reset link (valid 1 hour).</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card className="glass-strong border-amber-400/20 p-8 text-center text-muted-foreground">No requests.</Card>
      ) : rows.map((r) => (
        <Card key={r.id} className="glass-strong border-amber-400/20 p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono">User {r.user_id.slice(0,8)}…</p>
            <p className="text-xs text-muted-foreground">Requested {new Date(r.requested_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={r.status === "pending" ? "secondary" : "default"} className="capitalize">{r.status}</Badge>
            {r.status === "pending" && (
              <Button disabled={busy === r.id} onClick={() => approve(r.id)} className="bg-gradient-to-r from-amber-400 to-amber-600 text-[#2a1a00] font-semibold">
                {busy === r.id ? "Approving…" : "Approve & send link"}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}