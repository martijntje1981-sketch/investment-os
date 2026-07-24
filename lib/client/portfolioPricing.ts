/**
 * Shared client-side portfolio pricing pipeline.
 *
 * Used by portfolio, dashboard, and detail pages so every surface resolves
 * live prices through the same POST /api/prices + providerSymbol join logic.
 * All storage operations require the authenticated user's stable id (sub).
 */

import {
  assertUserSub,
  priceCacheKey,
} from "@/lib/client/portfolioStorageKeys";
import {
  readPortfolioFromStorage,
  writePortfolioToStorage,
  dispatchPortfolioUpdated,
  resolveVisiblePortfolioState,
  requestLegacyPortfolioMigration,
  tryExplicitLegacyPortfolioMigration,
  readScopedHoldingsRaw,
  isScopedPortfolioEmpty,
} from "@/lib/client/userPortfolioStorage";
import {
  type CachedPortfolioPrice,
  type PortfolioInstrumentPayload,
  type PriceApiQuote,
  type PriceApiResponse,
  type StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";
import {
  normalizeMarketQuote,
  type MarketDataStatus,
} from "@/lib/services/prices/marketQuote";
import { logHoldingDailyData } from "@/lib/client/holdingDailyDataDebug";
import { logStrcPortfolioLoadDiagnostics } from "@/lib/client/investmentOsProductionDebug";
import { CLIENT_PRICE_CACHE_FRESH_MS } from "@/lib/services/marketData/cachePolicy";
import { findSavedMappingForHolding } from "@/lib/services/import/mappingMemory";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import { syncPortfolioPricesFromSnapshot } from "@/lib/client/marketSnapshotSync";
import {
  backfillListingQuoteCurrencies,
  listingQuoteCurrenciesChanged,
} from "@/lib/services/instruments/quoteCurrency";
import { prepareManualHoldingForSave } from "@/lib/services/portfolio/holdingValidation";
import {
  enrichHoldingsWithVerifiedMappings,
  holdingsChangedByVerifiedEnrichment,
} from "@/lib/services/portfolio/enrichHoldingsWithVerifiedMappings";
import { writePortfolioBackupIfComplete } from "@/lib/client/portfolioLocalBackup";
import { recordLocalPortfolioSave, readPortfolioSyncMeta } from "@/lib/client/portfolioSyncState";

export {
  LEGACY_PORTFOLIO_STORAGE_KEY,
  LEGACY_PRICE_CACHE_KEY,
  portfolioStorageKey,
  priceCacheKey,
  goalStorageKey,
  annualContributionKey,
  PORTFOLIO_HOLDINGS_UPDATED_EVENT,
} from "@/lib/client/portfolioStorageKeys";

export {
  PORTFOLIO_STORAGE_KEY,
  PRICE_CACHE_KEY,
} from "@/lib/types/portfolioStorage";

export {
  readPortfolioFromStorage,
  writePortfolioToStorage,
  dispatchPortfolioUpdated,
  resolveVisiblePortfolioState,
  requestLegacyPortfolioMigration,
  tryExplicitLegacyPortfolioMigration,
  readScopedHoldingsRaw,
  isScopedPortfolioEmpty,
};

export {
  dismissLegacyPortfolioRecovery,
  getLegacyRecoveryOffer,
  mergeLegacyPriceCacheIntoScoped,
  recoverLegacyPortfolioToUser,
  type LegacyRecoveryOffer,
} from "@/lib/client/portfolioRecovery";

export type { StoredPortfolioHolding, PortfolioInstrumentPayload };

export type HoldingProviderSymbolChange = {
  before: Pick<StoredPortfolioHolding, "symbol" | "isin" | "providerSymbol">;
  after: Pick<StoredPortfolioHolding, "symbol" | "isin" | "providerSymbol">;
};

/** Central read path for all portfolio surfaces. */
export function loadUserPortfolioHoldings(
  userSub: string,
): StoredPortfolioHolding[] {
  const raw = readPortfolioFromStorage(userSub);
  const enriched = enrichHoldingsWithVerifiedMappings(raw);
  const withQuoteCurrency = backfillListingQuoteCurrencies(enriched);

  const providerSymbolChanges = raw
    .map((before, index) => ({
      before,
      after: withQuoteCurrency[index]!,
    }))
    .filter(
      ({ before, after }) =>
        (before.providerSymbol ?? null) !== (after.providerSymbol ?? null),
    );

  if (providerSymbolChanges.length > 0) {
    invalidateConflictingPriceCacheEntries(userSub, providerSymbolChanges);
  }

  if (
    holdingsChangedByVerifiedEnrichment(raw, enriched) ||
    listingQuoteCurrenciesChanged(enriched, withQuoteCurrency)
  ) {
    writePortfolioToStorage(userSub, withQuoteCurrency);
    writePortfolioBackupIfComplete(userSub, withQuoteCurrency);
    const meta = readPortfolioSyncMeta(userSub);
    recordLocalPortfolioSave(
      userSub,
      withQuoteCurrency,
      (meta.lastLocalRevision ?? 0) + 1,
    );
  }

  purgeIncorrectPriceCacheEntries(userSub, withQuoteCurrency);

  const strcBeforeCache = withQuoteCurrency.find(
    (holding) => holding.symbol.trim().toUpperCase() === "STRC",
  );

  const holdings = applyCachedPrices(userSub, withQuoteCurrency);

  if (verifiedListingPricesChanged(withQuoteCurrency, holdings, userSub)) {
    persistVerifiedListingQuoteCorrections(userSub, holdings);
  }

  if (strcBeforeCache) {
    const strcAfterCache = holdings.find(
      (holding) => holding.id === strcBeforeCache.id,
    );
    if (strcAfterCache) {
      const cached = readPriceCacheEntries(userSub);
      const quotes = cached
        .filter((item) => Number.isFinite(item.price) && item.price > 0)
        .map((item) =>
          normalizePriceApiQuote({
            symbol: item.symbol,
            providerSymbol: item.providerSymbol,
            isin: item.isin ?? null,
            priceEur: item.price,
            currentPrice: item.price,
            previousClose: item.previousClose ?? null,
            change: item.change ?? null,
            changePercent: item.changePercent ?? null,
            currency: item.currency ?? null,
            dataStatus: item.dataStatus,
            updatedAt: item.updatedAt ?? null,
          }),
        );
      const lookup = buildPriceLookup(quotes);
      const selection = describeQuoteSelectionForHolding(strcBeforeCache, lookup);

      logStrcPortfolioLoadDiagnostics({
        beforeCache: strcBeforeCache,
        afterCache: strcAfterCache,
        selection: {
          cacheKey: selection.cacheKey,
          matchedQuoteProviderSymbol:
            selection.quote?.providerSymbol ??
            selection.quote?.eodhdSymbol ??
            null,
          matchedQuotePriceEur: selection.quote?.priceEur ?? null,
        },
      });
    }
  }

  logHoldingDailyData(holdings, "after cache apply");
  return holdings;
}

export function isInvestmentPricePending(
  holding: StoredPortfolioHolding,
): boolean {
  if (holding.assetType === "cash") return false;
  return !Number.isFinite(holding.currentPrice) || holding.currentPrice <= 0;
}

/** Persist a holding without requiring provider lookup or live market data. */
export function normalizeHoldingForSave(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  return prepareManualHoldingForSave(holding);
}

export type PriceRefreshOptions = {
  forceRefresh?: boolean;
  onlyProviderSymbols?: string[];
  skipIfCacheFresh?: boolean;
};

let refreshInFlight: Promise<unknown> | null = null;

export function isLivePriceRefreshInFlight(): boolean {
  return refreshInFlight !== null;
}

export async function waitForLivePriceRefreshCompletion(): Promise<void> {
  if (!refreshInFlight) return;
  await refreshInFlight.catch(() => undefined);
}

export function readPriceCacheUpdatedAt(userSub: string): number | null {
  assertUserSub(userSub);

  try {
    const cached = localStorage.getItem(priceCacheKey(userSub));
    const parsed = cached ? (JSON.parse(cached) as CachedPortfolioPrice[]) : [];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const timestamps = parsed
      .map((item) => Date.parse(item.updatedAt ?? ""))
      .filter((value) => Number.isFinite(value));

    if (timestamps.length === 0) {
      return null;
    }

    return Math.max(...timestamps);
  } catch {
    return null;
  }
}

export function isPriceCacheFresh(
  userSub: string,
  now = Date.now(),
): boolean {
  const updatedAt = readPriceCacheUpdatedAt(userSub);
  if (updatedAt === null) {
    return false;
  }
  return now - updatedAt < CLIENT_PRICE_CACHE_FRESH_MS;
}

export type PriceRefreshResult<T extends StoredPortfolioHolding> = {
  holdings: T[];
  updated: boolean;
  message?: string;
  rateLimited?: boolean;
};

export function countQuotablePriceHoldings(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): number {
  return buildPriceRequestPayload(holdings, userSub).filter((item) =>
    Boolean(item.providerSymbol?.trim()),
  ).length;
}

function filterQuotablePricePayload(
  payload: PortfolioInstrumentPayload[],
): PortfolioInstrumentPayload[] {
  return payload.filter((item) => Boolean(item.providerSymbol?.trim()));
}

export function filterQuotablePricePayloadForRefresh(
  payload: PortfolioInstrumentPayload[],
): PortfolioInstrumentPayload[] {
  return filterQuotablePricePayload(payload);
}

function resolveQuotableRefreshPayload(
  holdings: StoredPortfolioHolding[],
  userSub: string,
  options?: PriceRefreshOptions,
): PortfolioInstrumentPayload[] {
  const payload = buildPriceRequestPayload(holdings, userSub);
  const scopedPayload =
    options?.onlyProviderSymbols && options.onlyProviderSymbols.length > 0
      ? payload.filter((item) =>
          item.providerSymbol
            ? options.onlyProviderSymbols!.some(
                (symbol) =>
                  symbol.trim().toUpperCase() ===
                  item.providerSymbol!.trim().toUpperCase(),
              )
            : false,
        )
      : payload;

  return filterQuotablePricePayload(scopedPayload);
}

export function isRateLimitedPriceError(message: string): boolean {
  return /402|rate.?limit|daily.?limit|quota|too many requests|429|payment required/i.test(
    message,
  );
}

export function normalizePortfolioSymbol(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

/** Builds the POST /api/prices request body from stored holdings. */
export function buildPriceRequestPayload(
  holdings: StoredPortfolioHolding[],
  userSub?: string,
): PortfolioInstrumentPayload[] {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .map((holding) => {
      const savedMapping =
        userSub != null ? findSavedMappingForHolding(userSub, holding) : null;

      return {
        symbol: holding.symbol,
        name: holding.name,
        isin: holding.isin ?? savedMapping?.isin ?? null,
        exchange: holding.exchange ?? savedMapping?.exchange ?? null,
        providerSymbol:
          holding.providerSymbol ?? savedMapping?.providerSymbol ?? null,
        instrumentName:
          holding.instrumentName ?? savedMapping?.instrumentName ?? null,
        quoteCurrency: holding.quoteCurrency ?? savedMapping?.quoteCurrency ?? null,
      };
    });
}

/** Builds the POST /api/briefing request body from stored holdings. */
export function buildBriefingRequestPayload(
  holdings: StoredPortfolioHolding[],
): PortfolioInstrumentPayload[] {
  return buildPriceRequestPayload(holdings);
}

export function resolveQuoteProviderSymbol(
  quote: Pick<PriceApiQuote, "providerSymbol" | "eodhdSymbol">,
): string | null {
  const value = quote.providerSymbol ?? quote.eodhdSymbol;
  return value?.trim() ? normalizePortfolioSymbol(value) : null;
}

/** Indexes listing-specific keys first; bare tickers only when no provider symbol exists. */
export function quoteLookupKeys(quote: PriceApiQuote): string[] {
  const provider = resolveQuoteProviderSymbol(quote);
  const keys: string[] = [];

  if (provider) {
    keys.push(provider);
  }

  if (quote.isin) {
    keys.push(normalizePortfolioSymbol(quote.isin));
  }

  if (!provider) {
    keys.push(normalizePortfolioSymbol(quote.symbol));
  }

  return keys.filter(Boolean);
}

export function isQuoteCompatibleWithHolding(
  holding: Pick<StoredPortfolioHolding, "symbol" | "providerSymbol" | "isin">,
  quote: PriceApiQuote,
): boolean {
  const holdingProvider = holding.providerSymbol?.trim()
    ? normalizePortfolioSymbol(holding.providerSymbol)
    : null;
  const quoteProvider = resolveQuoteProviderSymbol(quote);

  if (holdingProvider) {
    if (!quoteProvider) {
      return false;
    }

    return holdingProvider === quoteProvider;
  }

  if (quoteProvider) {
    const holdingTicker = normalizePortfolioSymbol(holding.symbol);
    const quoteTicker = normalizePortfolioSymbol(quote.symbol);
    if (quoteTicker !== holdingTicker) {
      return false;
    }
  }

  return true;
}

/** Indexes quotes by symbol, providerSymbol, eodhdSymbol, and ISIN. */
export function buildPriceLookup(
  quotes: PriceApiQuote[] | undefined,
): Map<string, PriceApiQuote> {
  const lookup = new Map<string, PriceApiQuote>();

  for (const quote of normalizePriceApiQuotes(quotes)) {
    if (!Number.isFinite(quote.priceEur) || quote.priceEur <= 0) continue;

    for (const key of quoteLookupKeys(quote)) {
      if (!lookup.has(key)) lookup.set(key, quote);
    }
  }

  return lookup;
}

/** Coerces API/cache quote payloads into the shared normalized quote shape. */
export function normalizePriceApiQuote(raw: PriceApiQuote): PriceApiQuote {
  const priceEur =
    typeof raw.currentPrice === "number" && raw.currentPrice > 0
      ? raw.currentPrice
      : raw.priceEur;

  const normalized = normalizeMarketQuote({
    symbol: raw.symbol,
    priceEur,
    previousCloseEur: raw.previousClose ?? null,
    changeEur: raw.change ?? null,
    changePercent: raw.changePercent ?? null,
    originalCurrency: raw.currency ?? null,
    updatedAt: raw.updatedAt ?? null,
  });

  return {
    ...raw,
    priceEur: normalized.currentPrice ?? priceEur,
    currentPrice: normalized.currentPrice,
    previousClose: normalized.previousClose,
    change: normalized.change,
    changePercent: normalized.changePercent,
    currency: normalized.currency,
    updatedAt: normalized.updatedAt,
    dataStatus: raw.dataStatus ?? normalized.dataStatus,
  };
}

export function normalizePriceApiQuotes(
  quotes: PriceApiQuote[] | undefined,
): PriceApiQuote[] {
  return (quotes ?? []).map((quote) => normalizePriceApiQuote(quote));
}

function applyQuoteToHolding<T extends StoredPortfolioHolding>(
  holding: T,
  quote: PriceApiQuote,
): T {
  const normalized = normalizePriceApiQuote(quote);

  return {
    ...holding,
    currentPrice: normalized.priceEur,
    providerSymbol:
      quote.providerSymbol ?? quote.eodhdSymbol ?? holding.providerSymbol ?? null,
    previousClose:
      typeof normalized.previousClose === "number"
        ? normalized.previousClose
        : null,
    changeAmount:
      typeof normalized.change === "number" ? normalized.change : null,
    changePercent:
      typeof normalized.changePercent === "number"
        ? normalized.changePercent
        : null,
    priceDataStatus:
      (normalized.dataStatus as MarketDataStatus | undefined) ??
      holding.priceDataStatus,
    updatedAt: normalized.updatedAt ?? holding.updatedAt,
    marketPriceUpdatedAt: normalized.updatedAt ?? new Date().toISOString(),
  };
}

function clearHoldingDailyPerformance<T extends StoredPortfolioHolding>(
  holding: T,
): T {
  return {
    ...holding,
    previousClose: null,
    changeAmount: null,
    changePercent: null,
  };
}

/** Resolves quotes in verified-listing order: providerSymbol, ISIN, then generic ticker. */
export function holdingLookupKeys(
  holding: StoredPortfolioHolding,
): string[] {
  const keys: string[] = [];

  if (holding.providerSymbol?.trim()) {
    keys.push(normalizePortfolioSymbol(holding.providerSymbol));
  }

  if (holding.isin?.trim()) {
    keys.push(normalizePortfolioSymbol(holding.isin));
  }

  if (!holding.providerSymbol?.trim()) {
    keys.push(normalizePortfolioSymbol(holding.symbol));
  }

  return keys.filter(Boolean);
}

export function findQuoteForHolding(
  holding: StoredPortfolioHolding,
  lookup: Map<string, PriceApiQuote>,
): PriceApiQuote | undefined {
  for (const key of holdingLookupKeys(holding)) {
    const quote = lookup.get(key);
    if (quote && isQuoteCompatibleWithHolding(holding, quote)) {
      return quote;
    }
  }
  return undefined;
}

export function describeQuoteSelectionForHolding(
  holding: StoredPortfolioHolding,
  lookup: Map<string, PriceApiQuote>,
): {
  cacheKey: string | null;
  quote: PriceApiQuote | null;
} {
  for (const key of holdingLookupKeys(holding)) {
    const quote = lookup.get(key);
    if (quote && isQuoteCompatibleWithHolding(holding, quote)) {
      return { cacheKey: key, quote };
    }
  }

  return { cacheKey: null, quote: null };
}

export function applyPricesToHoldings<T extends StoredPortfolioHolding>(
  holdings: T[],
  quotes: PriceApiQuote[] | undefined,
  options?: { clearMissingDailyFields?: boolean },
): T[] {
  const lookup = buildPriceLookup(quotes);
  const clearMissingDailyFields = options?.clearMissingDailyFields ?? false;

  return holdings.map((holding) => {
    if (holding.assetType === "cash") return holding;

    const quote = findQuoteForHolding(holding, lookup);
    if (!quote) {
      console.warn("[holding daily data missing quote]", {
        name: holding.name,
        symbol: holding.symbol,
        providerSymbol: holding.providerSymbol,
        isin: holding.isin,
      });
      if (
        holding.providerSymbol &&
        Number.isFinite(holding.currentPrice) &&
        holding.currentPrice > 0
      ) {
        return {
          ...holding,
          priceDataStatus: "stale",
        };
      }
      return clearMissingDailyFields
        ? clearHoldingDailyPerformance(holding)
        : holding;
    }

    return applyQuoteToHolding(holding, quote);
  });
}

export function writePriceCache(
  userSub: string,
  quotes: PriceApiQuote[] | undefined,
  metadata?: {
    lastSuccessfulUpdate?: string | null;
    quoteSource?: "cache" | "provider" | "mixed" | null;
  },
): void {
  assertUserSub(userSub);

  const cache: CachedPortfolioPrice[] = normalizePriceApiQuotes(quotes)
    .filter((quote) => Number.isFinite(quote.priceEur) && quote.priceEur > 0)
    .map((quote) => ({
      symbol: normalizePortfolioSymbol(quote.symbol),
      providerSymbol: quote.providerSymbol ?? quote.eodhdSymbol,
      isin: quote.isin ?? null,
      price: quote.priceEur,
      previousClose:
        typeof quote.previousClose === "number" ? quote.previousClose : undefined,
      change: typeof quote.change === "number" ? quote.change : undefined,
      changePercent:
        typeof quote.changePercent === "number" ? quote.changePercent : undefined,
      currency: quote.currency ?? null,
      dataStatus: quote.dataStatus,
      updatedAt: quote.updatedAt ?? metadata?.lastSuccessfulUpdate ?? undefined,
      provider: quote.provider ?? null,
      quoteSource: metadata?.quoteSource ?? "provider",
      lastSuccessfulUpdate:
        metadata?.lastSuccessfulUpdate ?? quote.updatedAt ?? null,
    }));

  localStorage.setItem(priceCacheKey(userSub), JSON.stringify(cache));
}

export function readPriceCacheEntries(userSub: string): CachedPortfolioPrice[] {
  assertUserSub(userSub);

  try {
    const cached = localStorage.getItem(priceCacheKey(userSub));
    const parsed = cached ? (JSON.parse(cached) as CachedPortfolioPrice[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isConflictingPriceCacheEntry(
  entry: CachedPortfolioPrice,
  change: HoldingProviderSymbolChange,
): boolean {
  const verifiedProvider = change.after.providerSymbol?.trim().toUpperCase();
  if (!verifiedProvider) {
    return false;
  }

  const ticker = normalizePortfolioSymbol(change.after.symbol);
  const entryTicker = normalizePortfolioSymbol(entry.symbol);
  const entryProvider = entry.providerSymbol?.trim().toUpperCase() ?? null;
  const previousProvider = change.before.providerSymbol?.trim().toUpperCase() ?? null;
  const holdingIsin = change.after.isin
    ? normalizePortfolioSymbol(change.after.isin)
    : null;
  const entryIsin = entry.isin ? normalizePortfolioSymbol(entry.isin) : null;

  const relatesByTicker = entryTicker === ticker;
  const relatesByIsin = Boolean(holdingIsin && entryIsin === holdingIsin);
  if (!relatesByTicker && !relatesByIsin) {
    return false;
  }

  if (relatesByTicker && !entryProvider) {
    return true;
  }

  if (entryProvider && entryProvider !== verifiedProvider) {
    if (relatesByTicker || relatesByIsin) {
      return true;
    }
  }

  if (
    previousProvider &&
    previousProvider !== verifiedProvider &&
    entryProvider === previousProvider &&
    (relatesByTicker || relatesByIsin)
  ) {
    return true;
  }

  return false;
}

export function invalidateConflictingPriceCacheEntries(
  userSub: string,
  changes: HoldingProviderSymbolChange[],
): CachedPortfolioPrice[] {
  assertUserSub(userSub);

  if (changes.length === 0) {
    return readPriceCacheEntries(userSub);
  }

  const remaining = readPriceCacheEntries(userSub).filter(
    (entry) => !changes.some((change) => isConflictingPriceCacheEntry(entry, change)),
  );

  localStorage.setItem(priceCacheKey(userSub), JSON.stringify(remaining));
  return remaining;
}

/** Removes generic-ticker and wrong-listing cache rows for verified holdings. */
export function purgeIncorrectPriceCacheEntries(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): CachedPortfolioPrice[] {
  const verifiedHoldings = holdings.filter(
    (holding) =>
      holding.assetType !== "cash" && Boolean(holding.providerSymbol?.trim()),
  );

  if (verifiedHoldings.length === 0) {
    return readPriceCacheEntries(userSub);
  }

  return invalidateConflictingPriceCacheEntries(
    userSub,
    verifiedHoldings.map((holding) => ({
      before: {
        symbol: holding.symbol,
        isin: holding.isin ?? null,
        providerSymbol: holding.providerSymbol ?? null,
      },
      after: {
        symbol: holding.symbol,
        isin: holding.isin ?? null,
        providerSymbol: holding.providerSymbol ?? null,
      },
    })),
  );
}

function readPriceCacheQuotes(userSub: string): PriceApiQuote[] {
  return readPriceCacheEntries(userSub)
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .map((item) =>
      normalizePriceApiQuote({
        symbol: item.symbol,
        providerSymbol: item.providerSymbol,
        isin: item.isin ?? null,
        priceEur: item.price,
        currentPrice: item.price,
        previousClose: item.previousClose ?? null,
        change: item.change ?? null,
        changePercent: item.changePercent ?? null,
        currency: item.currency ?? null,
        dataStatus: item.dataStatus,
        updatedAt: item.updatedAt ?? null,
      }),
    );
}

function buildPriceCacheLookupForUser(
  userSub: string,
): Map<string, PriceApiQuote> {
  return buildPriceLookup(readPriceCacheQuotes(userSub));
}

export function isVerifiedListingHolding(
  holding: Pick<StoredPortfolioHolding, "assetType" | "providerSymbol">,
): boolean {
  return holding.assetType !== "cash" && Boolean(holding.providerSymbol?.trim());
}

export function findCompatibleCachedQuoteForHolding(
  userSub: string,
  holding: StoredPortfolioHolding,
): PriceApiQuote | null {
  assertUserSub(userSub);
  const lookup = buildPriceCacheLookupForUser(userSub);
  return describeQuoteSelectionForHolding(holding, lookup).quote;
}

export function resolveVerifiedListingPriceFromCache(
  userSub: string,
  holding: StoredPortfolioHolding,
  fallbackPrice: number,
): number {
  const quote = findCompatibleCachedQuoteForHolding(userSub, holding);
  if (quote && Number.isFinite(quote.priceEur) && quote.priceEur > 0) {
    return quote.priceEur;
  }
  return fallbackPrice;
}

function holdingPriceCorrectedByCompatibleQuote(
  userSub: string,
  before: StoredPortfolioHolding,
  after: StoredPortfolioHolding,
): boolean {
  if (!isVerifiedListingHolding(after)) {
    return false;
  }
  if (before.currentPrice === after.currentPrice) {
    return false;
  }
  const quote = findCompatibleCachedQuoteForHolding(userSub, after);
  return quote !== null && quote.priceEur === after.currentPrice;
}

export function verifiedListingPricesChanged(
  before: StoredPortfolioHolding[],
  after: StoredPortfolioHolding[],
  userSub: string,
): boolean {
  const beforeById = new Map(before.map((holding) => [holding.id, holding]));
  return after.some((holding) => {
    const prior = beforeById.get(holding.id);
    if (!prior) {
      return false;
    }
    return holdingPriceCorrectedByCompatibleQuote(userSub, prior, holding);
  });
}

export function remoteVerifiedListingPricesStale(
  remoteHoldings: StoredPortfolioHolding[],
  correctedHoldings: StoredPortfolioHolding[],
  userSub: string,
): boolean {
  const remoteById = new Map(remoteHoldings.map((holding) => [holding.id, holding]));
  return correctedHoldings.some((holding) => {
    const remote = remoteById.get(holding.id);
    if (!remote) {
      return false;
    }
    return holdingPriceCorrectedByCompatibleQuote(userSub, remote, holding);
  });
}

export function persistVerifiedListingQuoteCorrections(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): void {
  assertUserSub(userSub);
  writePortfolioToStorage(userSub, holdings);
  writePortfolioBackupIfComplete(userSub, holdings);
  const meta = readPortfolioSyncMeta(userSub);
  recordLocalPortfolioSave(
    userSub,
    holdings,
    (meta.lastLocalRevision ?? 0) + 1,
  );
}

/** Applies cached prices using the same multi-key join as live pricing. */
export function applyCachedPrices<T extends StoredPortfolioHolding>(
  userSub: string,
  holdings: T[],
): T[] {
  assertUserSub(userSub);

  try {
    return applyPricesToHoldings(holdings, readPriceCacheQuotes(userSub));
  } catch {
    return holdings;
  }
}

/**
 * Fetches live prices for the supplied holdings via POST /api/prices,
 * writes the user-scoped cache, and returns holdings with updated prices.
 */
export async function refreshPortfolioPrices<
  T extends StoredPortfolioHolding,
>(
  userSub: string,
  holdings: T[],
  options?: PriceRefreshOptions,
): Promise<{ holdings: T[]; fetched: boolean }> {
  assertUserSub(userSub);

  const quotablePayload = resolveQuotableRefreshPayload(holdings, userSub, options);
  if (quotablePayload.length === 0) {
    return { holdings, fetched: false };
  }

  const response = await fetch("/api/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      holdings: quotablePayload,
      forceRefresh: options?.forceRefresh ?? false,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as PriceApiResponse;
  if (!response.ok || (!data.success && !data.message)) {
    throw new Error(data.error ?? data.message ?? "Market data unavailable");
  }

  if (data.message === NO_QUOTABLE_HOLDINGS_MESSAGE) {
    return { holdings, fetched: false };
  }

  if (!data.success) {
    throw new Error(data.message ?? "Market data unavailable");
  }

  const normalizedQuotes = normalizePriceApiQuotes(data.prices);

  console.log("[price api coverage]", {
    requested: data.requested ?? quotablePayload.length,
    received: data.received ?? normalizedQuotes.length,
    payloadHoldings: quotablePayload.length,
    skipped: buildPriceRequestPayload(holdings, userSub).length - quotablePayload.length,
  });

  if (data.errors?.length) {
    console.warn("[price api errors]", data.errors);
  }

  console.log(
    "[price api quotes]",
    normalizedQuotes.map((quote) => ({
      symbol: quote.symbol,
      providerSymbol: quote.providerSymbol ?? quote.eodhdSymbol,
      currentPrice: quote.currentPrice ?? quote.priceEur,
      previousClose: quote.previousClose,
      change: quote.change,
      changePercent: quote.changePercent,
      updatedAt: quote.updatedAt,
      dataStatus: quote.dataStatus,
    })),
  );

  writePriceCache(userSub, data.prices);
  const refreshed = applyPricesToHoldings(holdings, data.prices, {
    clearMissingDailyFields: true,
  });
  logHoldingDailyData(refreshed, "after /api/prices refresh");
  return { holdings: refreshed, fetched: true };
}

/**
 * Best-effort price refresh that never discards holdings when quotes fail.
 */
export async function tryRefreshPortfolioPrices<
  T extends StoredPortfolioHolding,
>(
  userSub: string,
  holdings: T[],
  options?: PriceRefreshOptions,
): Promise<PriceRefreshResult<T>> {
  if (holdings.length === 0) {
    return { holdings, updated: false };
  }

  if (countQuotablePriceHoldings(holdings, userSub) === 0) {
    return {
      holdings: applyCachedPrices(userSub, holdings),
      updated: false,
      message: NO_QUOTABLE_HOLDINGS_MESSAGE,
    };
  }

  if (options?.forceRefresh) {
    if (refreshInFlight) {
      await refreshInFlight.catch(() => undefined);
      return {
        holdings: applyCachedPrices(userSub, holdings),
        updated: false,
        message: "Price refresh already in progress.",
      };
    }

    const run = (async () => {
      try {
        const { holdings: refreshed, fetched } = await refreshPortfolioPrices(
          userSub,
          holdings,
          options,
        );
        if (!fetched) {
          return {
            holdings: applyCachedPrices(userSub, refreshed),
            updated: false,
            message: NO_QUOTABLE_HOLDINGS_MESSAGE,
          } satisfies PriceRefreshResult<T>;
        }
        return { holdings: refreshed, updated: true } satisfies PriceRefreshResult<T>;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Market data unavailable";
        return {
          holdings,
          updated: false,
          message,
          rateLimited: isRateLimitedPriceError(message),
        } satisfies PriceRefreshResult<T>;
      } finally {
        refreshInFlight = null;
      }
    })();

    refreshInFlight = run;
    return run;
  }

  return syncPortfolioPricesFromSnapshot(userSub, holdings, {
    skipIfLocalCacheCurrent: options?.skipIfCacheFresh ?? true,
  });
}
