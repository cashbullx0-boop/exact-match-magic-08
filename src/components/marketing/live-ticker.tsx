import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLivePrices, type AssetPrice } from "@/lib/prices.functions";

const FALLBACK: AssetPrice[] = [
  { symbol: "XAU", name: "Gold", price: 3320.5, change: 0.45 },
  { symbol: "USDT", name: "Tether", price: 1.0, change: 0.01 },
  { symbol: "WTI", name: "Crude Oil", price: 78.25, change: -0.32 },
];

const META: Record<string, { emoji: string; label: string; color: string }> = {
  XAU: { emoji: "🥇", label: "Gold", color: "text-yellow-300" },
  USDT: { emoji: "💵", label: "USDT", color: "text-emerald-400" },
  WTI: { emoji: "🛢️", label: "Oil", color: "text-zinc-300" },
};

function fmt(n: number) {
  return n >= 100 ? n.toFixed(2) : n.toFixed(2);
}

const EVENTS = [
  { name: "Sarah", country: "🇺🇸", action: "earned", amount: "$47.50", kind: "Survey" },
  { name: "Ahmed", country: "🇵🇰", action: "earned", amount: "$125.00", kind: "App Install" },
  { name: "Maria", country: "🇧🇷", action: "earned", amount: "$89.75", kind: "Video" },
  { name: "James", country: "🇬🇧", action: "earned", amount: "$210.00", kind: "Offer" },
  { name: "Fatima", country: "🇦🇪", action: "earned", amount: "$65.25", kind: "Survey" },
  { name: "Chen", country: "🇨🇳", action: "earned", amount: "$175.50", kind: "App Install" },
  { name: "Anna", country: "🇩🇪", action: "earned", amount: "$95.00", kind: "Special Offer" },
  { name: "Mohammed", country: "🇸🇦", action: "earned", amount: "$150.75", kind: "Survey" },
];

function Item({ e }: { e: (typeof EVENTS)[number] }) {
  return (
    <span className="inline-flex items-center gap-2 px-5 py-1.5 text-xs md:text-sm whitespace-nowrap">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
      <span className="text-foreground/90 font-medium">{e.name}</span>
      <span className="text-muted-foreground">{e.country}</span>
      <span className="text-muted-foreground">{e.action}</span>
      <span className="text-emerald-400 font-semibold">{e.amount}</span>
      <span className="text-muted-foreground">· {e.kind}</span>
      <span className="mx-3 text-border">•</span>
    </span>
  );
}

function AssetItem({ a }: { a: AssetPrice }) {
  const m = META[a.symbol] ?? { emoji: "•", label: a.name, color: "text-foreground/90" };
  const up = a.change >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-5 py-1.5 text-xs md:text-sm whitespace-nowrap">
      <span aria-hidden>{m.emoji}</span>
      <span className={`font-semibold ${m.color}`}>{m.label}</span>
      <span className={`font-bold ${m.color}`}>${fmt(a.price)}</span>
      <span className={`font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {up ? "▲" : "▼"} {Math.abs(a.change).toFixed(2)}%
      </span>
      <span className="mx-3 text-border">•</span>
    </span>
  );
}

export function LiveTicker() {
  const fetchPrices = useServerFn(getLivePrices);
  const { data } = useQuery({
    queryKey: ["live-prices"],
    queryFn: () => fetchPrices(),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const assets: AssetPrice[] = data?.assets ?? FALLBACK;

  // Interleave assets between events so prices appear regularly across the ticker
  const mixed: Array<{ kind: "event"; data: (typeof EVENTS)[number] } | { kind: "asset"; data: AssetPrice }> = [];
  EVENTS.forEach((e, i) => {
    mixed.push({ kind: "event", data: e });
    if (i % 3 === 0) mixed.push({ kind: "asset", data: assets[(i / 3) % assets.length] });
  });
  const row = [...mixed, ...mixed];
  return (
    <div className="border-b border-border/60 bg-black/40 backdrop-blur-xl overflow-hidden">
      <div className="container mx-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 max-w-full">
        <div className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
          <TrendingUp className="h-3 w-3" /> Live
        </div>
        <div className="relative flex-1 min-w-0 overflow-hidden ticker-mask">
          <div className="flex w-max animate-ticker">
            {row.map((item, i) =>
              item.kind === "asset" ? <AssetItem key={i} a={item.data} /> : <Item key={i} e={item.data} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}