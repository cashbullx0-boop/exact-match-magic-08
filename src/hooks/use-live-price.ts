import { useEffect, useRef, useState } from "react";

export type LiveStatus = "connecting" | "live" | "fallback" | "offline";

export type LivePriceState = {
  price: number | null;
  change24h: number | null;
  history: number[]; // last N prices, oldest -> newest
  direction: "up" | "down" | "flat";
  status: LiveStatus;
};

// symbol -> Binance stream / CoinGecko id
const BINANCE: Record<string, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
};
const COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
};

const MAX_POINTS = 20;

/**
 * Live price feed for a crypto symbol via Binance WebSocket with CoinGecko
 * REST fallback. Falls back to the supplied `fallback` price/change if both
 * sources are unavailable (e.g. for non-crypto symbols like XAU/WTI).
 */
export function useLivePrice(
  symbol: string,
  fallback?: { price: number; change: number },
): LivePriceState {
  const [state, setState] = useState<LivePriceState>(() => ({
    price: fallback?.price ?? null,
    change24h: fallback?.change ?? null,
    history: fallback ? [fallback.price] : [],
    direction: "flat",
    status: "connecting",
  }));
  const prevRef = useRef<number | null>(fallback?.price ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let pendingPrice: number | null = null;
    let pendingChange: number | null = null;
    let stopped = false;

    const apply = (price: number, change: number | null, status: LiveStatus) => {
      if (stopped || !isFinite(price)) return;
      const prev = prevRef.current;
      const direction: "up" | "down" | "flat" =
        prev == null || price === prev ? "flat" : price > prev ? "up" : "down";
      prevRef.current = price;
      setState((s) => {
        const history = [...s.history, price].slice(-MAX_POINTS);
        return {
          price,
          change24h: change ?? s.change24h,
          history,
          direction,
          status,
        };
      });
    };

    // Update at most ~once per second from the firehose
    const startThrottle = () => {
      tickTimer = setInterval(() => {
        if (pendingPrice != null) {
          apply(pendingPrice, pendingChange, "live");
          pendingPrice = null;
        }
      }, 1000);
    };

    const startFallback = async () => {
      const id = COINGECKO[symbol];
      if (!id) {
        if (fallback) apply(fallback.price, fallback.change, "fallback");
        else setState((s) => ({ ...s, status: "offline" }));
        return;
      }
      const tick = async () => {
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
          );
          if (!res.ok) throw new Error("rest fail");
          const j = await res.json();
          const price = j?.[id]?.usd;
          const change = j?.[id]?.usd_24h_change ?? null;
          if (typeof price === "number") apply(price, change, "fallback");
        } catch {
          setState((s) => ({ ...s, status: "offline" }));
        }
      };
      await tick();
      pollTimer = setInterval(tick, 5000);
    };

    const stream = BINANCE[symbol];
    if (!stream) {
      // Non-crypto: try CoinGecko, else just hold fallback.
      startFallback();
      return () => {
        stopped = true;
        if (pollTimer) clearInterval(pollTimer);
      };
    }

    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@ticker`);
      const failTimer = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch {}
          startFallback();
        }
      }, 4000);

      ws.onopen = () => {
        clearTimeout(failTimer);
        setState((s) => ({ ...s, status: "live" }));
        startThrottle();
      };
      ws.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data);
          const price = parseFloat(d.c);
          const change = parseFloat(d.P);
          if (isFinite(price)) {
            pendingPrice = price;
            pendingChange = isFinite(change) ? change : pendingChange;
          }
        } catch {}
      };
      ws.onerror = () => {
        clearTimeout(failTimer);
        try { ws?.close(); } catch {}
      };
      ws.onclose = () => {
        clearTimeout(failTimer);
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        if (!stopped && !pollTimer) startFallback();
      };
    } catch {
      startFallback();
    }

    return () => {
      stopped = true;
      if (tickTimer) clearInterval(tickTimer);
      if (pollTimer) clearInterval(pollTimer);
      try { ws?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return state;
}

/** Tiny SVG sparkline from a series of numbers. */
export function Sparkline({
  data,
  color,
  height = 40,
  width = 120,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.8}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}