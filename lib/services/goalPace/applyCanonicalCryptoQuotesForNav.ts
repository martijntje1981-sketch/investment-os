/**
 * Overlay trusted-server canonical crypto EUR onto NAV holdings.
 * Listed last_market_price and cash are untouched. No client or purchase fallback.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CanonicalCryptoQuoteNavRow = {
  holding_id: string;
  user_id: string;
  canonical_eur_unit_price: number | string;
  canonical_priced_at: string | null;
  data_status: string | null;
  quote_updated_at: string | null;
  fetched_at: string | null;
};

function isPresentTimestamp(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

function isUsableCanonicalQuote(
  row: CanonicalCryptoQuoteNavRow,
  holding: StoredPortfolioHolding,
  userId: string,
): boolean {
  if (holding.assetType !== "crypto") return false;
  if (row.holding_id !== holding.id) return false;
  if (row.user_id !== userId) return false;
  const price = Number(row.canonical_eur_unit_price);
  if (!Number.isFinite(price) || price <= 0) return false;
  const status = String(row.data_status ?? "").trim().toLowerCase();
  if (status !== "live" && status !== "delayed") return false;
  if (!isPresentTimestamp(row.canonical_priced_at)) return false;
  if (!isPresentTimestamp(row.quote_updated_at)) return false;
  if (!isPresentTimestamp(row.fetched_at)) return false;
  return true;
}

export function applyCanonicalCryptoQuotesForNav(input: {
  holdings: StoredPortfolioHolding[];
  quotes: CanonicalCryptoQuoteNavRow[];
  userId: string;
}): StoredPortfolioHolding[] {
  const quotesByHolding = new Map<string, CanonicalCryptoQuoteNavRow>();
  for (const quote of input.quotes) {
    if (quote.user_id !== input.userId) continue;
    quotesByHolding.set(quote.holding_id, quote);
  }

  return input.holdings.map((holding) => {
    if (holding.assetType !== "crypto") return holding;
    const quote = quotesByHolding.get(holding.id);
    if (!quote || !isUsableCanonicalQuote(quote, holding, input.userId)) {
      return holding;
    }
    const price = Number(quote.canonical_eur_unit_price);
    const status = String(quote.data_status).trim().toLowerCase() as
      | "live"
      | "delayed";
    return {
      ...holding,
      currentPrice: price,
      marketPriceUpdatedAt: new Date(quote.canonical_priced_at!).toISOString(),
      priceDataStatus: status,
    };
  });
}
