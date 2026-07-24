/**
 * Idempotent enrichment for manual holdings that match the verified registry.
 */

import {
  resolveVerifiedInstrument,
  verifiedEntryToResolved,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function enrichHoldingWithVerifiedMapping(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  if (holding.assetType === "cash") {
    return holding;
  }

  const resolution = resolveVerifiedInstrument({
    ticker: holding.symbol,
    isin: holding.isin,
    exchange: holding.exchange,
    providerSymbol: holding.providerSymbol,
  });

  if (!resolution) {
    return holding;
  }

  const verifiedProvider = resolution.entry.providerSymbol.trim().toUpperCase();
  const existingProvider = holding.providerSymbol?.trim().toUpperCase() ?? null;

  if (existingProvider === verifiedProvider) {
    if (!holding.quoteCurrency && resolution.entry.quoteCurrency) {
      return {
        ...holding,
        quoteCurrency: resolution.entry.quoteCurrency,
      };
    }
    return holding;
  }

  const resolved = verifiedEntryToResolved(resolution.entry, undefined, {
    purchaseExchange: resolution.purchaseExchange,
  });
  const enriched = applyResolvedToHolding(
    {
      ...holding,
      matchMethod: holding.matchMethod as ResolvedInstrument["matchMethod"] | undefined,
    },
    resolved,
  );

  return {
    ...enriched,
    confirmationSource: "verified_mapping" as const,
    requiresConfirmation: false,
    matchWarnings: [],
  };
}

export function enrichHoldingsWithVerifiedMappings(
  holdings: StoredPortfolioHolding[],
): StoredPortfolioHolding[] {
  return holdings.map(enrichHoldingWithVerifiedMapping);
}

export function holdingsChangedByVerifiedEnrichment(
  before: StoredPortfolioHolding[],
  after: StoredPortfolioHolding[],
): boolean {
  if (before.length !== after.length) return false;

  return after.some((holding, index) => {
    const previous = before[index];
    if (!previous) return true;
    return (
      holding.providerSymbol !== previous.providerSymbol ||
      holding.confirmationSource !== previous.confirmationSource ||
      holding.exchange !== previous.exchange
    );
  });
}
