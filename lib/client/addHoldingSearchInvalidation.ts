/**
 * Add Holding search-change invalidation and lookup request identity.
 *
 * Derived listing identity must never outlive the query that produced it.
 * Lookup responses are accepted only when they still match the active request.
 */

import { classifyHoldingSearchQuery } from "@/lib/client/manualHoldingSearchQuery";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const STALE_LISTING_SAVE_MESSAGE =
  "Search changed. Confirm the listing for this search before adding.";

export type AddHoldingSearchBinding = {
  queryKey: string;
  searchSymbol: string;
};

export function primarySearchQueryKey(symbol: string | null | undefined): string {
  const classified = classifyHoldingSearchQuery(symbol);
  return [
    classified.kind,
    classified.ticker ?? "",
    classified.isin ?? "",
    classified.instrumentName ?? "",
  ].join(":");
}

export function auxiliarySearchQueryKey(
  holding: Pick<StoredPortfolioHolding, "isin" | "name" | "exchange">,
): string {
  return [
    normalizeIsin(holding.isin) ?? holding.isin?.trim().toUpperCase() ?? "",
    holding.name.trim().toUpperCase(),
    holding.exchange?.trim().toUpperCase() ?? "",
  ].join(":");
}

export function addHoldingSearchQueryKey(holding: {
  symbol?: string | null;
  isin?: string | null;
  name?: string | null;
  exchange?: string | null;
}): string {
  return `${primarySearchQueryKey(holding.symbol ?? "")}|${auxiliarySearchQueryKey({
    isin: holding.isin ?? null,
    name: holding.name ?? "",
    exchange: holding.exchange ?? null,
  })}`;
}

export function searchQueryChangedMeaningfully(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return primarySearchQueryKey(previous) !== primarySearchQueryKey(next);
}

export function hasDerivedListingIdentity(
  holding: StoredPortfolioHolding,
): boolean {
  return Boolean(
    holding.providerSymbol?.trim() ||
      holding.quoteCurrency ||
      holding.pricingExchange?.trim() ||
      holding.instrumentName?.trim() ||
      holding.confirmationSource ||
      (holding.matchMethod && holding.matchMethod !== "unresolved") ||
      (holding.matchConfidence != null && holding.matchConfidence > 0),
  );
}

export function clearDerivedListingIdentity<T extends StoredPortfolioHolding>(
  holding: T,
): T {
  return {
    ...holding,
    providerSymbol: null,
    pricingExchange: null,
    confirmationSource: undefined,
    quoteCurrency: null,
    matchMethod: undefined,
    matchConfidence: undefined,
    requiresConfirmation: undefined,
    matchWarnings: undefined,
    providerInstrumentType: null,
    instrumentName: null,
  };
}

function clearResolvedSearchMetadata<T extends StoredPortfolioHolding>(
  holding: T,
): T {
  return {
    ...clearDerivedListingIdentity(holding),
    name: "",
    isin: null,
    exchange: null,
    instrumentName: null,
  };
}

export function applyAddHoldingSearchInputChange<T extends StoredPortfolioHolding>(
  draft: T,
  nextSymbol: string,
): T {
  if (!searchQueryChangedMeaningfully(draft.symbol, nextSymbol)) {
    return { ...draft, symbol: nextSymbol };
  }

  const base = hasDerivedListingIdentity(draft)
    ? clearResolvedSearchMetadata(draft)
    : clearDerivedListingIdentity(draft);

  return { ...base, symbol: nextSymbol };
}

export function applyAddHoldingAdvancedQueryChange<
  T extends StoredPortfolioHolding,
>(
  draft: T,
  patch: Partial<Pick<StoredPortfolioHolding, "isin" | "name" | "exchange">>,
): T {
  const base = hasDerivedListingIdentity(draft)
    ? clearResolvedSearchMetadata(draft)
    : clearDerivedListingIdentity(draft);

  return { ...base, ...patch };
}

export function captureAddHoldingSearchBinding(
  draft: Pick<StoredPortfolioHolding, "symbol" | "isin" | "name" | "exchange">,
): AddHoldingSearchBinding {
  return {
    queryKey: addHoldingSearchQueryKey(draft),
    searchSymbol: draft.symbol,
  };
}

export function shouldApplyListingLookupResult(input: {
  aborted: boolean;
  requestGeneration: number;
  currentGeneration: number;
  requestQueryKey: string;
  currentQueryKey: string;
}): boolean {
  if (input.aborted) return false;
  if (input.requestGeneration !== input.currentGeneration) return false;
  if (input.requestQueryKey !== input.currentQueryKey) return false;
  return true;
}

export function canSaveAddHoldingListing(input: {
  providerSymbol?: string | null;
  searchSymbol: string;
  listingIsin?: string | null;
  boundQuery: AddHoldingSearchBinding | null;
}): boolean {
  if (!input.providerSymbol?.trim()) return false;
  if (!input.boundQuery) return false;
  return !searchQueryChangedMeaningfully(
    input.boundQuery.searchSymbol,
    input.searchSymbol,
  );
}

/** @deprecated Use applyAddHoldingSearchInputChange */
export const applyPrimarySearchChange = applyAddHoldingSearchInputChange;
/** @deprecated Use applyAddHoldingAdvancedQueryChange */
export const applyAuxiliarySearchFieldChange = applyAddHoldingAdvancedQueryChange;
