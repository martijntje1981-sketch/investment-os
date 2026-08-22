/**
 * Stable instrument identity for distribution-policy classification.
 */

import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function resolveDistributionInstrumentIdentity(
  holding: Pick<
    StoredPortfolioHolding,
    "isin" | "providerSymbol" | "symbol" | "id"
  >,
): {
  key: string;
  isin: string | null;
  providerSymbol: string | null;
} {
  const isin = normalizeIsin(holding.isin);
  const providerSymbol = holding.providerSymbol?.trim().toUpperCase() ?? null;

  if (isin) {
    return {
      key: `isin:${isin}`,
      isin,
      providerSymbol,
    };
  }

  if (providerSymbol) {
    return {
      key: `provider:${providerSymbol}`,
      isin: null,
      providerSymbol,
    };
  }

  return {
    key: `holding:${holding.id}:${holding.symbol.trim().toUpperCase()}`,
    isin: null,
    providerSymbol: null,
  };
}
