/**
 * Idempotent enrichment for manual holdings that match the verified registry.
 */

import { lookupVerifiedInstrument, verifiedEntryToResolved } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function enrichHoldingWithVerifiedMapping(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  if (holding.assetType === "cash") {
    return holding;
  }

  if (holding.providerSymbol?.trim()) {
    return holding;
  }

  const entry = lookupVerifiedInstrument({
    ticker: holding.symbol,
    isin: holding.isin,
    exchange: holding.exchange,
  });

  if (!entry) {
    return holding;
  }

  const resolved = verifiedEntryToResolved(entry);
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
