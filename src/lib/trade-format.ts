// Pure helpers used by the trade UI. Kept dependency-free so they can be unit-tested.

/** Flat 2% ROI profit in cents (floored, matches server-side `floor(amount_cents * 0.02)`). */
export const TRADE_PROFIT_RATE = 0.02;
export function tradeProfitCents(amountCents: number): number {
  return Math.floor(amountCents * TRADE_PROFIT_RATE);
}

/** Allowed trade durations in hours. */
export const TRADE_DURATIONS = [4, 8, 12] as const;
export type TradeDuration = (typeof TRADE_DURATIONS)[number];

/** Validate a trade amount in cents. Returns an error message, or null when valid. */
export function validateTradeAmount(amountCents: number, balanceCents: number): string | null {
  if (!Number.isFinite(amountCents) || amountCents < 5000) return "Minimum trade amount is $50";
  if (amountCents % 1000 !== 0) return "Amount must be in multiples of $10 (50, 60, 70...)";
  if (amountCents > balanceCents) return "Insufficient wallet balance";
  return null;
}

/** Format USD cents as `$X.XX` — always exactly two decimals. */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/** Format a number of seconds as `HH:MM:SS`. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Server-side trade settlement uses Postgres `timestamptz + interval '24 hours'`,
 * which is absolute (24 * 3600 seconds) regardless of DST.
 *
 * This mirrors that calculation client-side for tests and previews.
 */
export function addAbsoluteHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 3600 * 1000);
}

/** What hour does this instant show on the wall clock in the given IANA zone? */
export function wallHourIn(zone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, hour: "2-digit", hour12: false,
  }).formatToParts(instant);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  // Intl can emit "24" for midnight in some locales; normalise to 0.
  const n = Number(h);
  return n === 24 ? 0 : n;
}