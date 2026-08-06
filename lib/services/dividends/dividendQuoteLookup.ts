/**
 * Shared dividend quote lookup helpers for portfolio calculations.
 */

import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function quoteLookupKeys(quote: DividendApiQuote): string[] {
  return [
    quote.symbol.trim().toUpperCase(),
    quote.providerSymbol.trim().toUpperCase(),
  ];
}

export function scaleDividendQuoteForQuantity(
  quote: DividendApiQuote,
  quantity: number,
): DividendApiQuote {
  if (quantity <= 0 || quantity === 1) return quote;

  return {
    ...quote,
    estimatedAnnualDividendEur:
      quote.estimatedAnnualDividendEur != null
        ? quote.estimatedAnnualDividendEur * quantity
        : null,
    estimatedNextPaymentEur:
      quote.estimatedNextPaymentEur != null
        ? quote.estimatedNextPaymentEur * quantity
        : null,
  };
}

export function findDividendQuoteForHolding(
  holding: StoredPortfolioHolding,
  quotes: DividendApiQuote[],
): DividendApiQuote | null {
  const keys = new Set<string>();
  keys.add(holding.symbol.trim().toUpperCase());
  if (holding.providerSymbol) {
    keys.add(holding.providerSymbol.trim().toUpperCase());
  }

  const base =
    quotes.find((quote) =>
      quoteLookupKeys(quote).some((key) => keys.has(key)),
    ) ?? null;

  if (!base) return null;
  return scaleDividendQuoteForQuantity(base, holding.quantity);
}
