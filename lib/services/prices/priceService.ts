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
} from "@/lib/services/prices/cache/marketPriceCache";
import {
  getPriceServiceMetricsSnapshot,
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
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import {
  readPersistedQuote,
  writePersistedQuote,
} from "@/lib/services/marketData/persistentQuoteCache";
import { EODHD_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuotaGuard";
import {
  dedupeResolvedTargets,
  resolveDefaultWatchlist,
  resolveQuotePriceTargets,
} from "@/lib/services/prices/resolvePriceTargets";
import type {
  HoldingPrice,
  MarketDataProvider,
  NormalizedProviderQuote,
  PriceCurrency,
  PriceHoldingInput,
  PricePayload,
  ProviderFailureKind,
  ResolvedPriceTarget,
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
};

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
  if (!forceRefresh && fxCache && now <= fxCache.expiresAt) {
    return fxCache.rates;
  }

  if (isProviderCircuitOpen(EODHD_PROVIDER_ID)) {
    recordProviderCooldown(EODHD_PROVIDER_ID);
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
    assertProviderAvailable(EODHD_PROVIDER_ID);
    recordProviderCall();
    const rates = await fetchEodhdFxRates();
    fxCache = { rates, expiresAt: Date.now() + FX_CACHE_TTL_MS };
    return rates;
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
    assertProviderAvailable(provider.id);
    const fxRates = await getFxRates(forceRefresh);
    recordProviderCall();
    const raw = await provider.getQuote(target.providerSymbol);
    const quote = provider.normalizeQuote(target, raw, fxRates);
    writeCachedQuote(cacheKey, quote, target.providerSymbol);
    await writePersistedQuote({
      cacheKey,
      providerId: provider.id,
      providerSymbol: target.providerSymbol,
      quote,
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
): Promise<void> {
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
  options?: { forceRefresh?: boolean },
): Promise<NormalizedProviderQuote> {
  const forceRefresh = options?.forceRefresh ?? false;
  const provider = getActiveRouter().selectProvider(target.providerSymbol);
  if (!provider) {
    return buildUnavailableQuote(
      target,
      "unknown",
      "No market data provider is configured.",
    );
  }

  const cacheKey = buildQuoteCacheKey(provider.id, target.providerSymbol);

  if (isProviderCircuitOpen(provider.id)) {
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
    void refreshQuoteInBackground(target, provider, cacheKey);
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

  const fxRates = await getFxRates();
  return convertQuoteToHoldingPrice(target, quote, fxRates);
}

function buildPricePayload(
  prices: HoldingPrice[],
  errors: string[],
  requested: number,
  fxRates: FxRates,
): PricePayload {
  return {
    success: prices.length > 0,
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
  };
}

export async function loadPricesForTargets(
  targets: ResolvedPriceTarget[],
  options?: LoadPricesOptions,
): Promise<PricePayload> {
  const uniqueTargets = dedupeResolvedTargets(targets);
  const fxRates = await getFxRates(options?.forceRefresh ?? false);

  const results = await Promise.allSettled(
    uniqueTargets.map((target) =>
      quoteToHoldingPrice(target, { forceRefresh: options?.forceRefresh }),
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
  const { targets, errors: resolutionErrors } = resolveQuotePriceTargets(
    holdings,
    { onlyProviderSymbols: options?.onlyProviderSymbols },
  );
  const payload = await loadPricesForTargets(targets, options);
  return {
    ...payload,
    errors: [...resolutionErrors, ...payload.errors],
    requested: holdings.length,
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
