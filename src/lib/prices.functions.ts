import { createServerFn } from "@tanstack/react-start";

export type AssetPrice = {
  symbol: string;
  name: string;
  price: number;
  change: number; // percent
};

async function fetchStooq(symbol: string): Promise<{ open: number; close: number } | null> {
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlc&h&e=csv`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    // Symbol,Date,Time,Open,High,Low,Close
    const open = parseFloat(cols[3]);
    const close = parseFloat(cols[6]);
    if (!isFinite(open) || !isFinite(close) || close <= 0) return null;
    return { open, close };
  } catch {
    return null;
  }
}

async function fetchUsdt(): Promise<AssetPrice | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd&include_24hr_change=true"
    );
    if (!res.ok) return null;
    const j: any = await res.json();
    const price = j?.tether?.usd;
    const change = j?.tether?.usd_24h_change ?? 0;
    if (typeof price !== "number") return null;
    return { symbol: "USDT", name: "Tether", price, change };
  } catch {
    return null;
  }
}

async function fetchCoin(id: string, symbol: string, name: string): Promise<AssetPrice | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!res.ok) return null;
    const j: any = await res.json();
    const price = j?.[id]?.usd;
    const change = j?.[id]?.usd_24h_change ?? 0;
    if (typeof price !== "number") return null;
    return { symbol, name, price, change };
  } catch {
    return null;
  }
}

export const getLivePrices = createServerFn({ method: "GET" }).handler(async () => {
  const [gold, oil, usdt] = await Promise.all([
    fetchStooq("xauusd"),
    fetchStooq("cl.f"),
    fetchUsdt(),
  ]);

  const assets: AssetPrice[] = [
    gold
      ? { symbol: "XAU", name: "Gold", price: gold.close, change: ((gold.close - gold.open) / gold.open) * 100 }
      : { symbol: "XAU", name: "Gold", price: 3320.5, change: 0.45 },
    usdt ?? { symbol: "USDT", name: "Tether", price: 1.0, change: 0.01 },
    oil
      ? { symbol: "WTI", name: "Crude Oil", price: oil.close, change: ((oil.close - oil.open) / oil.open) * 100 }
      : { symbol: "WTI", name: "Crude Oil", price: 78.25, change: -0.32 },
  ];

  return { assets, fetchedAt: Date.now() };
});

export const getInvestPrices = createServerFn({ method: "GET" }).handler(async () => {
  const [gold, oil, btc, eth] = await Promise.all([
    fetchStooq("xauusd"),
    fetchStooq("cl.f"),
    fetchCoin("bitcoin", "BTC", "Bitcoin"),
    fetchCoin("ethereum", "ETH", "Ethereum"),
  ]);
  const assets: AssetPrice[] = [
    { symbol: "XAU", name: "Gold",
      price: gold?.close ?? 3320.5,
      change: gold ? ((gold.close - gold.open) / gold.open) * 100 : 0.45 },
    btc ?? { symbol: "BTC", name: "Bitcoin", price: 68000, change: 1.2 },
    eth ?? { symbol: "ETH", name: "Ethereum", price: 3500, change: 0.8 },
    { symbol: "WTI", name: "Crude Oil",
      price: oil?.close ?? 78.25,
      change: oil ? ((oil.close - oil.open) / oil.open) * 100 : -0.32 },
  ];
  return { assets, fetchedAt: Date.now() };
});