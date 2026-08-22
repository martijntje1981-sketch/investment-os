import {
  CASH_BENCHMARK_CACHE_TTL_MS,
  CASH_BENCHMARK_LABELS,
  CASH_BENCHMARK_STALE_TTL_MS,
  classifyCashYieldEnvironment,
  SUPPORTED_CASH_CURRENCIES,
} from "@/lib/services/cashIntelligence/benchmarkConfig";
import { fetchBoeCashRates } from "@/lib/services/cashIntelligence/providers/boe";
import { fetchEcbCashRates } from "@/lib/services/cashIntelligence/providers/ecb";
import { fetchNyFedCashRates } from "@/lib/services/cashIntelligence/providers/nyFed";
import type {
  CashBenchmarksSnapshot,
  CashProviderFetchResult,
  CashRatePoint,
  CurrencyCashBenchmark,
} from "@/lib/services/cashIntelligence/types";

type CacheEntry = {
  snapshot: CashBenchmarksSnapshot;
  storedAt: number;
};

let memoryCache: CacheEntry | null = null;

function buildCurrencyBenchmark(
  currency: CurrencyCashBenchmark["currency"],
  provider: CashProviderFetchResult,
): CurrencyCashBenchmark {
  const labels = CASH_BENCHMARK_LABELS[currency];
  const notes: string[] = [];
  let overnight = provider.overnight;
  let overnightIsFallback = false;

  // USD: prefer SOFR; fall back to EFFR (stored as policy from NY Fed).
  if (currency === "USD" && !overnight && provider.policy) {
    overnight = provider.policy;
    overnightIsFallback = true;
    notes.push("SOFR unavailable; using EFFR as overnight fallback.");
  }

  // GBP: prefer SONIA; fall back to Bank Rate.
  if (currency === "GBP" && !overnight && provider.policy) {
    overnight = provider.policy;
    overnightIsFallback = true;
    notes.push("SONIA unavailable; using Bank Rate as overnight fallback.");
  }

  const cashBenchmark: CashRatePoint | null = overnight;
  const status =
    cashBenchmark && provider.policy
      ? "available"
      : cashBenchmark || provider.policy
        ? "partial"
        : "unavailable";

  return {
    currency,
    overnight: provider.overnight,
    overnightLabel: overnightIsFallback
      ? (labels.overnightFallback ?? labels.overnightPreferred)
      : labels.overnightPreferred,
    overnightIsFallback,
    policy: provider.policy,
    policyLabel: labels.policy,
    cashBenchmarkPercent: cashBenchmark?.ratePercent ?? null,
    cashBenchmarkLabel: cashBenchmark
      ? overnightIsFallback
        ? (labels.overnightFallback ?? labels.overnightPreferred)
        : labels.overnightPreferred
      : null,
    cashBenchmarkSource: cashBenchmark?.sourceName ?? null,
    environment: classifyCashYieldEnvironment(cashBenchmark?.ratePercent),
    status,
    notes: [...notes, ...provider.errors],
  };
}

export async function fetchCashBenchmarks(options?: {
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<CashBenchmarksSnapshot> {
  const now = options?.now ?? Date.now();
  const fetchImpl = options?.fetchImpl ?? fetch;

  if (
    !options?.forceRefresh &&
    memoryCache &&
    now - memoryCache.storedAt < CASH_BENCHMARK_CACHE_TTL_MS
  ) {
    return {
      ...memoryCache.snapshot,
      isStale: false,
    };
  }

  if (
    !options?.forceRefresh &&
    memoryCache &&
    now - memoryCache.storedAt < CASH_BENCHMARK_STALE_TTL_MS
  ) {
    // Refresh in background intent: return stale immediately if refresh fails below.
  }

  try {
    const [eur, usd, gbp] = await Promise.all([
      fetchEcbCashRates(fetchImpl),
      fetchNyFedCashRates(fetchImpl),
      fetchBoeCashRates(fetchImpl),
    ]);

    const currencies = SUPPORTED_CASH_CURRENCIES.map((currency) => {
      if (currency === "EUR") return buildCurrencyBenchmark("EUR", eur);
      if (currency === "USD") return buildCurrencyBenchmark("USD", usd);
      return buildCurrencyBenchmark("GBP", gbp);
    });

    const providerErrors = [...eur.errors, ...usd.errors, ...gbp.errors];
    const snapshot: CashBenchmarksSnapshot = {
      currencies,
      fetchedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + CASH_BENCHMARK_CACHE_TTL_MS).toISOString(),
      isStale: false,
      providerErrors,
    };

    memoryCache = { snapshot, storedAt: now };
    return snapshot;
  } catch (error) {
    if (
      memoryCache &&
      now - memoryCache.storedAt < CASH_BENCHMARK_STALE_TTL_MS
    ) {
      return {
        ...memoryCache.snapshot,
        isStale: true,
        providerErrors: [
          ...memoryCache.snapshot.providerErrors,
          error instanceof Error
            ? error.message
            : "Cash benchmark refresh failed",
        ],
      };
    }

    return {
      currencies: SUPPORTED_CASH_CURRENCIES.map((currency) =>
        buildCurrencyBenchmark(currency, {
          overnight: null,
          policy: null,
          errors: [],
        }),
      ),
      fetchedAt: new Date(now).toISOString(),
      cacheExpiresAt: new Date(now + CASH_BENCHMARK_CACHE_TTL_MS).toISOString(),
      isStale: false,
      providerErrors: [
        error instanceof Error
          ? error.message
          : "Cash benchmark providers unavailable",
      ],
    };
  }
}

export function resetCashBenchmarkCacheForTests(): void {
  memoryCache = null;
}

export function seedCashBenchmarkCacheForTests(
  snapshot: CashBenchmarksSnapshot,
  storedAt = Date.now(),
): void {
  memoryCache = { snapshot, storedAt };
}

/** Pure helper exported for unit tests of selection/fallback. */
export function selectCashBenchmarkForTests(
  currency: CurrencyCashBenchmark["currency"],
  provider: CashProviderFetchResult,
): CurrencyCashBenchmark {
  return buildCurrencyBenchmark(currency, provider);
}
