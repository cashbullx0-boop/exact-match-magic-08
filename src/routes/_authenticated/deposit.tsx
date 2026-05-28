import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowDownToLine, Copy, Check, AlertCircle, Clock, CheckCircle2, XCircle, Loader2, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  NETWORKS, type DepositNetwork, type DepositStatus,
  createDepositRequest, attachTxHash, listUserDeposits,
} from "@/lib/deposits";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({ meta: [{ title: "Deposit USDT — CashBullX" }] }),
  component: DepositPage,
});

type DepositRow = {
  id: string;
  amount_usd: number;
  network: DepositNetwork;
  wallet_address: string;
  tx_hash: string | null;
  status: DepositStatus;
  created_at: string;
  expires_at: string | null;
};

const statusMeta: Record<DepositStatus, { label: string; icon: typeof Clock; cls: string }> = {
  pending:    { label: "Pending",     icon: Clock,        cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  confirming: { label: "Confirming",  icon: Loader2,      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  completed:  { label: "Completed",   icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  failed:     { label: "Failed",      icon: XCircle,      cls: "bg-destructive/15 text-destructive border-destructive/30" },
  expired:    { label: "Expired",     icon: AlertCircle,  cls: "bg-muted text-muted-foreground border-border" },
};

function StatusBadge({ status }: { status: DepositStatus }) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <Icon className={`h-3 w-3 ${status === "confirming" ? "animate-spin" : ""}`} />
      {m.label}
    </Badge>
  );
}

function shortHash(h: string, n = 6) {
  return h.length > n * 2 + 3 ? `${h.slice(0, n)}…${h.slice(-n)}` : h;
}

function DepositPage() {
  const { user } = useAuth();
  const [network, setNetwork] = useState<DepositNetwork>("USDT_TRC20");
  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [active, setActive] = useState<DepositRow | null>(null);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const net = NETWORKS[network];

  const refresh = async () => {
    if (!user) return;
    try {
      const rows = (await listUserDeposits(user.id)) as DepositRow[];
      setDeposits(rows);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load deposits");
    }
  };
  useEffect(() => { refresh(); }, [user]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreate = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < net.minAmount) return toast.error(`Minimum deposit is ${net.minAmount} USDT`);
    setCreating(true);
    try {
      const row = (await createDepositRequest({
        userId: user.id, amountUsd: amt, network,
      })) as DepositRow;
      setActive(row);
      setAmount("");
      toast.success("Deposit request created");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create deposit");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitHash = async () => {
    if (!active || !txHash.trim()) return toast.error("Enter the transaction hash");
    try {
      await attachTxHash(active.id, txHash);
      toast.success("Transaction submitted — awaiting confirmations");
      setActive(null);
      setTxHash("");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit hash");
    }
  };

  return (
    <div className="space-y-6 animate-float-up">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Deposit USDT</h1>
        <p className="text-sm text-muted-foreground">
          Fund your CashBullX wallet using USDT on TRC20 or BEP20 networks.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT: New deposit */}
        <Card className="glass p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">New deposit</h2>
              <p className="text-xs text-muted-foreground">Select network and amount to begin</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Network</Label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.values(NETWORKS)).map((n) => {
                const selected = n.id === network;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetwork(n.id)}
                    className={`relative overflow-hidden text-left rounded-xl border p-4 transition-all hover:translate-y-[-1px] ${
                      selected
                        ? "border-primary/60 shadow-[0_0_0_1px] shadow-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${n.color}`} />
                    <div className="relative">
                      <p className="font-semibold text-sm">{n.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.chain}</p>
                      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                        <span>Fee {n.fee}</span><span>•</span><span>{n.estTime}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDT)</Label>
            <div className="relative">
              <Input
                id="amount" type="number" inputMode="decimal" min={net.minAmount} step="0.01"
                placeholder={`Min ${net.minAmount} USDT`}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="pr-16 text-lg h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                USDT
              </span>
            </div>
            <div className="flex gap-2">
              {[25, 50, 100, 250].map((v) => (
                <button key={v} type="button" onClick={() => setAmount(String(v))}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-border text-muted-foreground hover:text-foreground transition">
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white/[0.02] p-3 text-xs space-y-1.5">
            <p className="flex items-start gap-2 text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
              <span>Only send <strong className="text-foreground">{net.label}</strong> to the generated address. Sending other tokens will result in permanent loss.</span>
            </p>
            <p className="text-muted-foreground pl-5">
              Funds credit after <strong className="text-foreground">{net.confirmations} confirmations</strong>.
            </p>
          </div>

          <Button onClick={handleCreate} disabled={creating || !amount} className="w-full h-11" size="lg">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
            Generate deposit address
          </Button>
        </Card>

        {/* RIGHT: Instructions */}
        <Card className="glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/15 text-accent">
              <Wallet className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">How it works</h2>
          </div>
          <ol className="space-y-3 text-sm">
            {[
              "Choose a network and the USDT amount you want to deposit.",
              "Click Generate to receive a unique receiving address and QR code.",
              "Send the exact amount from your wallet or exchange.",
              "Paste the transaction hash so we can track confirmations.",
              "Funds are credited automatically once the network confirms.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {Object.values(NETWORKS).map((n) => (
              <div key={n.id} className="rounded-lg border border-border p-3 text-xs">
                <p className="font-medium">{n.label}</p>
                <p className="text-muted-foreground mt-1">Min {n.minAmount} USDT • {n.estTime}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Deposit history</h2>
            <p className="text-xs text-muted-foreground">Track all your funding transactions</p>
          </div>
          <Badge variant="outline" className="border-border">{deposits.length} total</Badge>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          {(["all", "pending", "completed"] as const).map((tab) => {
            const rows = deposits.filter((d) =>
              tab === "all" ? true : tab === "pending" ? d.status === "pending" || d.status === "confirming" : d.status === "completed"
            );
            return (
              <TabsContent key={tab} value={tab} className="mt-4">
                {rows.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No deposits yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-[1fr_120px_140px_1fr_140px_120px] gap-3 text-[11px] uppercase tracking-wider text-muted-foreground px-3 pb-1">
                      <span>Date</span><span>Amount</span><span>Network</span><span>Tx hash</span><span>Address</span><span>Status</span>
                    </div>
                    {rows.map((d) => (
                      <div key={d.id} className="grid md:grid-cols-[1fr_120px_140px_1fr_140px_120px] gap-3 items-center rounded-lg border border-border p-3 text-sm hover:bg-white/[0.02] transition">
                        <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                        <div className="font-medium">{Number(d.amount_usd).toFixed(2)} USDT</div>
                        <div className="text-xs"><Badge variant="secondary" className="text-[10px]">{NETWORKS[d.network].label}</Badge></div>
                        <div className="font-mono text-xs flex items-center gap-1.5 min-w-0">
                          {d.tx_hash ? (
                            <>
                              <span className="truncate">{shortHash(d.tx_hash)}</span>
                              <button onClick={() => copy(d.tx_hash!, `h-${d.id}`)} className="text-muted-foreground hover:text-foreground shrink-0">
                                {copied === `h-${d.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </>
                          ) : (
                            <button className="text-primary hover:underline text-xs" onClick={() => setActive(d)}>
                              Add hash
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">{shortHash(d.wallet_address, 4)}</div>
                        <div><StatusBadge status={d.status} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>

      {/* Active deposit modal */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Send {Number(active.amount_usd).toFixed(2)} USDT</DialogTitle>
                <DialogDescription>
                  Send <strong>{NETWORKS[active.network].label}</strong> to the address below. Do not send any other token.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center py-2">
                <div className="p-3 rounded-xl bg-white">
                  <QRCodeSVG value={active.wallet_address} size={168} level="M" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Wallet address</Label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] p-2.5">
                    <code className="text-xs font-mono break-all flex-1">{active.wallet_address}</code>
                    <Button size="sm" variant="ghost" onClick={() => copy(active.wallet_address, `addr-${active.id}`)}>
                      {copied === `addr-${active.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold mt-0.5">{Number(active.amount_usd).toFixed(2)} USDT</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Status</p>
                    <div className="mt-0.5"><StatusBadge status={active.status} /></div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="txhash" className="text-xs">Transaction hash (after sending)</Label>
                  <Input id="txhash" placeholder="0x... or T..." value={txHash}
                    onChange={(e) => setTxHash(e.target.value)} className="mt-1 font-mono text-xs" />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
                <Button onClick={handleSubmitHash} disabled={!txHash.trim()}>
                  <Check className="h-4 w-4 mr-2" />Submit hash
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}