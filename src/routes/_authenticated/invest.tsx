import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getInvestPrices, type AssetPrice } from "@/lib/prices.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Lock, Coins, Bitcoin, Droplet, Gem } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({ meta: [{ title: "Invest — CashBullX" }] }),
  component: InvestPage,
});

const ICONS: Record<string, any> = { XAU: Gem, BTC: Bitcoin, ETH: Coins, WTI: Droplet };

// Deterministic seeded random walk for 7-day sparkline
function buildSeries(symbol: string, price: number, change: number) {
  let seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const points = 28;
  const start = price / (1 + change / 100);
  const step = (price - start) / points;
  const vol = price * 0.012;
  const out: { t: number; v: number }[] = [];
  let v = start;
  for (let i = 0; i < points; i++) {
    v = v + step + (rand() - 0.5) * vol;
    out.push({ t: i, v: Math.max(v, 0.01) });
  }
  out[out.length - 1].v = price;
  return out;
}

function InvestPage() {
  const { user, profile, refreshProfile } = useAuth();
  const fetchPrices = useServerFn(getInvestPrices);
  const { data: pricesData } = useQuery({
    queryKey: ["invest-prices"],
    queryFn: () => fetchPrices(),
    refetchInterval: 30_000,
  });
  const assets = pricesData?.assets ?? [];

  const [hasDeposit, setHasDeposit] = useState<boolean | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [modalAsset, setModalAsset] = useState<AssetPrice | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadInvestments = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("investments").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setInvestments(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase.from("deposits").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).in("status", ["approved", "completed"]);
      setHasDeposit((count ?? 0) > 0);
    })();
    loadInvestments();
  }, [user]);

  const balance = profile?.balance_cents ?? 0;

  const confirmInvest = async () => {
    if (!modalAsset) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents < 5000) { toast.error("Minimum investment is $50"); return; }
    if (cents > balance) { toast.error("Insufficient balance"); return; }
    setSubmitting(true);
    const { error } = await (supabase.rpc as any)("create_investment", {
      _asset: modalAsset.symbol,
      _asset_name: modalAsset.name,
      _amount_cents: cents,
      _entry_price: modalAsset.price,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Investment placed");
    setModalAsset(null);
    setAmount("");
    await Promise.all([refreshProfile(), loadInvestments()]);
  };

  if (hasDeposit === null) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!hasDeposit) {
    return (
      <div className="space-y-6 animate-float-up">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Invest</h1>
        </header>
        <Card className="glass-strong border-border p-10 text-center">
          <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold">Please make a deposit to access investments</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Once your deposit is approved, you'll be able to invest in Gold, Bitcoin, Ethereum, and Crude Oil.
          </p>
          <Button className="mt-5 btn-primary-gradient" onClick={() => (window.location.href = "/deposit")}>
            Go to deposit
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-float-up">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Invest</h1>
          <p className="text-muted-foreground mt-1">Invest in commodities and crypto. Returns are managed by admin.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Balance</p>
          <p className="brand-text text-xl font-bold">${(balance / 100).toFixed(2)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {assets.map((a) => {
          const up = a.change >= 0;
          const Icon = ICONS[a.symbol] ?? Coins;
          const data = buildSeries(a.symbol, a.price, a.change);
          const color = up ? "hsl(var(--primary))" : "hsl(0 70% 55%)";
          return (
            <Card key={a.symbol} className="glass-strong border-border p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold leading-none">{a.name}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{a.symbol}</p>
                  </div>
                </div>
                <Badge variant={up ? "default" : "destructive"} className="text-[10px]">
                  {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {a.change.toFixed(2)}%
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-3 tabular-nums">
                ${a.price < 10 ? a.price.toFixed(4) : a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <div className="h-24 -mx-2 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id={`g-${a.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                      labelFormatter={() => ""}
                      formatter={(v: any) => [`$${Number(v).toFixed(2)}`, a.symbol]}
                    />
                    <Area type="monotone" dataKey="v" stroke={color} fill={`url(#g-${a.symbol})`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Button className="mt-3 btn-primary-gradient" onClick={() => { setModalAsset(a); setAmount(""); }}>
                Invest Now
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="glass-strong border-border p-6">
        <h2 className="font-semibold mb-4">My investments</h2>
        {investments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No investments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Return %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.asset_name} <span className="text-xs text-muted-foreground">({i.asset})</span></TableCell>
                    <TableCell>${(i.amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          i.status === "active" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                          : i.status === "completed" ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                        }
                        variant="outline"
                      >
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(i.return_percent) > 0 ? "text-green-400" : Number(i.return_percent) < 0 ? "text-red-400" : ""}`}>
                      {Number(i.return_percent).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={!!modalAsset} onOpenChange={(o) => !o && setModalAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invest in {modalAsset?.name}</DialogTitle>
            <DialogDescription>
              Current price: ${modalAsset?.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available balance</span>
              <span className="font-semibold">${(balance / 100).toFixed(2)}</span>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Enter amount to invest (min $50)</label>
              <Input
                type="number" min="50" step="1"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
              />
            </div>
            <p className="text-xs text-muted-foreground border border-border/60 rounded-md p-3">
              Returns are managed by admin. Past performance does not guarantee future results.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalAsset(null)}>Cancel</Button>
            <Button onClick={confirmInvest} disabled={submitting} className="btn-primary-gradient">
              {submitting ? "Submitting…" : "Confirm Investment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}