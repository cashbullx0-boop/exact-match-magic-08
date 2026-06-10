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
import { TrendingUp, TrendingDown, Lock, Coins, Bitcoin, Droplet, Gem, Radio } from "lucide-react";
import { useLivePrice, Sparkline } from "@/hooks/use-live-price";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({ meta: [{ title: "Invest — CashBullX" }] }),
  component: InvestPage,
});

const ICONS: Record<string, any> = { XAU: Gem, BTC: Bitcoin, ETH: Coins, WTI: Droplet };

function LiveAssetCard({
  asset,
  onInvest,
}: {
  asset: AssetPrice;
  onInvest: (a: AssetPrice) => void;
}) {
  const Icon = ICONS[asset.symbol] ?? Coins;
  const live = useLivePrice(asset.symbol, { price: asset.price, change: asset.change });
  const price = live.price ?? asset.price;
  const change = live.change24h ?? asset.change;
  const up = change >= 0;
  const color = up ? "#22c55e" : "#ef4444";
  const dirColor =
    live.direction === "up" ? "text-emerald-400"
    : live.direction === "down" ? "text-rose-400"
    : "text-foreground";
  const isLive = live.status === "live";
  const isFallback = live.status === "fallback";
  return (
    <Card className="glass-strong border-border p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold leading-none">{asset.name}</p>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{asset.symbol}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(isLive || isFallback) && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                isLive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
              }`}
              title={isLive ? "Binance live stream" : "CoinGecko REST"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <Radio className="h-2.5 w-2.5" />
              {isLive ? "LIVE" : "REST"}
            </span>
          )}
          <Badge variant={up ? "default" : "destructive"} className="text-[10px]">
            {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {change.toFixed(2)}%
          </Badge>
        </div>
      </div>
      <p className={`text-2xl font-bold mt-3 tabular-nums transition-colors ${dirColor}`}>
        ${price < 10 ? price.toFixed(4) : price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <div className="mt-2 flex items-center justify-center h-12">
        <Sparkline data={live.history.length > 1 ? live.history : [price, price]} color={color} width={220} height={48} />
      </div>
      <Button className="mt-3 btn-primary-gradient" onClick={() => onInvest({ ...asset, price, change })}>
        Invest Now
      </Button>
    </Card>
  );
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
        {assets.map((a) => (
          <LiveAssetCard
            key={a.symbol}
            asset={a}
            onInvest={(updated) => { setModalAsset(updated); setAmount(""); }}
          />
        ))}
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