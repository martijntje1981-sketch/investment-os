import {
  buildUnavailableQuote,
  convertQuoteToHoldingPrice,
} from "@/lib/services/prices/convertToHoldingPrice";
import {
  buildQuoteCacheKey,
  getInFlightQuote,
  getQuoteCacheTtlMs,
  readCachedQuote,
  readNegativeCache,
  resetMarketPriceCacheForTests,
  setInFlightQuote,
  writeCachedQuote,
  writeNegativeCache,
  clearNegativeCache,
} from "@/lib/services/prices/cache/marketPriceCache";
import {
  getPriceServiceMetricsSnapshot,
  logPriceRefreshSummary,
  logPriceServiceMetrics,
  recordPriceCacheHit,
  recordPriceCacheMiss,
  recordPriceDedup,
  recordPriceServiceEvent,
  recordProviderCall,
  recordProviderFailure,
  recordProviderCooldown,
  resetPriceServiceMetricsForTests,
} from "@/lib/services/prices/observability";
import { createProviderRouter } from "@/lib/services/prices/providerRouter";
import {
  fetchEodhdFxRates,
  ProviderQuoteError,
} from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  DEFAULT_MARKET_DATA_CACHE_POLICY,
} from "@/lib/services/marketData/cachePolicy";
import {
  assertProviderAvailable,
  getProviderCircuitReason,
  getProviderCircuitSnapshot,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  recordProviderCircuitSuccess,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { logMarketDataRefreshTrace } from "@/lib/services/marketData/providerDiagnostics";
import {
  readPersistedQuote,
  writePersistedQuote,
} from "@/lib/services/marketData/persistentQuoteCache";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import {
  dedupeResolvedTargets,
  resolveDefaultWatchlist,
  resolveQuotePriceTargets,
} from "@/lib/services/prices/resolvePriceTargets";
import { estimatePriceRefreshForTargets } from "@/lib/services/prices/estimatePriceRefresh";
import {
  NO_QUOTABLE_HOLDINGS_MESSAGE,
  type HoldingPrice,
  type MarketDataProvider,
  type NormalizedProviderQuote,
  type PriceCurrency,
  type PriceHoldingInput,
  type PricePayload,
  type PriceRefreshSummary,
  type ProviderFailureKind,
  type ResolvedPriceTarget,
} from "@/lib/services/prices/types";

let defaultRouter: ReturnType<typeof createProviderRouter> | null = null;
let testProviders: MarketDataProvider[] | null = null;

function getDefaultRouter() {
  if (!defaultRouter) {
    defaultRouter = createProviderRouter();
  }
  return defaultRouter;
}

function getActiveRouter() {
  if (testProviders) {
    return createProviderRouter(testProviders);
  }
  return getDefaultRouter();
}

type FxRates = Record<PriceCurrency, number | null>;

let fxCache: { rates: FxRates; expiresAt: number } | null = null;
let fxInFlight: Promise<FxRates> | null = null;

const FX_CACHE_TTL_MS = DEFAULT_MARKET_DATA_CACHE_POLICY.fxFreshMs;

export type LoadPricesOptions = {
  forceRefresh?: boolean;
  onlyProviderSymbols?: string[];
  allowBackgroundRefresh?: boolean;
  estimateOnly?: boolean;
};

const DEFAULT_FX_RATES: FxRates = { EUR: 1, USD: null, GBP: null, CHF: null };

function effectiveForceRefresh(requested: boolean): boolean {
  return requested;
}

async function readQuoteFromCaches(
  cacheKey: string,
  forceRefresh: boolean,
): Promise<{ quote: NormalizedProviderQuote; fresh: boolean } | null> {
  if (forceRefresh) {
    return null;
  }

  const memory = readCachedQuote(cacheKey);
  if (memory) {
    return memory;
  }

  const persisted = await readPersistedQuote(cacheKey);
  if (!persisted) {
    return null;
  }

  writeCachedQuote(cacheKey, persisted.quote, persisted.quote.providerSymbol);
  return { quote: persisted.quote, fresh: persisted.fresh };
}

function unavailableMessage(kind: ProviderFailureKind): string {
  switch (kind) {
    case "quota_exhausted":
      return "Price temporarily unavailable (provider quota exhausted).";
    case "rate_limited":
      return "Price temporarily unavailable (rate limited).";
    case "timeout":
      return "Price temporarily unavailable (provider timeout).";
    case "invalid_symbol":
      return "Price unavailable (invalid symbol).";
    case "incomplete_quote":
      return "Price unavailable (incomplete quote).";
    default:
      return "Price temporarily unavailable.";
  }
}

function isCircuitBreakerFailure(kind: ProviderFailureKind): boolean {
  return kind === "quota_exhausted" || kind === "rate_limited";
}

async function getFxRates(forceRefresh = false): Promise<FxRates> {
  const now = Date.now();
  const refreshLive = effectiveForceRefresh(forceRefresh);

  if (!refreshLive && fxCache && now <= fxCache.expiresAt) {
    return fxCache.rates;
  }

  if (isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID) && !refreshLive) {
    recordProviderCooldown(EODHD_QUOTE_PROVIDER_ID);
    if (fxCache) {
      return fxCache.rates;
    }
    return { EUR: 1, USD: null, GBP: null, CHF: null };
  }

  if (fxInFlight) {
    recordPriceDedup();
    return fxInFlight;
  }

  fxInFlight = (async () => {
    if (!refreshLive) {
      assertProviderAvailable(EODHD_QUOTE_PROVIDER_ID);
    }
    recordProviderCall();
    try {
      const rates = await fetchEodhdFxRates();
      fxCache = { rates, expiresAt: Date.now() + FX_CACHE_TTL_MS };
      return rates;
    } catch (error) {
      const kind =
        error instanceof ProviderQuoteError
          ? error.kind
          : ("provider_error" as const);
      recordProviderFailure(kind === "quota_exhausted");

      if (isCircuitBreakerFailure(kind)) {
        recordProviderCircuitFailure(EODHD_QUOTE_PROVIDER_ID, error);
        recordProviderCooldown(EODHD_QUOTE_PROVIDER_ID);
      }

      if (fxCache) {
        return fxCache.rates;
      }

      return DEFAULT_FX_RATES;
    }
  })();

  try {
    return await fxInFlight;
  } finally {
    fxInFlight = null;
  }
}

async function fetchAndCacheQuote(
  target: ResolvedPriceTarget,
  provider: MarketDataProvider,
  forceRefresh = false,
): Promise<NormalizedProviderQuote> {
  const cacheKey = buildQuoteCacheKey(provider.id, target.providerSymbol);

  try {
    if (!forceRefresh) {
      assertProviderAvailable(provider.id);
    }
    const fxRates = await getFxRates(forceRefresh);
    recordProviderCall();
    const raw = await provider.getQuote(target.providerSymbol);
    const quote = provider.normalizeQuote(target, raw, fxRates);
    writeCachedQuote(cacheKey, quote, target.providerSymbol);
    clearNegativeCache(cacheKey);
    recordProviderCircuitSuccess(provider.id);
    await writePersistedQuote({
      cacheKey,
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
      quote,
    });
    logMarketDataRefreshTrace("cache_write", {
      cacheKey,
      providerSymbol: target.providerSymbol,
      forceRefresh,
      dataStatus: quote.dataStatus,
      updatedAt: quote.updatedAt,
    });
    recordPriceServiceEvent("fresh_fetch", {
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
    });
    return quote;
  } catch (error) {
    const kind =
      error instanceof ProviderQuoteError ? error.kind : ("provider_error" as const);
    recordProviderFailure(kind === "quota_exhausted");

    if (isCircuitBreakerFailure(kind)) {
      recordProviderCircuitFailure(provider.id, error);
      writeNegativeCache(cacheKey, unavailableMessage(kind));
      recordProviderCooldown(provider.id);
    }

    if (forceRefresh) {
      logMarketDataRefreshTrace("force_refresh_provider_failure", {
        cacheKey,
        providerSymbol: target.providerSymbol,
        kind,
        status: error instanceof ProviderQuoteError ? error.status : null,
      });
      throw error instanceof Error
        ? error
        : new Error(`${target.providerSymbol}: provider error.`);
    }

    const cached = await readQuoteFromCaches(cacheKey, false);
    if (cached) {
      recordPriceServiceEvent("stale_fallback", {
        providerId: provider.id,
        providerSymbol: target.providerSymbol,
      });
      return {
        ...cached.quote,
        unavailableReason: unavailableMessage(kind),
      };
    }

    throw error instanceof Error
      ? error
      : new Error(`${target.providerSymbol}: provider error.`);
  }
}

async function refreshQuoteInBackground(
  target: ResolvedPriceTarget,
  provider: MarketDataProvider,
  cacheKey: string,
  enabled: boolean,
): Promise<void> {
  if (!enabled) {
    return;
  }

  if (readNegativeCache(cacheKey) || isProviderCircuitOpen(provider.id)) {
    recordProviderCooldown(provider.id);
    return;
  }

  const existing = getInFlightQuote(cacheKey);
  if (existing) {
    await existing.catch(() => undefined);
    return;
  }

  const promise = fetchAndCacheQuote(target, provider, false).catch(() => undefined);
  setInFlightQuote(cacheKey, promise as Promise<NormalizedProviderQuote>);
  await promise;
}

export async function getNormalizedQuote(
  target: ResolvedPriceTarget,
  options?: { forceRefresh?: boolean; allowBackgroundRefresh?: boolean },
): Promise<NormalizedProviderQuote> {
  const provider = getActiveRouter().selectProvider(target.providerSymbol);
  if (!provider) {
    return buildUnavailableQuote(
      target,
      "unknown",
      "No market data provider is configured.",
    );
  }

  const forceRefresh = effectiveForceRefresh(
    options?.forceRefresh ?? false,
  );
  const cacheKey = buildQuoteCacheKey(provider.id, target.providerSymbol);

  if (isProviderCircuitOpen(provider.id) && !forceRefresh) {
    recordProviderCooldown(provider.id);
    const cached = await readQuoteFromCaches(cacheKey, false);
    if (cached) {
      recordPriceCacheHit();
      recordPriceServiceEvent("provider_cooldown", {
        providerId: provider.id,
        providerSymbol: target.providerSymbol,
      });
      return {
        ...cached.quote,
        unavailableReason:
          getProviderCircuitReason(provider.id) ??
          unavailableMessage("quota_exhausted"),
      };
    }
    return buildUnavailableQuote(
      target,
      provider.id,
      getProviderCircuitReason(provider.id) ??
        unavailableMessage("quota_exhausted"),
    );
  }

  const negativeReason = readNegativeCache(cacheKey);
  if (negativeReason && !forceRefresh) {
    const cached = await readQuoteFromCaches(cacheKey, false);
    if (cached) {
      recordPriceCacheHit();
      return {
        ...cached.quote,
        unavailableReason: negativeReason,
      };
    }
    return buildUnavailableQuote(target, provider.id, negativeReason);
  }

  const cached = await readQuoteFromCaches(cacheKey, forceRefresh);
  if (cached?.fresh) {
    recordPriceCacheHit();
    recordPriceServiceEvent("cache_hit", {
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
    });
    return cached.quote;
  }

  if (cached && !cached.fresh && !forceRefresh) {
    recordPriceCacheHit();
    recordPriceServiceEvent("cache_stale", {
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
    });
    void refreshQuoteInBackground(
      target,
      provider,
      cacheKey,
      options?.allowBackgroundRefresh ?? false,
    );
    return cached.quote;
  }

  recordPriceCacheMiss();

  const inFlight = getInFlightQuote(cacheKey);
  if (inFlight) {
    recordPriceDedup();
    recordPriceServiceEvent("deduplicated", {
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
    });
    return inFlight;
  }

  const promise = fetchAndCacheQuote(target, provider, forceRefresh);
  setInFlightQuote(cacheKey, promise);
  return promise;
}

async function quoteToHoldingPrice(
  target: ResolvedPriceTarget,
  options?: { forceRefresh?: boolean },
): Promise<HoldingPrice> {
  const quote = await getNormalizedQuote(target, options);

  if (
    quote.dataStatus === "unavailable" ||
    quote.currentPrice === null ||
    quote.currentPrice <= 0
  ) {
    throw new Error(
      quote.unavailableReason ??
        `${target.symbol}: live price is temporarily unavailable.`,
    );
  }

  const forceRefresh = effectiveForceRefresh(options?.forceRefresh ?? false);
  if (
    forceRefresh &&
    (quote.dataStatus === "stale" ||
      quote.isStale ||
      quote.cacheStatus === "stale")
  ) {
    throw new Error(
      quote.unavailableReason ??
        `${target.symbol}: live price refresh returned stale cached data.`,
    );
  }

  const fxRates = await getFxRates(forceRefresh);
  return convertQuoteToHoldingPrice(target, quote, fxRates);
}

function resolveQuoteSource(
  prices: HoldingPrice[],
  metricsBefore: ReturnType<typeof getPriceServiceMetricsSnapshot>,
): "cache" | "provider" | "mixed" {
  const providerCallsMade =
    getPriceServiceMetricsSnapshot().providerCalls - metricsBefore.providerCalls;
  if (providerCallsMade <= 0) {
    return "cache";
  }
  if (prices.length === 0) {
    return "provider";
  }
  const cacheHits =
    getPriceServiceMetricsSnapshot().cacheHits - metricsBefore.cacheHits;
  return cacheHits > 0 ? "mixed" : "provider";
}

function buildPricePayload(
  prices: HoldingPrice[],
  errors: string[],
  requested: number,
  fxRates: FxRates,
  options?: {
    message?: string;
    forceSuccess?: boolean;
    metricsBefore?: ReturnType<typeof getPriceServiceMetricsSnapshot>;
    refreshSummary?: PriceRefreshSummary;
  },
): PricePayload {
  const metricsBefore =
    options?.metricsBefore ?? getPriceServiceMetricsSnapshot();
  const lastSuccessfulUpdate =
    prices
      .map((price) => price.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return {
    success: options?.forceSuccess ?? prices.length > 0,
    message: options?.message,
    baseCurrency: "EUR",
    fxRates: {
      EUR: fxRates.EUR,
      USD_TO_EUR: fxRates.USD,
      GBP_TO_EUR: fxRates.GBP,
      CHF_TO_EUR: fxRates.CHF,
    },
    prices,
    errors,
    requested,
    received: prices.length,
    generatedAt: new Date().toISOString(),
    cache: {
      enabled: true,
      durationSeconds: Math.round(getQuoteCacheTtlMs("VWCE.XETRA") / 1000),
    },
    metrics: getPriceServiceMetricsSnapshot(),
    lastSuccessfulUpdate,
    quoteSource: resolveQuoteSource(prices, metricsBefore),
    refreshSummary: options?.refreshSummary,
  };
}

function buildNoQuotablePayload(
  holdingsRequested: number,
  skipped: number,
  errors: string[],
): PricePayload {
  return buildPricePayload([], errors, holdingsRequested, DEFAULT_FX_RATES, {
    message: NO_QUOTABLE_HOLDINGS_MESSAGE,
    forceSuccess: true,
  });
}

function logRefreshOutcome(
  holdingsRequested: number,
  skipped: number,
  quotable: number,
  metricsBefore: ReturnType<typeof getPriceServiceMetricsSnapshot>,
  refreshSummary?: PriceRefreshSummary,
): void {
  const metricsAfter = getPriceServiceMetricsSnapshot();
  const summary = {
    holdingsRequested,
    holdingsSkipped: skipped,
    holdingsQuotable: quotable,
    providerCallsMade: metricsAfter.providerCalls - metricsBefore.providerCalls,
    cacheHits: metricsAfter.cacheHits - metricsBefore.cacheHits,
    cacheMisses: metricsAfter.cacheMisses - metricsBefore.cacheMisses,
    uniqueSymbols: refreshSummary?.uniqueSymbols ?? [],
    skippedSymbols: refreshSummary?.skippedSymbols ?? [],
    circuitOpen: refreshSummary?.circuitOpen ?? false,
    providerCallsRequired: refreshSummary?.providerCallsRequired ?? null,
  };
  logPriceRefreshSummary(summary);
}

export async function loadPricesForTargets(
  targets: ResolvedPriceTarget[],
  options?: LoadPricesOptions,
): Promise<PricePayload> {
  const uniqueTargets = dedupeResolvedTargets(targets);
  if (uniqueTargets.length === 0) {
    return buildPricePayload([], [], 0, DEFAULT_FX_RATES);
  }

  const forceRefresh = effectiveForceRefresh(options?.forceRefresh ?? false);
  const fxRates = await getFxRates(forceRefresh);

  const results = await Promise.allSettled(
    uniqueTargets.map((target) =>
      quoteToHoldingPrice(target, { forceRefresh }),
    ),
  );

  const prices = results
    .filter(
      (result): result is PromiseFulfilledResult<HoldingPrice> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const errors = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : "Unknown error while loading a market price.",
    );

  logPriceServiceMetrics(
    `loadPricesForTargets requested=${uniqueTargets.length} received=${prices.length}`,
  );

  return buildPricePayload(prices, errors, uniqueTargets.length, fxRates);
}

export async function loadPricesForHoldings(
  holdings: PriceHoldingInput[],
  options?: LoadPricesOptions,
): Promise<PricePayload> {
  const metricsBefore = getPriceServiceMetricsSnapshot();
  const holdingsRequested = holdings.length;
  const { targets, errors: resolutionErrors, skipped } = resolveQuotePriceTargets(
    holdings,
    { onlyProviderSymbols: options?.onlyProviderSymbols },
  );

  if (targets.length === 0) {
    const payload = buildNoQuotablePayload(
      holdingsRequested,
      skipped,
      resolutionErrors,
    );
    logRefreshOutcome(holdingsRequested, skipped, 0, metricsBefore);
    return payload;
  }

  const estimate = await estimatePriceRefreshForTargets(targets);
  if (options?.estimateOnly) {
    logRefreshOutcome(holdingsRequested, skipped, targets.length, metricsBefore, estimate);
    return buildPricePayload([], resolutionErrors, holdingsRequested, DEFAULT_FX_RATES, {
      forceSuccess: true,
      metricsBefore,
      refreshSummary: estimate,
      message: "Price refresh estimate ready.",
    });
  }

  const payload = await loadPricesForTargets(targets, options);
  const refreshSummary: PriceRefreshSummary = {
    ...estimate,
    providerCallsMade:
      (payload.metrics?.providerCalls ?? 0) - metricsBefore.providerCalls,
    circuitOpen: getProviderCircuitSnapshot(EODHD_QUOTE_PROVIDER_ID).open,
  };

  logRefreshOutcome(holdingsRequested, skipped, targets.length, metricsBefore, refreshSummary);
  logMarketDataRefreshTrace("portfolio_recalc", {
    forceRefresh: options?.forceRefresh ?? false,
    requested: holdingsRequested,
    quotable: targets.length,
    received: payload.received,
    quoteSource: payload.quoteSource,
    circuitOpen: refreshSummary.circuitOpen,
    providerCallsMade: refreshSummary.providerCallsMade,
    lastSuccessfulUpdate: payload.lastSuccessfulUpdate,
  });
  return {
    ...payload,
    errors: [...resolutionErrors, ...payload.errors],
    requested: holdingsRequested,
    refreshSummary,
    quoteSource: payload.quoteSource,
    lastSuccessfulUpdate: payload.lastSuccessfulUpdate,
  };
}

export async function loadDefaultWatchlistPrices(): Promise<PricePayload> {
  const targets = await resolveDefaultWatchlist();
  return loadPricesForTargets(targets);
}

export function configureMarketDataProvidersForTests(
  providers: MarketDataProvider[] | null,
): void {
  testProviders = providers;
}

export function resetPriceServiceStateForTests(): void {
  fxCache = null;
  fxInFlight = null;
  testProviders = null;
  defaultRouter = null;
  resetMarketPriceCacheForTests();
  resetProviderCircuitForTests();
  resetPriceServiceMetricsForTests();
}
