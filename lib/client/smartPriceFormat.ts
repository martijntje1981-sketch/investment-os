/**
 * Adaptive fraction digits for unit/asset prices and small money amounts.
 * Keeps equities/ETFs clean while preserving meaningful micro-price movement.
 * Portfolio totals / large positions stay compact (no unnecessary cents).
 */

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";

/**
 * Resolve display decimals for a single unit price.
 * Tiers (absolute value):
 * - ≥ 1 → 2 (e.g. €42.18, BTC)
 * - ≥ 0.1 → 2 (e.g. €0.75)
 * - ≥ 0.01 → 5 (e.g. €0.01234)
 * - ≥ 0.001 → 6 (e.g. €0.001234)
 * - else → 8 (e.g. €0.00001234 / SHIB-like)
 */
export function resolveSmartPriceFractionDigits(price: number): number {
  if (!Number.isFinite(price) || price === 0) {
    return 2;
  }

  const abs = Math.abs(price);
  if (abs >= 1) return 2;
  if (abs >= 0.1) return 2;
  if (abs >= 0.01) return 5;
  if (abs >= 0.001) return 6;
  return 8;
}

export function formatSmartPrice(
  price: number,
  currency: string = "EUR",
): string {
  const decimals = resolveSmartPriceFractionDigits(price);
  return formatPortfolioCurrency(price, currency, decimals);
}

/**
 * Adaptive decimals for position values and day-move amounts.
 * Large: whole currency units. Small: cents so SHIB-like moves stay visible.
 */
export function resolveSmartMoneyFractionDigits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const abs = Math.abs(amount);
  if (abs === 0) return 0;
  if (abs >= 10) return 0;
  return 2;
}

export function formatSmartMoney(
  amount: number,
  currency: string = "EUR",
): string {
  return formatPortfolioCurrency(
    amount,
    currency,
    resolveSmartMoneyFractionDigits(amount),
  );
}

/** Keep tiny % moves visible instead of rounding to 0.0%. */
export function resolveSmartPercentFractionDigits(percent: number): number {
  if (!Number.isFinite(percent) || percent === 0) return 1;
  const abs = Math.abs(percent);
  if (abs < 0.1) return 2;
  return 1;
}

export function formatSmartPercent(percent: number): string {
  return formatPortfolioPercent(
    percent,
    resolveSmartPercentFractionDigits(percent),
  );
}
