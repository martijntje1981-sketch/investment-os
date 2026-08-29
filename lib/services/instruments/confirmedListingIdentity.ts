/**
 * Confirmed listing identity is the user-selected provider listing.
 *
 * Holdings persist providerSymbol, exchange, ISIN, quote currency, and match
 * metadata. Registry and research catalogs may enrich missing fields for that
 * exact listing. They must never replace it with another venue because a catalog
 * entry is missing or an ISIN is shared across exchanges.
 */

import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";
import {
  lookupInstrumentResearchProfile,
  lookupInstrumentResearchProfileBySymbol,
  type InstrumentResearchProfile,
} from "@/lib/services/discover/instrumentResearchMetadata";
import {
  resolveListingQuoteCurrency,
  type QuoteCurrencyResolution,
} from "@/lib/services/instruments/quoteCurrency";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { ListingMetadataRecord } from "@/lib/services/instruments/listingMetadata";
import type { PriceCurrency } from "@/lib/services/prices/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function normalizeListingSymbol(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

export function listingsAreSame(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeListingSymbol(left);
  const b = normalizeListingSymbol(right);
  return a != null && a === b;
}

export function hasPersistedProviderListing(
  holding: Pick<StoredPortfolioHolding, "providerSymbol"> & {
    assetType?: StoredPortfolioHolding["assetType"];
  },
): boolean {
  if (holding.assetType === "cash" || holding.assetType === "crypto") {
    return false;
  }
  return Boolean(normalizeListingSymbol(holding.providerSymbol));
}

export function listingBaseTicker(
  providerSymbol: string | null | undefined,
  fallbackTicker?: string | null,
): string | null {
  const provider = normalizeListingSymbol(providerSymbol);
  if (provider?.includes(".")) {
    return provider.split(".")[0] ?? provider;
  }
  return normalizeListingSymbol(fallbackTicker);
}

export function listingAwareMatchSymbol(
  holding: {
    id?: string;
    symbol: string;
    providerSymbol?: string | null;
  },
  siblings: Array<{
    id?: string;
    symbol: string;
    providerSymbol?: string | null;
  }>,
): string {
  const ticker = holding.symbol.trim().toUpperCase();
  const provider = normalizeListingSymbol(holding.providerSymbol);
  const shared = siblings.some((other) => {
    if (holding.id && other.id && holding.id === other.id) return false;
    return other.symbol.trim().toUpperCase() === ticker;
  });
  return shared && provider ? provider : ticker;
}

/**
 * Saved mappings are import convenience, not identity.
 * They may fill gaps only when the holding is unresolved, or when they name
 * the same provider listing the holding already confirmed.
 */
export function savedMappingMatchesListing(
  listingProviderSymbol: string | null | undefined,
  mapping: Pick<SavedImportMapping, "providerSymbol"> | null | undefined,
): boolean {
  if (!mapping) return false;
  const listing = normalizeListingSymbol(listingProviderSymbol);
  if (!listing) return true;
  return listingsAreSame(listing, mapping.providerSymbol);
}

export type ListingIdentityInput = {
  providerSymbol?: string | null;
  symbol?: string | null;
  exchange?: string | null;
  isin?: string | null;
  quoteCurrency?: PriceCurrency | null;
  assetType?: StoredPortfolioHolding["assetType"];
};

export type SavedListingMappingInput = Pick<
  SavedImportMapping,
  "providerSymbol" | "quoteCurrency" | "exchange" | "isin" | "instrumentName"
>;

export function mergeConfirmedListingIdentity(
  holding: ListingIdentityInput,
  mapping?: SavedListingMappingInput | null,
): {
  providerSymbol: string | null;
  exchange: string | null;
  isin: string | null;
  instrumentName?: string | null;
  quoteCurrency: PriceCurrency | null;
} {
  const mappingUsable = savedMappingMatchesListing(
    holding.providerSymbol,
    mapping,
  )
    ? mapping
    : null;

  return {
    providerSymbol:
      normalizeListingSymbol(holding.providerSymbol) ??
      mappingUsable?.providerSymbol ??
      null,
    exchange: holding.exchange ?? mappingUsable?.exchange ?? null,
    isin: holding.isin ?? mappingUsable?.isin ?? null,
    instrumentName: mappingUsable?.instrumentName ?? null,
    quoteCurrency: holding.quoteCurrency ?? mappingUsable?.quoteCurrency ?? null,
  };
}

/**
 * Research/news lookup for a holding.
 * Confirmed listings use the exact provider symbol only.
 * Ticker-only catalog fallback is allowed solely when the listing is unresolved.
 */
export function lookupResearchProfileForHolding(
  holding: Pick<StoredPortfolioHolding, "providerSymbol" | "symbol" | "assetType">,
): InstrumentResearchProfile | null {
  if (holding.assetType === "cash" || holding.assetType === "crypto") {
    return null;
  }

  const providerSymbol = normalizeListingSymbol(holding.providerSymbol);
  if (providerSymbol) {
    return lookupInstrumentResearchProfile(providerSymbol);
  }

  return lookupInstrumentResearchProfileBySymbol(holding.symbol);
}

export function resolveQuoteCurrencyForConfirmedListing(input: {
  persistedQuoteCurrency?: PriceCurrency | null;
  providerSymbol?: string | null;
  exchange?: string | null;
  savedMapping?: SavedListingMappingInput | null;
  listingMetadata?: Pick<ListingMetadataRecord, "quoteCurrency"> | null;
  liveQuoteCurrency?: string | null;
}): QuoteCurrencyResolution {
  const merged = mergeConfirmedListingIdentity(
    {
      providerSymbol: input.providerSymbol,
      exchange: input.exchange,
      quoteCurrency: input.persistedQuoteCurrency ?? null,
    },
    input.savedMapping,
  );

  return resolveListingQuoteCurrency({
    liveQuoteCurrency: input.liveQuoteCurrency,
    persistedQuoteCurrency: merged.quoteCurrency,
    providerSymbol: merged.providerSymbol,
    exchange: merged.exchange ?? input.exchange,
    listingMetadata: input.listingMetadata,
  });
}

/** Registry may fill quote currency only for the same persisted provider listing. */
export function enrichQuoteCurrencyFromVerifiedListing<
  T extends Pick<StoredPortfolioHolding, "providerSymbol" | "quoteCurrency" | "assetType">,
>(holding: T): T {
  if (holding.quoteCurrency || !hasPersistedProviderListing(holding)) {
    return holding;
  }

  const verified = lookupVerifiedByProviderSymbol(holding.providerSymbol);
  if (!verified?.quoteCurrency) {
    return holding;
  }

  return {
    ...holding,
    quoteCurrency: verified.quoteCurrency,
  };
}

export function listingIdentityKey(
  holding: Pick<StoredPortfolioHolding, "providerSymbol">,
): string | null {
  const provider = normalizeListingSymbol(holding.providerSymbol);
  return provider ? `listing:${provider}` : null;
}

type ListingCounterpart = Pick<
  StoredPortfolioHolding,
  "id" | "symbol" | "assetType" | "providerSymbol"
>;

/** Resolve a local row for a remote holding without collapsing two venues of the same ticker. */
export function findLocalListingCounterpart<T extends ListingCounterpart>(
  remote: ListingCounterpart,
  locals: T[],
): T | undefined {
  const byId = locals.find((row) => row.id === remote.id);
  if (byId) return byId;

  const remoteListing = listingIdentityKey(remote);
  if (remoteListing) {
    return locals.find((row) => listingIdentityKey(row) === remoteListing);
  }

  const remoteSymbol = remote.symbol.trim().toUpperCase();
  const remoteType = remote.assetType ?? "investment";
  return locals.find((row) => {
    if (listingIdentityKey(row)) return false;
    return (
      row.symbol.trim().toUpperCase() === remoteSymbol &&
      (row.assetType ?? "investment") === remoteType
    );
  });
}

export function mergeRemoteListingIdentity(
  remote: StoredPortfolioHolding,
  local?: StoredPortfolioHolding | null,
): StoredPortfolioHolding {
  return {
    ...remote,
    providerSymbol: remote.providerSymbol ?? local?.providerSymbol ?? null,
    exchange: remote.exchange ?? local?.exchange ?? null,
    pricingExchange: remote.pricingExchange ?? local?.pricingExchange ?? null,
    instrumentName: remote.instrumentName ?? local?.instrumentName ?? null,
    isin: remote.isin ?? local?.isin ?? null,
    quoteCurrency: remote.quoteCurrency ?? local?.quoteCurrency ?? null,
    confirmationSource: remote.confirmationSource ?? local?.confirmationSource,
    matchMethod: remote.matchMethod ?? local?.matchMethod,
    matchConfidence: remote.matchConfidence ?? local?.matchConfidence,
    requiresConfirmation:
      remote.requiresConfirmation ?? local?.requiresConfirmation,
    matchWarnings: remote.matchWarnings ?? local?.matchWarnings,
  };
}

export function findHoldingByInsightSubject(
  subject: string | null | undefined,
  holdings: StoredPortfolioHolding[],
): StoredPortfolioHolding | null {
  const key = normalizeListingSymbol(subject);
  if (!key) return null;

  const byProvider = holdings.find(
    (holding) => normalizeListingSymbol(holding.providerSymbol) === key,
  );
  if (byProvider) return byProvider;

  const tickerMatches = holdings.filter(
    (holding) => holding.symbol.trim().toUpperCase() === key,
  );
  if (tickerMatches.length === 1) return tickerMatches[0] ?? null;

  const unresolved = tickerMatches.filter(
    (holding) => !hasPersistedProviderListing(holding),
  );
  if (unresolved.length === 1 && unresolved.length === tickerMatches.length) {
    return unresolved[0] ?? null;
  }

  return null;
}

type NewsListingMatchItem = {
  matchedHoldingIds: string[];
  matchedSymbols: string[];
  matchedHoldings: Array<{
    id: string;
    symbol: string;
    providerSymbol: string | null;
  }>;
};

export function newsItemMatchesConfirmedHolding(
  item: NewsListingMatchItem,
  holding: Pick<StoredPortfolioHolding, "id" | "symbol" | "providerSymbol" | "assetType">,
): boolean {
  if (item.matchedHoldingIds.includes(holding.id)) return true;
  if (item.matchedHoldings.some((matched) => matched.id === holding.id)) {
    return true;
  }

  const provider = normalizeListingSymbol(holding.providerSymbol);
  const ticker = holding.symbol.trim().toUpperCase();
  const tickerBase = listingBaseTicker(provider, ticker);

  if (provider) {
    if (
      item.matchedHoldings.some((matched) =>
        listingsAreSame(matched.providerSymbol, provider),
      )
    ) {
      return true;
    }
    if (
      item.matchedSymbols.some((matched) => listingsAreSame(matched, provider))
    ) {
      return true;
    }

    const namesOtherListing =
      item.matchedHoldings.some((matched) => {
        const other = normalizeListingSymbol(matched.providerSymbol);
        return Boolean(other) && other !== provider;
      }) ||
      item.matchedSymbols.some((matched) => {
        const other = normalizeListingSymbol(matched);
        if (!other?.includes(".") || other === provider) return false;
        return listingBaseTicker(other) === tickerBase;
      });
    if (namesOtherListing) return false;
  }

  if (hasPersistedProviderListing(holding) && provider) {
    const tickerOnItem =
      item.matchedSymbols.some(
        (matched) => matched.trim().toUpperCase() === ticker,
      ) ||
      item.matchedHoldings.some(
        (matched) =>
          !normalizeListingSymbol(matched.providerSymbol) &&
          matched.symbol.trim().toUpperCase() === ticker,
      );
    return tickerOnItem;
  }

  if (
    item.matchedSymbols.some(
      (matched) => matched.trim().toUpperCase() === ticker,
    )
  ) {
    return true;
  }

  return item.matchedHoldings.some(
    (matched) =>
      !normalizeListingSymbol(matched.providerSymbol) &&
      matched.symbol.trim().toUpperCase() === ticker,
  );
}
