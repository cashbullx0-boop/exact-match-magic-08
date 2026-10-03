export const CBX_PER_USD = 4;

export function formatCBXHundredths(amount: number, options?: { sign?: boolean }) {
  const sign = amount < 0 ? "−" : options?.sign && amount > 0 ? "+" : "";
  const value = Math.abs(amount) / 100;
  return `${sign}${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCBX(amount: number, options?: { sign?: boolean }) {
  const sign = amount < 0 ? "−" : options?.sign && amount > 0 ? "+" : "";
  return `${sign}${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function cbxToUsdt(cbx: number) {
  return cbx / CBX_PER_USD;
}

export function usdtToCbx(usdt: number) {
  return usdt * CBX_PER_USD;
}

export function formatUSDT(usdt: number) {
  return `${usdt.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} USDT`;
}