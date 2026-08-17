/**
 * Adaptive fraction digits for unit/asset prices.
 * Keeps equities/ETFs clean while preserving meaningful micro-price movement.
 * Portfolio totals should continue using fixed low-precision formatters.
 */

import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";

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
