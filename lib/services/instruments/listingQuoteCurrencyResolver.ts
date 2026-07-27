/**
 * Listing quote-currency resolver — sync tiers plus lazy metadata lookup.
 * Crypto holdings must never enter this module.
 */

import {
  extractQuoteCurrencyFromProviderRows,
  parseProviderSymbolParts,
  type ListingMetadataRecord,
} from "@/lib/services/instruments/listingMetadata";
import {
  fetchIdMapping,
  fetchSearch,
  type EodhdIdMappingRow,
  type EodhdSearchRow,
} from "@/lib/services/instruments/eodhdClient";
import {
  QUOTE_CURRENCY_REVIEW_WARNING,
  resolveListingQuoteCurrency,
  type QuoteCurrencyResolution,
} from "@/lib/services/instruments/quoteCurrency";
import {
  buildIdMappingLookupKey,
  buildSearchLookupKey,
  readListingMetadata,
  readPersistedInstrumentLookup,
  writeListingMetadata,
} from "@/lib/services/marketData/persistentMappingCache";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { PriceCurrency, PriceHoldingInput } from "@/lib/services/prices/types";

export type ListingQuoteCurrencyInput = {
  liveQuoteCurrency?: string | null;
  persistedQuoteCurrency?: PriceCurrency | null;
  providerSymbol?: string | null;
  exchange?: string | null;
  isin?: string | null;
};

async function readCachedProviderRows(input: {
  isin?: string | null;
  providerSymbol?: string | null;
}): Promise<Array<EodhdIdMappingRow | EodhdSearchRow>> {
  const parts = parseProviderSymbolParts(input.providerSymbol);
  const normalizedIsin = normalizeIsin(input.isin);
  if (normalizedIsin) {
    const cached = await readPersistedInstrumentLookup<EodhdIdMappingRow[]>(
      buildIdMappingLookupKey({ isin: normalizedIsin }),
    );
    if (cached?.length) {
      return cached;
    }
  }

  if (parts) {
    const searchCached = await readPersistedInstrumentLookup<EodhdSearchRow[]>(
      buildSearchLookupKey(parts.ticker, parts.exchange),
    );
    if (searchCached?.length) {
      return searchCached;
    }
  }

  return [];
}

async function lazyLookupListingMetadata(
  input: ListingQuoteCurrencyInput,
  options?: { allowProviderLookup?: boolean },
): Promise<ListingMetadataRecord | null> {
  const providerSymbol = input.providerSymbol?.trim().toUpperCase();
  if (!providerSymbol) {
    return null;
  }

  const existing = await readListingMetadata(providerSymbol);
  if (existing?.quoteCurrency) {
    return existing;
  }

  const cachedRows = await readCachedProviderRows(input);
  const fromCache = extractQuoteCurrencyFromProviderRows(cachedRows, providerSymbol);
  if (fromCache) {
    const metadata: ListingMetadataRecord = {
      providerSymbol,
      quoteCurrency: fromCache,
      exchange: input.exchange ?? parseProviderSymbolParts(providerSymbol)?.exchange ?? null,
      isin: normalizeIsin(input.isin),
      source: "id_mapping",
      resolvedAt: new Date().toISOString(),
    };
    await writeListingMetadata(metadata);
    return metadata;
  }

  if (!options?.allowProviderLookup) {
    return null;
  }

  const parts = parseProviderSymbolParts(providerSymbol);
  const normalizedIsin = normalizeIsin(input.isin);
  let rows: Array<EodhdIdMappingRow | EodhdSearchRow> = [];

  if (normalizedIsin) {
    rows = await fetchIdMapping({ isin: normalizedIsin });
  } else if (parts) {
    rows = await fetchSearch(parts.ticker, { exchange: parts.exchange, type: "etf" });
    if (rows.length === 0) {
      rows = await fetchSearch(parts.ticker, { exchange: parts.exchange });
    }
  }

  const currency = extractQuoteCurrencyFromProviderRows(rows, providerSymbol);
  if (!currency) {
    return null;
  }

  const metadata: ListingMetadataRecord = {
    providerSymbol,
    quoteCurrency: currency,
    exchange: input.exchange ?? parts?.exchange ?? null,
    isin: normalizedIsin,
    source: normalizedIsin ? "id_mapping" : "search",
    resolvedAt: new Date().toISOString(),
  };
  await writeListingMetadata(metadata);
  return metadata;
}

export async function resolveListingQuoteCurrencyAsync(
  input: ListingQuoteCurrencyInput,
  options?: { allowProviderLookup?: boolean },
): Promise<QuoteCurrencyResolution> {
  const listingMetadata = input.providerSymbol
    ? await readListingMetadata(input.providerSymbol)
    : null;

  const sync = resolveListingQuoteCurrency({
    liveQuoteCurrency: input.liveQuoteCurrency,
    persistedQuoteCurrency: input.persistedQuoteCurrency,
    providerSymbol: input.providerSymbol,
    exchange: input.exchange,
    listingMetadata,
  });
  if (sync.currency) {
    return sync;
  }

  const metadata = await lazyLookupListingMetadata(input, options);
  if (metadata?.quoteCurrency) {
    return resolveListingQuoteCurrency({
      ...input,
      listingMetadata: metadata,
    });
  }

  return sync;
}

export type ListingQuoteCurrencyEnrichment = {
  holdings: PriceHoldingInput[];
  resolvedByProviderSymbol: Map<string, PriceCurrency>;
  errors: string[];
  providerLookups: number;
};

function listingInputKey(holding: PriceHoldingInput): string | null {
  const providerSymbol = holding.providerSymbol?.trim().toUpperCase();
  if (!providerSymbol || holding.assetType === "crypto" || holding.assetType === "cash") {
    return null;
  }
  return providerSymbol;
}

export async function enrichHoldingsWithListingQuoteCurrency(
  holdings: PriceHoldingInput[],
  options?: { allowProviderLookup?: boolean },
): Promise<ListingQuoteCurrencyEnrichment> {
  const resolvedByProviderSymbol = new Map<string, PriceCurrency>();
  const errors: string[] = [];
  let providerLookups = 0;

  const unresolvedKeys = new Map<
    string,
    { isin?: string | null; exchange?: string | null }
  >();

  for (const holding of holdings) {
    if (holding.assetType === "crypto" || holding.assetType === "cash") {
      continue;
    }

    const key = listingInputKey(holding);
    if (!key) {
      continue;
    }

    const sync = resolveListingQuoteCurrency({
      persistedQuoteCurrency: holding.quoteCurrency ?? null,
      providerSymbol: key,
      exchange: holding.exchange ?? null,
    });
    if (sync.currency) {
      resolvedByProviderSymbol.set(key, sync.currency);
      continue;
    }

    if (!unresolvedKeys.has(key)) {
      unresolvedKeys.set(key, {
        isin: holding.isin ?? null,
        exchange: holding.exchange ?? null,
      });
    }
  }

  for (const [providerSymbol, context] of unresolvedKeys) {
    const before = await readListingMetadata(providerSymbol);
    const resolution = await resolveListingQuoteCurrencyAsync(
      {
        providerSymbol,
        isin: context.isin,
        exchange: context.exchange,
      },
      options,
    );
    const after = await readListingMetadata(providerSymbol);
    if (!before && after) {
      providerLookups += 1;
    }

    if (resolution.currency) {
      resolvedByProviderSymbol.set(providerSymbol, resolution.currency);
    } else {
      errors.push(`${providerSymbol}: ${QUOTE_CURRENCY_REVIEW_WARNING}`);
    }
  }

  const enriched = holdings.map((holding) => {
    const key = listingInputKey(holding);
    if (!key) {
      return holding;
    }
    const resolved = resolvedByProviderSymbol.get(key);
    if (!resolved) {
      return holding;
    }
    if (holding.quoteCurrency === resolved) {
      return holding;
    }
    return { ...holding, quoteCurrency: resolved };
  });

  return {
    holdings: enriched,
    resolvedByProviderSymbol,
    errors,
    providerLookups,
  };
}

