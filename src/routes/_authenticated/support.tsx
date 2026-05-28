import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — CashBullX" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user || !subject.trim() || !message.trim()) { toast.error("Subject and message required"); return; }
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject: subject.trim().slice(0, 120), message: message.trim().slice(0, 2000),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket submitted");
    setSubject(""); setMessage("");
    load();
  };

  return (
    <div className="space-y-6 animate-float-up max-w-3xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-accent/15"><LifeBuoy className="h-6 w-6 text-accent" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground text-sm">Send us a question, we typically reply within 24h.</p>
        </div>
      </header>

      <Card className="glass-strong border-border p-6 space-y-4">
        <h2 className="font-semibold">New ticket</h2>
        <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="What's going on?" /></div>
        <div><Label>Message</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Describe your issue or question..." /></div>
        <Button onClick={submit} disabled={sending} className="btn-primary-gradient">Submit ticket</Button>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Your tickets ({tickets.length})</h2>
        {tickets.length === 0 ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{t.subject}</p>
                  <Badge variant={t.status === "open" ? "default" : "secondary"} className="capitalize">{t.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{t.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(t.created_at).toLocaleString()}</p>
                {t.admin_reply && (
                  <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-xs font-semibold text-primary mb-1">Support team replied</p>
                    <p className="text-sm">{t.admin_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}