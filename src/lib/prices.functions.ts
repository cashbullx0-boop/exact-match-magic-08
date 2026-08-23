import { createServerFn } from "@tanstack/react-start";

export type AssetPrice = {
  symbol: string;
  name: string;
  price: number;
  change: number; // percent
};

export const getLivePrices = createServerFn({ method: "GET" }).handler(async () => {
  const { loadLivePrices } = await import("./prices.server");
  return loadLivePrices();
});

export const getInvestPrices = createServerFn({ method: "GET" }).handler(async () => {
  const { loadInvestPrices } = await import("./prices.server");
  return loadInvestPrices();
});
