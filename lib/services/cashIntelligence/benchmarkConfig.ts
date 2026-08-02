/**
 * Cash benchmark selection and yield-environment thresholds.
 *
 * Preferred overnight benchmarks (used for indicative yield):
 * - EUR: €STR
 * - USD: SOFR (fallback: EFFR)
 * - GBP: SONIA (fallback: Bank Rate)
 *
 * Central-bank policy rates are shown as macro context:
 * - EUR: ECB Deposit Facility Rate
 * - USD: Effective Federal Funds Rate (policy context when SOFR is primary)
 * - GBP: Bank of England Bank Rate
 *
 * Fallback order when preferred overnight is missing:
 * 1. Currency-specific overnight fallback (USD → EFFR; GBP → Bank Rate)
 * 2. Otherwise leave cashBenchmark null (never invent a rate)
 */

import type {
  CashBenchmarkCurrency,
  CashYieldEnvironment,
} from "@/lib/services/cashIntelligence/types";

/** Annualized overnight/policy percent thresholds for environment labels. */
export const CASH_YIELD_ENVIRONMENT_THRESHOLDS = {
  /** Below this → Low */
  moderateMinPercent: 2,
  /** At/above this → Higher; between moderateMin and this → Moderate */
  higherMinPercent: 4,
} as const;

export const CASH_BENCHMARK_CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours (within 6–12h)
export const CASH_BENCHMARK_STALE_TTL_MS = 24 * 60 * 60 * 1000; // serve stale up to 24h

export const SUPPORTED_CASH_CURRENCIES: CashBenchmarkCurrency[] = [
  "EUR",
  "USD",
  "GBP",
];

export const CASH_BENCHMARK_LABELS: Record<
  CashBenchmarkCurrency,
  {
    overnightPreferred: string;
    overnightFallback: string | null;
    policy: string;
  }
> = {
  EUR: {
    overnightPreferred: "€STR",
    overnightFallback: null,
    policy: "ECB Deposit Facility Rate",
  },
  USD: {
    overnightPreferred: "SOFR",
    overnightFallback: "EFFR",
    policy: "Effective Federal Funds Rate",
  },
  GBP: {
    overnightPreferred: "SONIA",
    overnightFallback: "Bank Rate",
    policy: "Bank of England Bank Rate",
  },
};

export function classifyCashYieldEnvironment(
  ratePercent: number | null | undefined,
): CashYieldEnvironment | null {
  if (ratePercent == null || !Number.isFinite(ratePercent)) {
    return null;
  }

  if (ratePercent < CASH_YIELD_ENVIRONMENT_THRESHOLDS.moderateMinPercent) {
    return "Low";
  }
  if (ratePercent < CASH_YIELD_ENVIRONMENT_THRESHOLDS.higherMinPercent) {
    return "Moderate";
  }
  return "Higher";
}

export function isSupportedCashCurrency(
  value: string,
): value is CashBenchmarkCurrency {
  return SUPPORTED_CASH_CURRENCIES.includes(
    value.toUpperCase() as CashBenchmarkCurrency,
  );
}
