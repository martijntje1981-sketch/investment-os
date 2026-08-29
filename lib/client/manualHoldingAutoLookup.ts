/**
 * Auto listing discovery for manual Add Holding.
 *
 * Triggers existing lookupManualHoldingListing after a stable ticker/name
 * (and optional ISIN). Does not hard-code instruments or merge venues.
 */

import { applyManualListingSelection } from "@/lib/client/manualHoldingMatch";
import { resolveListingQuoteCurrency } from "@/lib/services/instruments/quoteCurrency";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS = 450;

export const HIGH_CONFIDENCE_LISTING_THRESHOLD = 0.8;

export type ManualListingLookupSnapshot = {
  holding: StoredPortfolioHolding;
  candidates: ResolvedInstrument[];
  warnings: string[];
  quotaUnavailable: boolean;
};

export type AutoListingDecisionKind = "preselect" | "choose" | "none";

export type AutoListingDecision = {
  kind: AutoListingDecisionKind;
  holding: StoredPortfolioHolding;
  candidates: ResolvedInstrument[];
  warnings: string[];
};

export function listingConflictsSuppliedIsin(
  listing: { isin?: string | null },
  suppliedIsin: string | null | undefined,
): boolean {
  const expected = normalizeIsin(suppliedIsin);
  const actual = normalizeIsin(listing.isin);
  return Boolean(expected && actual && expected !== actual);
}

export function filterListingsBySuppliedIsin<
  T extends { isin?: string | null },
>(listings: readonly T[], suppliedIsin: string | null | undefined): T[] {
  return listings.filter(
    (listing) => !listingConflictsSuppliedIsin(listing, suppliedIsin),
  );
}

export function listingIdentityReadyToConfirm(
  listing: ResolvedInstrument,
): boolean {
  return Boolean(
    listing.providerSymbol?.trim() && listing.exchange?.trim(),
  );
}

export function listingQuoteCurrencyResolved(
  listing: ResolvedInstrument,
): boolean {
  return (
    resolveListingQuoteCurrency({
      persistedQuoteCurrency: listing.quoteCurrency ?? null,
      providerSymbol: listing.providerSymbol,
      exchange: listing.exchange,
    }).currency != null
  );
}

export function isHighConfidenceListing(listing: ResolvedInstrument): boolean {
  if (!listingIdentityReadyToConfirm(listing)) return false;
  if (listing.matchMethod === "isin") {
    return listing.confidence >= 0.55;
  }
  return listing.confidence >= HIGH_CONFIDENCE_LISTING_THRESHOLD;
}

export function collectLookupCandidates(
  resolved: ResolvedInstrument,
): ResolvedInstrument[] {
  const listings: ResolvedInstrument[] = [];

  if (listingIdentityReadyToConfirm(resolved)) {
    listings.push({ ...resolved, candidates: undefined });
  }

  for (const candidate of resolved.candidates ?? []) {
    if (!listingIdentityReadyToConfirm(candidate)) continue;
    if (
      listings.some(
        (listing) => listing.providerSymbol === candidate.providerSymbol,
      )
    ) {
      continue;
    }
    listings.push(candidate);
  }

  return listings;
}

export function canPreselectSingleListing(
  candidates: readonly ResolvedInstrument[],
): boolean {
  if (candidates.length !== 1) return false;
  return isHighConfidenceListing(candidates[0]!);
}

export function shouldTriggerManualListingAutoLookup(input: {
  assetType?: string | null;
  symbol?: string | null;
  name?: string | null;
  isin?: string | null;
  providerSymbol?: string | null;
}): boolean {
  if (input.assetType === "cash") return false;
  if (input.providerSymbol?.trim()) return false;

  const symbol = input.symbol?.trim() ?? "";
  const name = input.name?.trim() ?? "";
  const isin = input.isin?.trim() ?? "";

  if (symbol.length >= 2) return true;
  if (name.length >= 3) return true;
  if (normalizeIsin(isin) || isin.length >= 8) return true;
  return false;
}

function stripListingIdentity(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  return {
    ...holding,
    providerSymbol: null,
    pricingExchange: null,
    confirmationSource: undefined,
  };
}

function resolvedFromHolding(
  holding: StoredPortfolioHolding,
): ResolvedInstrument {
  return {
    providerSymbol: holding.providerSymbol ?? null,
    instrumentName: holding.instrumentName ?? holding.name,
    exchange: holding.exchange ?? null,
    isin: holding.isin ?? null,
    matchMethod:
      (holding.matchMethod as ResolvedInstrument["matchMethod"] | undefined) ??
      "unresolved",
    confidence: holding.matchConfidence ?? 0,
    requiresConfirmation: Boolean(holding.requiresConfirmation),
    warnings: holding.matchWarnings ?? [],
    quoteCurrency: holding.quoteCurrency,
    pricingExchange: holding.pricingExchange,
  };
}

export function resolveAutoListingDecision(
  result: ManualListingLookupSnapshot,
  suppliedIsin: string | null | undefined,
): AutoListingDecision {
  const fromResult = filterListingsBySuppliedIsin(
    result.candidates,
    suppliedIsin,
  );
  const holdingConflicts = listingConflictsSuppliedIsin(
    result.holding,
    suppliedIsin,
  );
  const holding = holdingConflicts
    ? stripListingIdentity(result.holding)
    : result.holding;

  const candidates = collectLookupCandidates({
    ...resolvedFromHolding(holding),
    candidates: fromResult,
  });

  if (result.quotaUnavailable) {
    return {
      kind: "none",
      holding,
      candidates: [],
      warnings: result.warnings,
    };
  }

  if (canPreselectSingleListing(candidates)) {
    return {
      kind: "preselect",
      holding: applyManualListingSelection(holding, candidates[0]!),
      candidates,
      warnings: result.warnings,
    };
  }

  if (candidates.length > 1) {
    return {
      kind: "choose",
      holding: holding.providerSymbol ? stripListingIdentity(holding) : holding,
      candidates,
      warnings:
        result.warnings.length > 0
          ? result.warnings
          : ["Several listings match. Choose the venue and currency before adding."],
    };
  }

  if (candidates.length === 1 && !canPreselectSingleListing(candidates)) {
    return {
      kind: "choose",
      holding: holding.providerSymbol ? stripListingIdentity(holding) : holding,
      candidates,
      warnings:
        result.warnings.length > 0
          ? result.warnings
          : ["Confirm the listing venue and currency before adding."],
    };
  }

  return {
    kind: "none",
    holding,
    candidates: [],
    warnings: result.warnings,
  };
}
