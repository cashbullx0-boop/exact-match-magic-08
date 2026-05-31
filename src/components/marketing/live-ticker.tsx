import { TrendingUp } from "lucide-react";

const ASSETS: { symbol: string; name: string; price: string; change: string; gold?: boolean }[] = [
  { symbol: "XAU", name: "Gold (oz)", price: "$3,320.40", change: "+0.84%", gold: true },
  { symbol: "USDT", name: "Tether", price: "$1.00", change: "+0.02%" },
  { symbol: "USDC", name: "USD Coin", price: "$1.00", change: "+0.01%" },
];

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

function AssetItem({ a }: { a: (typeof ASSETS)[number] }) {
  return (
    <span className="inline-flex items-center gap-2 px-5 py-1.5 text-xs md:text-sm whitespace-nowrap">
      <span className={`inline-flex h-1.5 w-1.5 rounded-full animate-pulse-dot ${a.gold ? "bg-yellow-300" : "bg-sky-400"}`} />
      <span className={`font-semibold ${a.gold ? "text-yellow-300" : "text-foreground/90"}`}>{a.symbol}</span>
      <span className="text-muted-foreground">{a.name}</span>
      <span className={`font-bold ${a.gold ? "text-yellow-300" : "text-foreground/90"}`}>{a.price}</span>
      <span className="text-emerald-400 font-medium">{a.change}</span>
      <span className="mx-3 text-border">•</span>
    </span>
  );
}

export function LiveTicker() {
  // Interleave assets between events so prices appear regularly across the ticker
  const mixed: Array<{ kind: "event"; data: (typeof EVENTS)[number] } | { kind: "asset"; data: (typeof ASSETS)[number] }> = [];
  EVENTS.forEach((e, i) => {
    mixed.push({ kind: "event", data: e });
    if (i % 3 === 0) mixed.push({ kind: "asset", data: ASSETS[(i / 3) % ASSETS.length] });
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