import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLivePrices, type AssetPrice } from "@/lib/prices.functions";
import type { TickerEvent } from "@/lib/ticker.functions";

// TODO: When the platform has enough real activity, swap the simulated pool
// below for live data from `getRecentEarnings` (src/lib/ticker.functions.ts).
// The component contract (TickerEvent[]) is already aligned for that switch.
const NAMES: { name: string; country: string }[] = [
  { name: "Ali Raza", country: "PK" },
  { name: "Ahmed Khan", country: "PK" },
  { name: "Hassan Sheikh", country: "PK" },
  { name: "Sara Malik", country: "PK" },
  { name: "Fatima Noor", country: "PK" },
  { name: "Bilal Iqbal", country: "PK" },
  { name: "Rohan Sharma", country: "IN" },
  { name: "Priya Patel", country: "IN" },
  { name: "Arjun Kumar", country: "IN" },
  { name: "Ananya Singh", country: "IN" },
  { name: "Omar Al Farsi", country: "AE" },
  { name: "Layla Hassan", country: "AE" },
  { name: "Mohammed Saeed", country: "SA" },
  { name: "Noura Alotaibi", country: "SA" },
  { name: "James Carter", country: "US" },
  { name: "Emily Johnson", country: "US" },
  { name: "Michael Brown", country: "US" },
  { name: "Olivia Wilson", country: "GB" },
  { name: "Liam Walker", country: "GB" },
  { name: "Rakib Hossain", country: "BD" },
  { name: "Nusrat Jahan", country: "BD" },
  { name: "Mehmet Yilmaz", country: "TR" },
  { name: "Elif Demir", country: "TR" },
  { name: "Budi Santoso", country: "ID" },
  { name: "Siti Rahayu", country: "ID" },
  { name: "Aiman Tan", country: "MY" },
  { name: "Nurul Aziz", country: "MY" },
];

const TASK_TYPES = ["Video Watch", "Referral Bonus", "Survey Complete", "App Install"];

function randomEvent(): TickerEvent {
  const p = NAMES[Math.floor(Math.random() * NAMES.length)];
  const amount = Math.round((0.5 + Math.random() * 24.5) * 100) / 100;
  const type = TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
  return { username: p.name, country: p.country, amount, type, description: null };
}

function makePool(): TickerEvent[] {
  return Array.from({ length: 14 }, randomEvent);
}

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

function countryToFlag(input: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.length === 2 && /^[a-zA-Z]{2}$/.test(trimmed)) {
    const code = trimmed.toUpperCase();
    return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  }
  return "";
}

function Item({ e }: { e: TickerEvent }) {
  const flag = countryToFlag(e.country);
  return (
    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-5 py-1 sm:py-1.5 text-[11px] sm:text-xs md:text-sm whitespace-nowrap">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot shrink-0" />
      <span className="text-foreground/90 font-medium">{e.username}</span>
      {flag && <span className="text-muted-foreground">{flag}</span>}
      <span className="text-muted-foreground hidden sm:inline">earned</span>
      <span className="text-emerald-400 font-semibold">${e.amount.toFixed(2)}</span>
      <span className="text-muted-foreground hidden sm:inline">· {e.type}</span>
      <span className="mx-1.5 sm:mx-2 md:mx-3 text-border">•</span>
    </span>
  );
}

function AssetItem({ a }: { a: AssetPrice }) {
  const m = META[a.symbol] ?? { emoji: "•", label: a.name, color: "text-foreground/90" };
  const up = a.change >= 0;
  return (
    <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-5 py-1 sm:py-1.5 text-[11px] sm:text-xs md:text-sm whitespace-nowrap">
      <span aria-hidden>{m.emoji}</span>
      <span className={`font-semibold ${m.color}`}>{m.label}</span>
      <span className={`font-bold ${m.color}`}>${fmt(a.price)}</span>
      <span className={`font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {up ? "▲" : "▼"} {Math.abs(a.change).toFixed(2)}%
      </span>
      <span className="mx-1.5 sm:mx-2 md:mx-3 text-border">•</span>
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const assets: AssetPrice[] = data?.assets ?? FALLBACK;

  // Simulated activity pool — refreshes every 3.5s so the ticker feels live.
  const [events, setEvents] = useState<TickerEvent[]>(() => makePool());
  useEffect(() => {
    const id = setInterval(() => {
      setEvents((prev) => [randomEvent(), ...prev.slice(0, 13)]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const row = useMemo(() => {
    const mixed: Array<{ kind: "event"; data: TickerEvent } | { kind: "asset"; data: AssetPrice }> = [];
    events.forEach((e, i) => {
      mixed.push({ kind: "event", data: e });
      if (i % 3 === 0) mixed.push({ kind: "asset", data: assets[(i / 3) % assets.length] });
    });
    return [...mixed, ...mixed];
  }, [assets, events]);

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