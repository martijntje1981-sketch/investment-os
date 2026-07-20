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
  recordProviderCall,
  recordProviderFailure,
} from "@/lib/services/prices/observability";
import { createProviderRouter } from "@/lib/services/prices/providerRouter";
import {
  fetchEodhdFxRates,
  ProviderQuoteError,
} from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  dedupeResolvedTargets,
  resolveDefaultWatchlist,
  resolvePriceTargets,
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

const FX_CACHE_TTL_MS = 12 * 60 * 1000;

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

async function getFxRates(): Promise<FxRates> {
  const now = Date.now();
  if (fxCache && now <= fxCache.expiresAt) {
    return fxCache.rates;
  }

  if (fxInFlight) {
    recordPriceDedup();
    return fxInFlight;
  }

  fxInFlight = (async () => {
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
): Promise<NormalizedProviderQuote> {
  const cacheKey = buildQuoteCacheKey(provider.id, target.providerSymbol);

  try {
    const fxRates = await getFxRates();
    recordProviderCall();
    const raw = await provider.getQuote(target.providerSymbol);
    const quote = provider.normalizeQuote(target, raw, fxRates);
    writeCachedQuote(cacheKey, quote, target.providerSymbol);
    return quote;
  } catch (error) {
    const kind =
      error instanceof ProviderQuoteError ? error.kind : ("provider_error" as const);
    recordProviderFailure(kind === "quota_exhausted");

    if (isCircuitBreakerFailure(kind)) {
      writeNegativeCache(cacheKey, unavailableMessage(kind));
    }

    const cached = readCachedQuote(cacheKey);
    if (cached) {
      return cached.quote;
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
  if (readNegativeCache(cacheKey)) {
    return;
  }

  const existing = getInFlightQuote(cacheKey);
  if (existing) {
    await existing.catch(() => undefined);
    return;
  }

  const promise = fetchAndCacheQuote(target, provider).catch(() => undefined);
  setInFlightQuote(cacheKey, promise as Promise<NormalizedProviderQuote>);
  await promise;
}

export async function getNormalizedQuote(
  target: ResolvedPriceTarget,
): Promise<NormalizedProviderQuote> {
  const provider = getActiveRouter().selectProvider(target.providerSymbol);
  if (!provider) {
    return buildUnavailableQuote(
      target,
      "unknown",
      "No market data provider is configured.",
    );
  }

  const cacheKey = buildQuoteCacheKey(provider.id, target.providerSymbol);

  const negativeReason = readNegativeCache(cacheKey);
  if (negativeReason) {
    const cached = readCachedQuote(cacheKey);
    if (cached) {
      recordPriceCacheHit();
      return {
        ...cached.quote,
        unavailableReason: negativeReason,
      };
    }
    return buildUnavailableQuote(target, provider.id, negativeReason);
  }

  const cached = readCachedQuote(cacheKey);
  if (cached?.fresh) {
    recordPriceCacheHit();
    return cached.quote;
  }

  if (cached && !cached.fresh) {
    recordPriceCacheHit();
    void refreshQuoteInBackground(target, provider, cacheKey);
    return cached.quote;
  }

  recordPriceCacheMiss();

  const inFlight = getInFlightQuote(cacheKey);
  if (inFlight) {
    recordPriceDedup();
    return inFlight;
  }

  const promise = fetchAndCacheQuote(target, provider);
  setInFlightQuote(cacheKey, promise);
  return promise;
}

async function quoteToHoldingPrice(
  target: ResolvedPriceTarget,
): Promise<HoldingPrice> {
  const provider = getActiveRouter().selectProvider(target.providerSymbol);
  const quote = await getNormalizedQuote(target);

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
): Promise<PricePayload> {
  const uniqueTargets = dedupeResolvedTargets(targets);
  const fxRates = await getFxRates();

  const results = await Promise.allSettled(
    uniqueTargets.map((target) => quoteToHoldingPrice(target)),
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
): Promise<PricePayload> {
  const { targets, errors: resolutionErrors } =
    await resolvePriceTargets(holdings);
  const payload = await loadPricesForTargets(targets);
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
}
