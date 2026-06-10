import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { AdminRequestsPanel } from "@/components/dashboard/admin-requests-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — CashBullX" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "survey", reward: "0.50", url: "", minutes: "5" });
  const [runningProfits, setRunningProfits] = useState(false);
  const [lastProfitRun, setLastProfitRun] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("admin_last_profit_run") : null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, loading, navigate]);

  const load = async () => {
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setTasks(t ?? []);
    setUsers(u ?? []);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const create = async () => {
    const cents = Math.round(parseFloat(form.reward) * 100);
    if (!form.title || !cents) { toast.error("Title and reward required"); return; }
    const { error } = await supabase.from("tasks").insert({
      title: form.title, description: form.description, category: form.category as any,
      reward_cents: cents, url: form.url || null, estimated_minutes: parseInt(form.minutes) || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    setForm({ title: "", description: "", category: "survey", reward: "0.50", url: "", minutes: "5" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const toggle = async (t: any) => {
    await supabase.from("tasks").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  };

  const runDailyProfits = async () => {
    setConfirmOpen(false);
    setRunningProfits(true);
    try {
      const { count: eligible } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("balance_cents", 5000);
      const { error } = await supabase.rpc("process_daily_profits" as any);
      if (error) throw error;
      const stamp = new Date().toISOString();
      localStorage.setItem("admin_last_profit_run", stamp);
      setLastProfitRun(stamp);
      toast.success(`Daily profits credited to ${eligible ?? 0} users`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to run daily profits");
    } finally {
      setRunningProfits(false);
    }
  };

  if (loading || !isAdmin) return <div className="text-muted-foreground">Checking access…</div>;

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Admin dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage tasks and view users.</p>
      </header>

      <Card className="glass-strong border-amber-400/30 p-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-amber-400" /> Daily profits
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Last run: {lastProfitRun ? new Date(lastProfitRun).toLocaleString() : "Never"}
            </p>
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={runningProfits}
                className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-[#2a1a00] font-bold hover:opacity-90 shadow-[0_0_24px_-4px_rgba(245,194,74,0.6)] ring-1 ring-amber-200/40"
              >
                {runningProfits ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <>💰 Run Daily Profits</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run daily profits?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to process daily profits for all active users?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runDailyProfits}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <AdminRequestsPanel />

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create task</h2>
        <div className="grid gap-3 md:grid-cols-2 mt-4">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="survey">Survey</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="app_install">App install</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reward (USD)</Label><Input type="number" step="0.01" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} /></div>
          <div><Label>Estimated minutes</Label><Input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>URL (optional)</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={create} className="mt-4 btn-primary-gradient">Create task</Button>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.category.replace("_", " ")} · ${(t.reward_cents / 100).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggle(t)}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Recent users ({users.length})</h2>
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{u.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Code: {u.referral_code}</p>
              </div>
              <span className="text-sm brand-text font-semibold">${(u.balance_cents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}