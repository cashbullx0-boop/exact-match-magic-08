/// <reference types="bun-types" />
// @ts-ignore -- bun:test is provided at runtime by `bun test`
import { describe, test, expect } from "bun:test";
import {
  tradeProfitCents,
  validateTradeAmount,
  formatMoney,
  formatCountdown,
  addAbsoluteHours,
  wallHourIn,
} from "../trade-format";

describe("trade settlement — profit calculation", () => {
  test("flat 2% of amount, in cents", () => {
    expect(tradeProfitCents(5000)).toBe(100);    // $50 -> $1.00
    expect(tradeProfitCents(10000)).toBe(200);   // $100 -> $2.00
    expect(tradeProfitCents(12345)).toBe(246);   // floor(246.9)
    expect(tradeProfitCents(100000)).toBe(2000); // $1000 -> $20.00
  });

  test("settlement payout = amount + 2% profit", () => {
    const amount = 7500; // $75
    const profit = tradeProfitCents(amount);
    expect(profit).toBe(150);
    expect(amount + profit).toBe(7650); // $76.50 credited on completion
  });

  test("validateTradeAmount enforces $50 minimum and $10 multiples", () => {
    expect(validateTradeAmount(4000, 100000)).toMatch(/Minimum/);
    expect(validateTradeAmount(5500, 100000)).toMatch(/multiples of \$10/);
    expect(validateTradeAmount(6000, 100000)).toBeNull();
    expect(validateTradeAmount(20000, 10000)).toMatch(/Insufficient/);
  });
});

describe("money format — always 2 decimals", () => {
  test("whole dollars render with .00", () => {
    expect(formatMoney(100)).toBe("$1.00");
    expect(formatMoney(5000)).toBe("$50.00");
  });

  test("single-cent tails render with leading zero", () => {
    expect(formatMoney(120)).toBe("$1.20");
    expect(formatMoney(105)).toBe("$1.05");
  });

  test("never collapses to 1 or 6 decimals", () => {
    expect(formatMoney(120)).not.toBe("$1.2");
    expect(formatMoney(120)).not.toBe("$1.200000");
  });

  test("negative amounts keep two decimals", () => {
    expect(formatMoney(-150)).toBe("-$1.50");
  });

  test("zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });
});

describe("countdown formatting (HH:MM:SS)", () => {
  test("pads each component to two digits", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(5)).toBe("00:00:05");
    expect(formatCountdown(65)).toBe("00:01:05");
    expect(formatCountdown(3600)).toBe("01:00:00");
    expect(formatCountdown(12 * 3600)).toBe("12:00:00");
  });

  test("clamps negatives to 00:00:00", () => {
    expect(formatCountdown(-10)).toBe("00:00:00");
  });
});

describe("Europe/London DST — 24h cooldown uses absolute time", () => {
  // Spring-forward: 2026-03-29 01:00 UTC, London clocks jump 01:00 -> 02:00 BST.
  test("spring-forward day: +24h absolute = +25h wall clock", () => {
    // 2026-03-28 12:00 UTC = 12:00 GMT London (before DST)
    const before = new Date(Date.UTC(2026, 2, 28, 12, 0, 0));
    const after = addAbsoluteHours(before, 24);
    expect(wallHourIn("Europe/London", before)).toBe(12); // GMT
    // 2026-03-29 12:00 UTC = 13:00 BST London — DST shifted the wall clock.
    expect(wallHourIn("Europe/London", after)).toBe(13);
  });

  // Fall-back: 2026-10-25 01:00 UTC, London clocks jump 02:00 BST -> 01:00 GMT.
  test("fall-back day: +24h absolute = +23h wall clock", () => {
    // 2026-10-24 12:00 UTC = 13:00 BST London
    const before = new Date(Date.UTC(2026, 9, 24, 12, 0, 0));
    const after = addAbsoluteHours(before, 24);
    expect(wallHourIn("Europe/London", before)).toBe(13); // BST
    // 2026-10-25 12:00 UTC = 12:00 GMT London
    expect(wallHourIn("Europe/London", after)).toBe(12);
  });

  test("absolute 24h is always 86_400_000 ms — matches Postgres timestamptz arithmetic", () => {
    const before = new Date(Date.UTC(2026, 2, 28, 12, 0, 0));
    const after = addAbsoluteHours(before, 24);
    expect(after.getTime() - before.getTime()).toBe(24 * 3600 * 1000);
  });
});