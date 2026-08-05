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
  ArrowDownToLine, Copy, Check, AlertCircle, Clock, CheckCircle2, XCircle, Loader2, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  NETWORKS, type DepositNetwork, type DepositStatus,
  createDepositRequest, attachTxHash, listUserDeposits, uploadDepositSlip,
  deleteDepositIfPending, getDepositAddress, depositErrorMessage,
} from "@/lib/deposits";
import { MAX_SLIP_BYTES, isAcceptedSlip, canPreview } from "@/lib/slip-file";

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
  slip_path: string | null;
  status: DepositStatus;
  created_at: string;
  expires_at: string | null;
};

const DRAFT_KEY = "cbx.depositDraft";

/**
 * Users often paste a full explorer URL or a hash with spaces/quotes.
 * The server only accepts [A-Za-z0-9_-]{6,128}, so normalise first —
 * otherwise a perfectly valid payment fails at the very last step.
 */
export function normalizeTxHash(raw: string): string {
  let v = raw.trim().replace(/^["']|["']$/g, "");
  if (v.includes("/")) v = v.split(/[?#]/)[0]!.split("/").filter(Boolean).pop() ?? v;
  return v.replace(/^0x/i, (m) => m).replace(/\s+/g, "");
}

export function txHashError(raw: string): string | null {
  const v = normalizeTxHash(raw);
  if (v.length === 0) return "Enter the transaction hash";
  if (v.length < 6) return "Transaction hash looks too short";
  if (v.length > 128) return "Transaction hash looks too long";
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return "Transaction hash can only contain letters and numbers";
  return null;
}

const statusMeta: Record<DepositStatus, { label: string; icon: typeof Clock; cls: string }> = {
  pending:    { label: "Pending",     icon: Clock,        cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  confirming: { label: "Confirming",  icon: Loader2,      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approved:   { label: "Approved",    icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
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

/**
 * Recovery panel: lets a user finish a pending deposit whose slip or tx hash
 * never made it through (dropped connection, closed tab, etc.).
 */
function IncompleteDeposit({
  deposit, busy, onSlip, onTxHash,
}: {
  deposit: DepositRow;
  busy: boolean;
  onSlip: (file: File | null) => void;
  onTxHash: (value: string) => void;
}) {
  const [hash, setHash] = useState("");
  return (
    <div className="mt-3 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
      <p className="text-[11px] text-amber-300 flex items-start gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
        This deposit is missing {!deposit.slip_path ? "your payment slip" : ""}
        {!deposit.slip_path && !deposit.tx_hash ? " and " : ""}
        {!deposit.tx_hash ? "the transaction hash" : ""}. Add it here so our team can approve it.
      </p>
      {!deposit.slip_path && (
        <Input
          type="file"
          accept="image/*,.heic,.heif,application/pdf"
          disabled={busy}
          onChange={(e) => onSlip(e.target.files?.[0] ?? null)}
          className="text-xs file:text-xs file:bg-white/5 file:border-0 file:text-foreground file:mr-3 file:py-1.5 file:px-2.5 file:rounded-md"
        />
      )}
      {!deposit.tx_hash && (
        <div className="flex gap-2">
          <Input
            placeholder="Transaction hash"
            value={hash}
            disabled={busy}
            onChange={(e) => setHash(e.target.value)}
            className="font-mono text-xs"
          />
          <Button size="sm" disabled={busy || !hash.trim()} onClick={() => onTxHash(hash)}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DepositPage() {
  const { user } = useAuth();
  const [network, setNetwork] = useState<DepositNetwork>("USDT_TRC20");
  const [amount, setAmount] = useState("");
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [txHash, setTxHash] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  // Restore an in-progress amount/tx hash so a refresh or crash never loses it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { amount?: string; txHash?: string };
      if (d.amount) setAmount(d.amount);
      if (d.txHash) setTxHash(d.txHash);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      if (!amount && !txHash) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ amount, txHash }));
    } catch { /* ignore */ }
  }, [amount, txHash]);

  const net = NETWORKS[network];
  // Address is fetched from the server on every visit — never trusted from the bundle.
  const [payAddress, setPayAddress] = useState<string | null>(null);
  const [addrError, setAddrError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPayAddress(null);
    setAddrError(false);
    getDepositAddress(network)
      .then((a) => { if (!cancelled) setPayAddress(a); })
      .catch(() => { if (!cancelled) setAddrError(true); });
    return () => { cancelled = true; };
  }, [network]);

  const handleSlipChange = (file: File | null) => {
    if (!file) {
      setSlipFile(null);
      setSlipPreview(null);
      return;
    }
    if (!isAcceptedSlip(file)) {
      toast.error("Only images or PDF files are allowed");
      return;
    }
    if (file.size > MAX_SLIP_BYTES) {
      toast.error("File is too large (max 15MB)");
      return;
    }
    setSlipFile(file);
    if (canPreview(file)) {
      setSlipPreview(URL.createObjectURL(file));
    } else {
      setSlipPreview(null);
    }
  };

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

  const amt = parseFloat(amount);
  const amountValid =
    Number.isFinite(amt) && amt >= net.minAmount && Math.round(amt * 100) % 1000 === 0;
  const amountError =
    amount.length === 0
      ? null
      : !Number.isFinite(amt) || amt <= 0
      ? "Enter a valid amount"
      : amt < net.minAmount
      ? `Minimum deposit is ${net.minAmount} USDT`
      : Math.round(amt * 100) % 1000 !== 0
      ? "Amount must be in multiples of $10"
      : null;

  const resetForm = () => {
    setAmount("");
    setTxHash("");
    setSlipFile(null);
    setSlipPreview(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!amountValid) return toast.error(amountError ?? "Enter a valid amount");
    if (!slipFile) return toast.error("Please upload your payment slip or screenshot as proof");
    const hashErr = txHashError(txHash);
    if (hashErr) return toast.error(hashErr);

    setSubmitting(true);
    let createdId: string | null = null;
    let slipDone = false;
    console.info("[deposit:submit] start", {
      amount: amt, network,
      txHashLength: txHash.trim().length,
      slipSize: slipFile.size,
    });
    try {
      // 1. Create DB row only now that user has filled everything.
      const row = (await createDepositRequest({
        userId: user.id, amountUsd: amt, network,
      })) as DepositRow;
      createdId = row.id;
      console.info("[deposit:submit] deposit created", { depositId: row.id });

      // 2. Attach remaining artifacts. Any failure → roll the row back.
      await uploadDepositSlip(user.id, row.id, slipFile);
      slipDone = true;
      console.info("[deposit:submit] slip uploaded", { depositId: row.id });
      await attachTxHash(row.id, normalizeTxHash(txHash));
      console.info("[deposit:submit] tx hash attached", { depositId: row.id });

      console.info("[deposit:submit] success", { depositId: row.id });
      toast.success("Deposit submitted — pending admin review");
      resetForm();
      refresh();
    } catch (e: any) {
      console.error("[deposit:submit] failed", {
        depositId: createdId,
        message: e?.message,
        code: e?.code,
      });
      if (createdId && slipDone) {
        // Proof is already stored — never throw the user's money proof away.
        // Keep the row and let them finish the tx hash from history.
        toast.warning(
          "Your deposit and payment slip were saved. Add the transaction hash from your deposit history below.",
          { duration: 8000 },
        );
        refresh();
      } else {
        if (createdId) {
          // Nothing was attached yet — avoid an orphaned pending row.
          await deleteDepositIfPending(createdId);
        }
        toast.error(depositErrorMessage(e), { duration: 8000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Recovery actions for incomplete pending deposits ----
  const fixSlip = async (d: DepositRow, file: File | null) => {
    if (!user || !file) return;
    if (!isAcceptedSlip(file)) return toast.error("Only images or PDF files are allowed");
    if (file.size > MAX_SLIP_BYTES) return toast.error("File is too large (max 15MB)");
    setFixing(d.id);
    try {
      await uploadDepositSlip(user.id, d.id, file);
      toast.success("Payment slip attached");
      refresh();
    } catch (e: any) {
      toast.error(depositErrorMessage(e), { duration: 8000 });
    } finally {
      setFixing(null);
    }
  };

  const fixTxHash = async (d: DepositRow, value: string) => {
    const err = txHashError(value);
    if (err) return toast.error(err);
    setFixing(d.id);
    try {
      await attachTxHash(d.id, normalizeTxHash(value));
      toast.success("Transaction hash attached");
      refresh();
    } catch (e: any) {
      toast.error(depositErrorMessage(e), { duration: 8000 });
    } finally {
      setFixing(null);
    }
  };

  const submitLabel = !amountValid
    ? "Enter a valid amount"
    : !slipFile
    ? "Upload payment slip"
    : txHashError(txHash)
    ? (txHashError(txHash) as string)
    : "Submit deposit";

  const submitDisabled =
    submitting ||
    !amountValid ||
    !slipFile ||
    !!txHashError(txHash);

  return (
    <div className="space-y-6 animate-float-up">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Deposit USDT</h1>
        <p className="text-sm text-muted-foreground">
          Fund your CashBullX wallet using USDT on TRC20 or BEP20 networks.
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT: New deposit */}
        <Card className="glass p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">New deposit</h2>
              <p className="text-xs text-muted-foreground">Fill in every field — nothing is saved until you submit</p>
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
            <div className="flex flex-wrap gap-2">
              {[50, 100, 250].map((v) => (
                <button key={v} type="button" onClick={() => setAmount(String(v))}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-border text-muted-foreground hover:text-foreground transition">
                  ${v.toFixed(2)}
                </button>
              ))}
            </div>
            {amountError && (
              <p className="text-[11px] text-destructive">{amountError}</p>
            )}
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

          {/* Receiving address — visible once amount is valid */}
          {amountValid && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium">
                Send exactly <span className="text-primary">${amt.toFixed(2)} USDT</span> on{" "}
                <span className="text-primary">{net.label}</span> to:
              </p>
              {addrError ? (
                <p className="text-xs text-destructive">Could not load the deposit address securely. Please refresh and try again.</p>
              ) : !payAddress ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
              <>
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-white">
                  <QRCodeSVG value={payAddress} size={160} level="M" />
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] p-2.5">
                <code className="text-xs font-mono break-all flex-1">{payAddress}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(payAddress, "addr-new")}>
                  {copied === "addr-new" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              </>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="txhash" className="text-xs">
              Transaction hash <span className="text-destructive">*</span>
            </Label>
            <Input
              id="txhash"
              placeholder="Paste tx hash after sending"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slip" className="text-xs">
              Payment slip / screenshot <span className="text-destructive">*</span>{" "}
              <span className="text-muted-foreground">(image or PDF, max 15MB)</span>
            </Label>
            <Input
              id="slip"
              type="file"
              accept="image/*,.heic,.heif,application/pdf"
              onChange={(e) => handleSlipChange(e.target.files?.[0] ?? null)}
              className="text-xs file:text-xs file:bg-white/5 file:border-0 file:text-foreground file:mr-3 file:py-1.5 file:px-2.5 file:rounded-md"
            />
            {slipFile && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Selected: {slipFile.name} ({(slipFile.size / 1024).toFixed(0)} KB)
                </p>
                {slipPreview && (
                  <img
                    src={slipPreview}
                    alt="Payment slip preview"
                    loading="lazy"
                    decoding="async"
                    className="max-h-48 w-auto rounded-md border border-border object-contain bg-black/30"
                  />
                )}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={submitDisabled} className="w-full h-11" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            {submitLabel}
          </Button>
        </Card>

        {/* RIGHT: Instructions */}
        <Card className="glass p-4 sm:p-6 space-y-4">
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
      <Card className="glass p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold">Deposit history</h2>
            <p className="text-xs text-muted-foreground">Track all your funding transactions</p>
          </div>
          <Badge variant="outline" className="border-border">{deposits.length} total</Badge>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full overflow-x-auto flex justify-start">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Approved</TabsTrigger>
          </TabsList>
          {(["all", "pending", "completed"] as const).map((tab) => {
            const rows = deposits.filter((d) =>
              tab === "all" ? true : tab === "pending" ? d.status === "pending" || d.status === "confirming" : d.status === "approved" || d.status === "completed"
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
                      <div key={d.id} className="rounded-lg border border-border p-3 hover:bg-white/[0.02] transition">
                      <div className="grid grid-cols-2 md:grid-cols-[1fr_120px_140px_1fr_140px_120px] gap-2 md:gap-3 items-start md:items-center text-sm">
                        <div className="text-xs text-muted-foreground col-span-2 md:col-span-1">{new Date(d.created_at).toLocaleString()}</div>
                        <div className="font-medium">${Number(d.amount_usd).toFixed(2)}</div>
                        <div className="text-xs"><Badge variant="secondary" className="text-[10px]">{NETWORKS[d.network].label}</Badge></div>
                        <div className="font-mono text-xs flex items-center gap-1.5 min-w-0 col-span-2 md:col-span-1">
                          {d.tx_hash ? (
                            <>
                              <span className="truncate">{shortHash(d.tx_hash)}</span>
                              <button onClick={() => copy(d.tx_hash!, `h-${d.id}`)} className="text-muted-foreground hover:text-foreground shrink-0">
                                {copied === `h-${d.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground truncate">{shortHash(d.wallet_address, 4)}</div>
                        <div className="justify-self-end md:justify-self-auto"><StatusBadge status={d.status} /></div>
                      </div>
                      {(d.status === "pending" || d.status === "confirming") && (!d.slip_path || !d.tx_hash) && (
                        <IncompleteDeposit
                          deposit={d}
                          busy={fixing === d.id}
                          onSlip={(f) => fixSlip(d, f)}
                          onTxHash={(v) => fixTxHash(d, v)}
                        />
                      )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>
    </div>
  );
}
