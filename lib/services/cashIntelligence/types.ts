/**
 * Cash Intelligence — objective central-bank and overnight money-market benchmarks.
 * Informational only; never a personal savings offer or bank comparison.
 */

export const CASH_INTELLIGENCE_DISCLAIMER =
  "These are market benchmark rates, not a personal savings offer. Actual interest depends on provider, product, currency, limits, and terms.";

export type CashBenchmarkCurrency = "EUR" | "USD" | "GBP";

export type CashYieldEnvironment = "Low" | "Moderate" | "Higher";

export type CashRatePoint = {
  ratePercent: number;
  effectiveDate: string | null;
  sourceName: string;
  sourceUrl: string;
  seriesId: string;
};

export type CurrencyCashBenchmark = {
  currency: CashBenchmarkCurrency;
  overnight: CashRatePoint | null;
  overnightLabel: string;
  overnightIsFallback: boolean;
  policy: CashRatePoint | null;
  policyLabel: string;
  /** Selected cash benchmark for calculations (overnight preferred). */
  cashBenchmarkPercent: number | null;
  cashBenchmarkLabel: string | null;
  cashBenchmarkSource: string | null;
  environment: CashYieldEnvironment | null;
  status: "available" | "partial" | "unavailable";
  notes: string[];
};

export type CashBenchmarksSnapshot = {
  currencies: CurrencyCashBenchmark[];
  fetchedAt: string;
  cacheExpiresAt: string;
  isStale: boolean;
  providerErrors: string[];
};

export type CashCurrencyImpact = {
  currency: CashBenchmarkCurrency;
  cashAmount: number;
  cashWeightPercent: number | null;
  benchmarkPercent: number | null;
  benchmarkLabel: string | null;
  indicativeAnnualYield: number | null;
  indicativeMonthlyYield: number | null;
  amountInBase: number | null;
  annualYieldInBase: number | null;
  amountInEur: number | null;
  annualYieldInEur: number | null;
};

export type CashIntelligenceSnapshot = {
  benchmarks: CashBenchmarksSnapshot;
  baseCurrency: string;
  hasCash: boolean;
  totalCashAmount: number | null;
  totalCashInEur: number | null;
  totalCashInBase: number | null;
  totalIndicativeAnnualYieldInEur: number | null;
  totalIndicativeAnnualYieldInBase: number | null;
  portfolioCashWeightPercent: number | null;
  byCurrency: CashCurrencyImpact[];
  baseCurrencyBenchmark: CurrencyCashBenchmark | null;
  disclaimer: string;
  fxStatus:
    "identity" | "current" | "cached" | "stale" | "unavailable" | "not_needed";
};

export type CashProviderFetchResult = {
  overnight: CashRatePoint | null;
  policy: CashRatePoint | null;
  errors: string[];
};
