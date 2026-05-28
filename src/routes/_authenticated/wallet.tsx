import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownToLine, Wallet as WalletIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — CashBullX" }] }),
  component: WalletPage,
});

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setTxns(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const withdraw = async () => {
    if (!user || !profile) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) { toast.error("Enter a valid amount"); return; }
    if (cents > profile.balance_cents) { toast.error("Insufficient balance"); return; }
    if (cents < 500) { toast.error("Minimum withdrawal is $5.00"); return; }
    setLoading(true);
    await supabase.from("transactions").insert({ user_id: user.id, type: "withdrawal", amount_cents: -cents, description: "Withdrawal request" });
    await supabase.from("profiles").update({ balance_cents: profile.balance_cents - cents }).eq("id", user.id);
    setLoading(false);
    setAmount("");
    toast.success("Withdrawal requested!");
    refreshProfile();
    load();
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground mt-1">Track balance, earnings, and request payouts.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-strong border-border p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-30" style={{ background: "var(--gradient-primary)" }} />
          <WalletIcon className="h-5 w-5 text-primary" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Available balance</p>
          <p className="text-4xl font-bold mt-2 brand-text">{fmt(profile?.balance_cents ?? 0)}</p>
        </Card>
        <Card className="glass-strong border-border p-6">
          <TrendingUp className="h-5 w-5 text-accent" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Lifetime earned</p>
          <p className="text-4xl font-bold mt-2">{fmt(profile?.total_earned_cents ?? 0)}</p>
        </Card>
      </div>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Request withdrawal</h2>
        <p className="text-sm text-muted-foreground mt-1">Minimum $5.00. Processed within 1–3 business days.</p>
        <div className="flex gap-2 mt-4 max-w-md">
          <Input type="number" min="5" step="0.01" placeholder="Amount in USD" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11" />
          <Button disabled={loading} onClick={withdraw} className="btn-primary-gradient h-11">Withdraw</Button>
        </div>
      </Card>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">All transactions</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {txns.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{t.description ?? t.type.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.type.replace("_", " ")}</p>
                </div>
                <span className={`text-sm font-semibold ${t.amount_cents >= 0 ? "text-accent" : "text-destructive"}`}>
                  {t.amount_cents >= 0 ? "+" : ""}{fmt(t.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}