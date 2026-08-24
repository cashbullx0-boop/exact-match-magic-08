export const ALLOWED_HOURS = [4, 8, 12] as const;

export function validateTradeInput(d: { amount_cents: number; duration_hours: number }) {
  if (!Number.isInteger(d.amount_cents) || d.amount_cents < 5000 || d.amount_cents > 100_000_00) {
    throw new Error("Minimum trade amount is $50");
  }
  if (d.amount_cents % 1000 !== 0) throw new Error("Amount must be a multiple of $10");
  if (!ALLOWED_HOURS.includes(d.duration_hours as 4 | 8 | 12)) throw new Error("Invalid duration");
  return d;
}
