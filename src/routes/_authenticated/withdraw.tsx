import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Wallet as WalletIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { WithdrawOtpModal } from "@/components/dashboard/withdraw-otp-modal";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — CashBullX" }] }),
  component: WithdrawPage,
});

const NETWORKS = ["TRC20", "BEP20", "ERC20"] as const;
type Network = (typeof NETWORKS)[number];

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

const statusVariant: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  approved: "bg-blue-500/15 text-blue-500",
  paid: "bg-accent/15 text-accent",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function WithdrawPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network>("TRC20");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [otpOpen, setOtpOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`wd:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` },
        () => {
          load();
          refreshProfile();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validate = () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 1000) {
      toast.error("Minimum withdrawal is $10");
      return null;
    }
    if (!profile || cents > profile.balance_cents) {
      toast.error("Insufficient balance");
      return null;
    }
    const addr = address.trim();
    if (addr.length < 20 || addr.length > 128 || !/^[A-Za-z0-9]+$/.test(addr)) {
      toast.error("Enter a valid wallet address");
      return null;
    }
    return { cents, addr };
  };

  const startVerify = () => {
    if (!validate()) return;
    setOtpOpen(true);
  };

  const submit = async () => {
    const v = validate();
    if (!v) return;
    setLoading(true);
    const { error } = await supabase.rpc("create_withdrawal", {
      _amount_cents: v.cents,
      _network: network,
      _wallet_address: v.addr,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Withdrawal requested");
    setAmount("");
    setAddress("");
    refreshProfile();
    load();
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Withdraw USDT</h1>
        <p className="text-muted-foreground mt-1">
          Minimum $10. Funds are deducted on request and refunded if rejected.
        </p>
      </header>

      <Card className="glass-strong border-border p-6 relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "var(--gradient-primary)" }}
        />
        <WalletIcon className="h-5 w-5 text-primary" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">
          Available balance
        </p>
        <p className="text-4xl font-bold mt-2 brand-text">{fmt(profile?.balance_cents ?? 0)}</p>
      </Card>

      <Card className="glass-strong border-border p-6 space-y-5">
        <h2 className="font-semibold text-lg">New withdrawal</h2>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USDT)</Label>
          <Input
            id="amount"
            type="number"
            min="10"
            step="0.01"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label>Network</Label>
          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                  network === n
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                USDT {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr">Destination wallet address</Label>
          <Input
            id="addr"
            placeholder={`Your USDT ${network} address`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-11 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Double-check the address and network. Funds sent to the wrong network or
            address are unrecoverable.
          </p>
        </div>

        <Button
          onClick={startVerify}
          disabled={loading}
          className="btn-primary-gradient h-11 w-full sm:w-auto"
        >
          {loading ? "Submitting…" : "Verify & request withdrawal"}
        </Button>
      </Card>

      {user && (
        <WithdrawOtpModal
          open={otpOpen}
          onOpenChange={setOtpOpen}
          userId={user.id}
          email={user.email}
          phone={(profile as any)?.phone}
          onVerified={submit}
        />
      )}

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">Withdrawal history</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No withdrawals yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((w) => (
              <li key={w.id} className="py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-destructive/15">
                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {fmt(w.amount_cents)} · USDT {w.network}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {w.wallet_address}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(w.created_at).toLocaleString()}
                    {w.rejection_reason ? ` · ${w.rejection_reason}` : ""}
                    {w.tx_hash ? ` · tx ${w.tx_hash.slice(0, 12)}…` : ""}
                  </p>
                </div>
                <Badge className={`capitalize ${statusVariant[w.status] ?? ""}`}>
                  {w.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-right">
          <Link to="/wallet" className="text-xs text-primary hover:underline">
            View full transaction history →
          </Link>
        </div>
      </Card>
    </div>
  );
}