import { TrendingUp } from "lucide-react";

const EVENTS = [
  { name: "John", country: "🇺🇸 USA", action: "earned", amount: "$12.40", kind: "Survey" },
  { name: "Ali", country: "🇦🇪 UAE", action: "completed", amount: "$8.10", kind: "Offer" },
  { name: "Sarah", country: "🇨🇦 Canada", action: "withdrew", amount: "$25.00", kind: "Wallet" },
  { name: "Priya", country: "🇮🇳 India", action: "earned", amount: "$5.30", kind: "Video" },
  { name: "Leo", country: "🇧🇷 Brazil", action: "completed", amount: "$14.75", kind: "App install" },
  { name: "Emma", country: "🇬🇧 UK", action: "earned", amount: "$9.20", kind: "Survey" },
  { name: "Yusuf", country: "🇹🇷 Türkiye", action: "earned", amount: "$6.50", kind: "Offer" },
  { name: "Mia", country: "🇦🇺 Australia", action: "withdrew", amount: "$40.00", kind: "Wallet" },
  { name: "Hiro", country: "🇯🇵 Japan", action: "completed", amount: "$11.00", kind: "Survey" },
  { name: "Noah", country: "🇩🇪 Germany", action: "earned", amount: "$3.80", kind: "Video" },
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

export function LiveTicker() {
  const row = [...EVENTS, ...EVENTS];
  return (
    <div className="border-b border-border/60 bg-black/40 backdrop-blur-xl">
      <div className="container mx-auto flex items-center gap-3 px-4 py-2">
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
          <TrendingUp className="h-3 w-3" /> Live
        </div>
        <div className="relative flex-1 overflow-hidden ticker-mask">
          <div className="flex w-max animate-ticker">
            {row.map((e, i) => <Item key={i} e={e} />)}
          </div>
        </div>
      </div>
    </div>
  );
}