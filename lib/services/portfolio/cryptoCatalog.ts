import {
  fetchExchangeSymbolList,
  type EodhdExchangeSymbolListRow,
} from "@/lib/services/instruments/eodhdClient";
import {
  buildCryptoNormalizedPair,
  resolveCryptoQuoteFallbackPlan,
  resolveCryptoQuoteFetchPlan,
} from "@/lib/services/prices/cryptoQuoteResolution";

export const CRYPTO_CATALOG_EXCHANGE = "CC";
export const CRYPTO_CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type CryptoCatalogEntry = {
  providerSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayPair: string;
  name: string | null;
  exchange: "CC";
  instrumentType: "crypto";
};

export type CryptoCatalogDiagnostics = {
  totalRows: number;
  validRows: number;
  malformedRows: number;
  duplicateRows: number;
  inactiveRows: number;
};

export type CryptoCatalogSnapshot = {
  entries: CryptoCatalogEntry[];
  diagnostics: CryptoCatalogDiagnostics;
  source: "cache" | "provider" | "stale_cache";
};

export type CryptoPairResolution =
  | {
      kind: "direct";
      requestedDisplayPair: string;
      providerSymbol: string;
      providerDisplayPair: string;
      baseAsset: string;
      requestedQuoteAsset: string;
      sourcePair: string;
      conversionApplied: false;
      conversionPath: null;
    }
  | {
      kind: "converted";
      requestedDisplayPair: string;
      providerSymbol: string;
      providerDisplayPair: string;
      baseAsset: string;
      requestedQuoteAsset: string;
      sourcePair: string;
      conversionApplied: true;
      conversionPath: string;
    }
  | {
      kind: "unavailable";
      requestedDisplayPair: string;
      baseAsset: string;
      requestedQuoteAsset: string;
      reason: "pair_not_listed" | "unsupported_quote_currency";
    };

export type CryptoSearchResult = {
  name: string | null;
  baseAsset: string;
  requestedDisplayPair: string;
  providerSymbol: string | null;
  providerDisplayPair: string | null;
  exchange: "CC";
  instrumentType: "crypto";
  availableQuoteAssets: string[];
  conversionApplied: boolean;
  conversionPath: string | null;
  sourcePair: string | null;
  matchKind:
    | "exact_base"
    | "exact_pair"
    | "exact_provider_symbol"
    | "exact_name"
    | "starts_with"
    | "partial_name"
    | "partial_pair";
  score: number;
  resolution: CryptoPairResolution;
};

type CatalogGroup = {
  baseAsset: string;
  name: string | null;
  entriesByQuote: Map<string, CryptoCatalogEntry>;
};

const inflightCatalogLoads = new Map<string, Promise<CryptoCatalogSnapshot>>();

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeOptionalName(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readTruthyFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "active"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "inactive"].includes(normalized)) return false;
  return null;
}

function isInactiveRow(row: EodhdExchangeSymbolListRow): boolean {
  const delisted = readTruthyFlag(row.Delisted);
  if (delisted === true) return true;
  const isActive = readTruthyFlag(row.IsActive ?? row.Active);
  return isActive === false;
}

export function parseCryptoProviderSymbol(
  providerSymbol: string,
): { baseAsset: string; quoteAsset: string } | null {
  const normalized = providerSymbol.trim().toUpperCase();
  if (!normalized.endsWith(".CC")) {
    return null;
  }
  const withoutSuffix = normalized.slice(0, -3);
  const separatorIndex = withoutSuffix.lastIndexOf("-");
  if (separatorIndex <= 0 || separatorIndex >= withoutSuffix.length - 1) {
    return null;
  }

  const baseAsset = withoutSuffix.slice(0, separatorIndex).trim();
  const quoteAsset = withoutSuffix.slice(separatorIndex + 1).trim();
  if (!baseAsset || !quoteAsset) {
    return null;
  }

  return { baseAsset, quoteAsset };
}

function normalizeProviderSymbol(code: string | null | undefined): string | null {
  const normalizedCode = normalizeToken(code);
  if (!normalizedCode) {
    return null;
  }
  return normalizedCode.endsWith(".CC")
    ? normalizedCode
    : `${normalizedCode}.CC`;
}

export function normalizeCryptoCatalogRows(
  rows: EodhdExchangeSymbolListRow[],
): {
  entries: CryptoCatalogEntry[];
  diagnostics: CryptoCatalogDiagnostics;
} {
  const byProviderSymbol = new Map<string, CryptoCatalogEntry>();
  let malformedRows = 0;
  let duplicateRows = 0;
  let inactiveRows = 0;

  for (const row of rows) {
    if (isInactiveRow(row)) {
      inactiveRows += 1;
      continue;
    }

    const providerSymbol = normalizeProviderSymbol(row.Code);
    const parsed = providerSymbol ? parseCryptoProviderSymbol(providerSymbol) : null;
    const exchange = normalizeToken(row.Exchange || CRYPTO_CATALOG_EXCHANGE);
    if (!providerSymbol || !parsed || exchange !== CRYPTO_CATALOG_EXCHANGE) {
      malformedRows += 1;
      continue;
    }

    if (byProviderSymbol.has(providerSymbol)) {
      duplicateRows += 1;
      continue;
    }

    byProviderSymbol.set(providerSymbol, {
      providerSymbol,
      baseAsset: parsed.baseAsset,
      quoteAsset: parsed.quoteAsset,
      displayPair: buildCryptoNormalizedPair(parsed.baseAsset, parsed.quoteAsset),
      name: normalizeOptionalName(row.Name),
      exchange: CRYPTO_CATALOG_EXCHANGE,
      instrumentType: "crypto",
    });
  }

  const entries = [...byProviderSymbol.values()].sort((a, b) =>
    a.providerSymbol.localeCompare(b.providerSymbol),
  );

  return {
    entries,
    diagnostics: {
      totalRows: rows.length,
      validRows: entries.length,
      malformedRows,
      duplicateRows,
      inactiveRows,
    },
  };
}

export async function fetchCryptoCatalog(): Promise<CryptoCatalogSnapshot> {
  const cacheKey = CRYPTO_CATALOG_EXCHANGE;
  const existing = inflightCatalogLoads.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const result = await fetchExchangeSymbolList(CRYPTO_CATALOG_EXCHANGE, {
      ttlMs: CRYPTO_CATALOG_CACHE_TTL_MS,
    });
    const normalized = normalizeCryptoCatalogRows(result.rows);
    return {
      ...normalized,
      source: result.source,
    };
  })();

  inflightCatalogLoads.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflightCatalogLoads.delete(cacheKey);
  }
}

export function buildCryptoCatalogGroups(
  entries: CryptoCatalogEntry[],
): Map<string, CatalogGroup> {
  const groups = new Map<string, CatalogGroup>();

  for (const entry of entries) {
    const existing = groups.get(entry.baseAsset);
    if (existing) {
      existing.entriesByQuote.set(entry.quoteAsset, entry);
      if (!existing.name && entry.name) {
        existing.name = entry.name;
      }
      continue;
    }

    groups.set(entry.baseAsset, {
      baseAsset: entry.baseAsset,
      name: entry.name,
      entriesByQuote: new Map([[entry.quoteAsset, entry]]),
    });
  }

  return groups;
}

export function resolveCryptoPairFromCatalog(
  groups: Map<string, CatalogGroup>,
  baseAsset: string,
  requestedQuoteAsset: string,
): CryptoPairResolution {
  const normalizedBase = normalizeToken(baseAsset);
  const normalizedQuote = normalizeToken(requestedQuoteAsset);
  const requestedDisplayPair = buildCryptoNormalizedPair(
    normalizedBase,
    normalizedQuote,
  );
  const group = groups.get(normalizedBase);
  if (!group) {
    return {
      kind: "unavailable",
      requestedDisplayPair,
      baseAsset: normalizedBase,
      requestedQuoteAsset: normalizedQuote,
      reason: "pair_not_listed",
    };
  }

  const direct = group.entriesByQuote.get(normalizedQuote);
  if (direct) {
    return {
      kind: "direct",
      requestedDisplayPair,
      providerSymbol: direct.providerSymbol,
      providerDisplayPair: direct.displayPair,
      baseAsset: normalizedBase,
      requestedQuoteAsset: normalizedQuote,
      sourcePair: direct.displayPair,
      conversionApplied: false,
      conversionPath: null,
    };
  }

  const directPlan = resolveCryptoQuoteFetchPlan(normalizedBase, normalizedQuote);
  if (!directPlan) {
    return {
      kind: "unavailable",
      requestedDisplayPair,
      baseAsset: normalizedBase,
      requestedQuoteAsset: normalizedQuote,
      reason: "unsupported_quote_currency",
    };
  }

  const fallback = resolveCryptoQuoteFallbackPlan(directPlan);
  if (!fallback) {
    return {
      kind: "unavailable",
      requestedDisplayPair,
      baseAsset: normalizedBase,
      requestedQuoteAsset: normalizedQuote,
      reason: "pair_not_listed",
    };
  }

  const fallbackEntry = group.entriesByQuote.get(
    parseCryptoProviderSymbol(fallback.providerSymbol)?.quoteAsset ?? "",
  );
  if (!fallbackEntry) {
    return {
      kind: "unavailable",
      requestedDisplayPair,
      baseAsset: normalizedBase,
      requestedQuoteAsset: normalizedQuote,
      reason: "pair_not_listed",
    };
  }

  return {
    kind: "converted",
    requestedDisplayPair,
    providerSymbol: fallbackEntry.providerSymbol,
    providerDisplayPair: fallbackEntry.displayPair,
    baseAsset: normalizedBase,
    requestedQuoteAsset: normalizedQuote,
    sourcePair: fallback.sourcePair,
    conversionApplied: true,
    conversionPath: fallback.conversionPath ?? `USD/${normalizedQuote}`,
  };
}

function normalizeSearchKey(value: string): string {
  return value.trim().toUpperCase();
}

function scoreCatalogGroup(
  group: CatalogGroup,
  query: string,
): { score: number; matchKind: CryptoSearchResult["matchKind"] } | null {
  const normalizedQuery = normalizeSearchKey(query);
  if (!normalizedQuery) return null;

  const displayPairs = [...group.entriesByQuote.values()].map((entry) => entry.displayPair);
  const providerSymbols = [...group.entriesByQuote.values()].map(
    (entry) => entry.providerSymbol,
  );
  const name = group.name?.trim() ?? "";
  const normalizedName = name.toUpperCase();

  if (normalizedQuery === group.baseAsset) {
    return { score: 1000, matchKind: "exact_base" };
  }
  if (displayPairs.some((pair) => normalizeSearchKey(pair) === normalizedQuery)) {
    return { score: 950, matchKind: "exact_pair" };
  }
  if (
    providerSymbols.some((providerSymbol) => normalizeSearchKey(providerSymbol) === normalizedQuery)
  ) {
    return { score: 925, matchKind: "exact_provider_symbol" };
  }
  if (normalizedName && normalizedName === normalizedQuery) {
    return { score: 900, matchKind: "exact_name" };
  }
  if (
    group.baseAsset.startsWith(normalizedQuery) ||
    displayPairs.some((pair) => normalizeSearchKey(pair).startsWith(normalizedQuery)) ||
    providerSymbols.some((providerSymbol) =>
      normalizeSearchKey(providerSymbol).startsWith(normalizedQuery),
    ) ||
    (normalizedName && normalizedName.startsWith(normalizedQuery))
  ) {
    return { score: 700, matchKind: "starts_with" };
  }
  if (
    normalizedName.includes(normalizedQuery) ||
    displayPairs.some((pair) => normalizeSearchKey(pair).includes(normalizedQuery)) ||
    providerSymbols.some((providerSymbol) =>
      normalizeSearchKey(providerSymbol).includes(normalizedQuery),
    )
  ) {
    return {
      score: normalizedName.includes(normalizedQuery) ? 500 : 450,
      matchKind: normalizedName.includes(normalizedQuery)
        ? "partial_name"
        : "partial_pair",
    };
  }

  return null;
}

export function searchCryptoCatalog(
  entries: CryptoCatalogEntry[],
  query: string,
  requestedQuoteAsset: string,
  limit = 8,
): CryptoSearchResult[] {
  const groups = buildCryptoCatalogGroups(entries);
  const matches: CryptoSearchResult[] = [];

  for (const group of groups.values()) {
    const scored = scoreCatalogGroup(group, query);
    if (!scored) continue;

    const resolution = resolveCryptoPairFromCatalog(
      groups,
      group.baseAsset,
      requestedQuoteAsset,
    );

    matches.push({
      name: group.name,
      baseAsset: group.baseAsset,
      requestedDisplayPair: buildCryptoNormalizedPair(
        group.baseAsset,
        requestedQuoteAsset,
      ),
      providerSymbol:
        resolution.kind === "unavailable" ? null : resolution.providerSymbol,
      providerDisplayPair:
        resolution.kind === "unavailable" ? null : resolution.providerDisplayPair,
      exchange: CRYPTO_CATALOG_EXCHANGE,
      instrumentType: "crypto",
      availableQuoteAssets: [...group.entriesByQuote.keys()].sort(),
      conversionApplied: resolution.kind === "converted",
      conversionPath:
        resolution.kind === "converted" ? resolution.conversionPath : null,
      sourcePair:
        resolution.kind === "unavailable" ? null : resolution.sourcePair,
      matchKind: scored.matchKind,
      score: scored.score,
      resolution,
    });
  }

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.conversionApplied !== b.conversionApplied) {
        return a.conversionApplied ? 1 : -1;
      }
      return a.baseAsset.localeCompare(b.baseAsset);
    })
    .slice(0, limit);
}

export function resolveCryptoSearchQuery(holding: {
  providerSymbol?: string | null;
  tradingPair?: string | null;
  symbol?: string | null;
  name?: string | null;
}): string {
  return (
    holding.providerSymbol?.trim() ||
    holding.tradingPair?.trim() ||
    holding.symbol?.trim() ||
    holding.name?.trim() ||
    ""
  );
}

export function applyCryptoSearchResultToHolding<T extends {
  symbol: string;
  name: string;
  pairCurrency?: string | null;
  tradingPair?: string | null;
  providerSymbol?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  providerDisplayName?: string | null;
  pricingStatus?: string | null;
  priceDataStatus?: string | null;
  exchange?: string | null;
}>(
  holding: T,
  result: CryptoSearchResult,
): T {
  const resolved =
    result.resolution.kind === "unavailable"
      ? null
      : result.resolution;

  return {
    ...holding,
    symbol: result.baseAsset,
    name: result.name?.trim() || result.baseAsset,
    pairCurrency: result.resolution.requestedQuoteAsset,
    tradingPair: result.resolution.requestedDisplayPair,
    providerSymbol: resolved?.providerSymbol ?? null,
    providerId: resolved ? "eodhd-quotes" : null,
    providerName: resolved ? "EODHD" : null,
    providerDisplayName: resolved ? "EODHD" : null,
    pricingStatus: resolved ? "price_unavailable" : "needs_review",
    priceDataStatus: "unavailable",
    exchange: resolved ? CRYPTO_CATALOG_EXCHANGE : null,
  };
}

export function isCryptoProviderSymbolSupportedByCatalog(
  entries: CryptoCatalogEntry[],
  providerSymbol: string | null | undefined,
): boolean {
  const normalized = normalizeToken(providerSymbol);
  return entries.some((entry) => entry.providerSymbol === normalized);
}

export function isCryptoBaseAssetCoveredByCatalog(
  entries: CryptoCatalogEntry[],
  baseAsset: string | null | undefined,
): boolean {
  const normalized = normalizeToken(baseAsset);
  return entries.some((entry) => entry.baseAsset === normalized);
}
