/**
 * ISIN-first listing discovery.
 *
 * Enumerates tradable venues for a supplied ISIN from the provider,
 * using the verified registry only as enrichment. Conflicting ISINs
 * are never returned.
 */

import {
  fetchIdMapping,
  fetchSearch,
  isEodhdQuotaOrRateLimitError,
} from "@/lib/services/instruments/eodhdClient";
import {
  isEodhdInstrumentQuotaExhausted,
  markEodhdInstrumentQuotaExhausted,
} from "@/lib/services/instruments/eodhdQuotaGuard";
import { listUniqueProviderPricingCodes } from "@/lib/services/instruments/exchangeRegistry";
import { providerExchangesMatch } from "@/lib/services/instruments/exchangeNormalizer";
import {
  listingRowConflictsIsin,
  normalizeProviderListingRows,
  type ProviderListingRow,
} from "@/lib/services/instruments/idMappingNormalizer";
import { providerRowToResolved } from "@/lib/services/instruments/providerRowToResolved";
import {
  listVerifiedByIsin,
  verifiedEntryToResolved,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { listingsAreSame } from "@/lib/services/instruments/confirmedListingIdentity";
import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import type { ResolvedInstrument } from "@/lib/types/instrument";

const VENUE_PROBE_CONCURRENCY = 3;

function handleProviderFailure(error: unknown): void {
  if (isEodhdQuotaOrRateLimitError(error)) {
    markEodhdInstrumentQuotaExhausted(error);
  }
}

async function safeFetchIdMapping(
  isin: string,
): Promise<ProviderListingRow[] | null> {
  if (isEodhdInstrumentQuotaExhausted()) return null;
  try {
    return await fetchIdMapping({ isin });
  } catch (error) {
    handleProviderFailure(error);
    return null;
  }
}

async function safeFetchSearch(
  query: string,
  options: { exchange?: string | null; limit?: number } = {},
): Promise<ProviderListingRow[] | null> {
  if (isEodhdInstrumentQuotaExhausted()) return null;
  try {
    return await fetchSearch(query, options);
  } catch (error) {
    handleProviderFailure(error);
    return null;
  }
}

function rowsToListings(
  rows: ProviderListingRow[],
  isin: string,
  matchMethod: ResolvedInstrument["matchMethod"],
  confidence: number,
): ResolvedInstrument[] {
  return normalizeProviderListingRows(rows, isin)
    .map((row) => providerRowToResolved(row, matchMethod, confidence, isin, [
      "Possible listing",
    ]))
    .filter((listing) => Boolean(listing.providerSymbol));
}

function mergeListings(listings: ResolvedInstrument[]): ResolvedInstrument[] {
  const merged: ResolvedInstrument[] = [];
  for (const listing of listings) {
    if (!listing.providerSymbol) continue;
    const existing = merged.find((item) =>
      listingsAreSame(item.providerSymbol, listing.providerSymbol),
    );
    if (!existing) {
      merged.push(listing);
      continue;
    }
    existing.instrumentName = existing.instrumentName || listing.instrumentName;
    existing.quoteCurrency = existing.quoteCurrency ?? listing.quoteCurrency;
    existing.isin = existing.isin ?? listing.isin;
    existing.providerInstrumentType =
      existing.providerInstrumentType ?? listing.providerInstrumentType;
    if ((listing.confidence ?? 0) > (existing.confidence ?? 0)) {
      existing.confidence = listing.confidence;
      existing.matchMethod = listing.matchMethod;
    }
  }
  return merged;
}

function enrichWithVerified(
  listings: ResolvedInstrument[],
  isin: string,
): ResolvedInstrument[] {
  const verified = listVerifiedByIsin(isin).map((entry) =>
    verifiedEntryToResolved(entry, "isin"),
  );
  return mergeListings([...verified, ...listings]);
}

async function probeSupportedVenues(
  ticker: string,
  isin: string,
  alreadyFound: ReadonlySet<string>,
): Promise<ResolvedInstrument[]> {
  const venues = listUniqueProviderPricingCodes().filter(
    (exchange) => !alreadyFound.has(exchange),
  );
  const found: ResolvedInstrument[] = [];
  let index = 0;

  async function worker() {
    while (index < venues.length) {
      const current = index;
      index += 1;
      const exchange = venues[current]!;
      const rows = await safeFetchSearch(ticker, { exchange, limit: 10 });
      if (!rows) continue;
      found.push(...rowsToListings(rows, isin, "isin", 0.72));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(VENUE_PROBE_CONCURRENCY, venues.length) }, () =>
      worker(),
    ),
  );
  return found;
}

export async function discoverListingsForIsin(input: {
  isin: string;
  ticker?: string | null;
  instrumentName?: string | null;
  preferredExchange?: string | null;
}): Promise<{
  listings: ResolvedInstrument[];
  providerUnavailable: boolean;
}> {
  const isin = input.isin;
  const ticker = input.ticker?.trim().toUpperCase() || null;
  const providerUnavailable = isEodhdInstrumentQuotaExhausted();

  if (providerUnavailable) {
    return {
      listings: enrichWithVerified([], isin),
      providerUnavailable: true,
    };
  }

  const idMappingRows = await safeFetchIdMapping(isin);
  if (idMappingRows === null) {
    return {
      listings: enrichWithVerified([], isin),
      providerUnavailable: true,
    };
  }

  const fromIdMapping = rowsToListings(idMappingRows, isin, "isin", 0.9);
  const isinSearchRows = await safeFetchSearch(isin, { limit: 50 });
  if (isinSearchRows === null) {
    return {
      listings: enrichWithVerified(fromIdMapping, isin),
      providerUnavailable: true,
    };
  }

  const fromIsinSearch = rowsToListings(
    isinSearchRows.filter((row) => !listingRowConflictsIsin(row, isin)),
    isin,
    "isin",
    0.88,
  );

  let fromTicker: ResolvedInstrument[] = [];
  if (ticker) {
    const tickerRows = await safeFetchSearch(ticker, { limit: 50 });
    if (tickerRows === null) {
      return {
        listings: enrichWithVerified(
          [...fromIdMapping, ...fromIsinSearch],
          isin,
        ),
        providerUnavailable: true,
      };
    }
    fromTicker = rowsToListings(
      tickerRows.filter((row) => !listingRowConflictsIsin(row, isin)),
      isin,
      "isin",
      0.7,
    );
  }

  const isinSourceListings = mergeListings([...fromIdMapping, ...fromIsinSearch]);
  let listings = mergeListings([
    ...isinSourceListings,
    ...fromTicker,
  ]);

  if (ticker && isinSourceListings.length === 0) {
    const knownExchanges = new Set(
      listings
        .map((listing) => listing.exchange)
        .filter((exchange): exchange is string => Boolean(exchange)),
    );
    if (input.preferredExchange) {
      knownExchanges.add(input.preferredExchange);
    }
    const probed = await probeSupportedVenues(ticker, isin, knownExchanges);
    listings = mergeListings([...listings, ...probed]);
  }

  void input.instrumentName;
  return {
    listings: enrichWithVerified(listings, isin),
    providerUnavailable: false,
  };
}

export function resolveDiscoveredIsinListings(
  listings: ResolvedInstrument[],
  preferredExchange: string | null,
): ResolvedInstrument {
  const usable = listings.filter((listing) => listing.providerSymbol);
  if (usable.length === 0) {
    return {
      providerSymbol: null,
      instrumentName: null,
      exchange: null,
      isin: null,
      matchMethod: "unresolved",
      confidence: 0,
      requiresConfirmation: true,
      warnings: ["No EODHD listing found for this ISIN."],
    };
  }

  if (preferredExchange) {
    const onExchange = usable.filter((listing) =>
      providerExchangesMatch(listing.exchange, preferredExchange),
    );
    if (onExchange.length === 1) {
      const best = onExchange[0]!;
      return {
        ...best,
        matchMethod: "isin",
        confidence: Math.max(best.confidence, 0.95),
        requiresConfirmation: false,
        warnings: [],
        candidates: usable.filter(
          (listing) =>
            !listingsAreSame(listing.providerSymbol, best.providerSymbol),
        ),
      };
    }
  }

  if (usable.length === 1) {
    const only = usable[0]!;
    return {
      ...only,
      matchMethod: "isin",
      confidence: Math.max(only.confidence, 0.92),
      requiresConfirmation: only.requiresConfirmation,
    };
  }

  return {
    providerSymbol: null,
    instrumentName: null,
    exchange: null,
    isin: usable[0]?.isin ?? null,
    matchMethod: "unresolved",
    confidence: 0,
    requiresConfirmation: true,
    warnings: ["Multiple listings found for this ISIN — confirm the exchange."],
    candidates: usable.map((listing) => ({
      ...listing,
      matchMethod: "isin",
      requiresConfirmation: true,
    })),
  };
}
