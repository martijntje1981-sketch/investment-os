import { isSupportedCashCurrency } from "@/lib/services/cashIntelligence/benchmarkConfig";
import {
  CASH_INTELLIGENCE_DISCLAIMER,
  type CashBenchmarkCurrency,
  type CashBenchmarksSnapshot,
  type CashCurrencyImpact,
  type CashIntelligenceSnapshot,
  type CurrencyCashBenchmark,
} from "@/lib/services/cashIntelligence/types";
import {
  buildBaseCurrencyFxSnapshot,
  convertCanonicalEurAmount,
  isValidFxRate,
  type BaseCurrencyFxRatesBag,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";

function resolveCashCurrency(
  holding: StoredPortfolioHolding,
): CashBenchmarkCurrency | null {
  const candidates = [
    holding.symbol,
    holding.currency,
    holding.name?.split(/\s+/)[0],
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate ?? "")
      .trim()
      .toUpperCase();
    if (isSupportedCashCurrency(normalized)) {
      return normalized;
    }
  }

  return null;
}

function convertAmountToEur(
  amount: number,
  currency: CashBenchmarkCurrency,
  rates: BaseCurrencyFxRatesBag,
): number | null {
  if (currency === "EUR") {
    return amount;
  }

  const foreignToEur = currency === "USD" ? rates.USD_TO_EUR : rates.GBP_TO_EUR;
  if (!isValidFxRate(foreignToEur)) {
    return null;
  }

  return amount * foreignToEur;
}

export function calculateCashImpact(input: {
  holdings: StoredPortfolioHolding[];
  benchmarks: CashBenchmarksSnapshot;
  baseCurrency: PortfolioBaseCurrency;
  fxRates: BaseCurrencyFxRatesBag;
  fxStatus?: BaseCurrencyFxSnapshot["status"];
  fxUpdatedAt?: string | null;
  portfolioCashWeightPercent?: number | null;
}): CashIntelligenceSnapshot {
  const fxSnapshot = buildBaseCurrencyFxSnapshot({
    baseCurrency: input.baseCurrency,
    rates: input.fxRates,
    updatedAt: input.fxUpdatedAt ?? null,
    status:
      input.baseCurrency === "EUR"
        ? undefined
        : input.fxStatus === "stale" ||
            input.fxStatus === "cached" ||
            input.fxStatus === "current"
          ? input.fxStatus
          : "current",
  });

  const cashHoldings = input.holdings.filter(
    (holding) => holding.assetType === "cash",
  );

  const byCurrencyMap = new Map<CashBenchmarkCurrency, { amount: number }>();

  for (const holding of cashHoldings) {
    const currency = resolveCashCurrency(holding);
    if (!currency) continue;

    const value = getHoldingMarketValue(holding);
    if (value == null || !Number.isFinite(value) || value <= 0) {
      // Never invent cash — skip unvalued rows.
      continue;
    }

    const current = byCurrencyMap.get(currency) ?? { amount: 0 };
    current.amount += value;
    byCurrencyMap.set(currency, current);
  }

  const benchmarkByCurrency = new Map(
    input.benchmarks.currencies.map((row) => [row.currency, row]),
  );

  const byCurrency: CashCurrencyImpact[] = [];
  let totalCashInEur = 0;
  let totalAnnualInEur = 0;
  let hasEurConversion = true;

  for (const currency of ["EUR", "USD", "GBP"] as CashBenchmarkCurrency[]) {
    const amount = byCurrencyMap.get(currency)?.amount ?? 0;
    if (amount <= 0) continue;

    const benchmark = benchmarkByCurrency.get(currency) ?? null;
    const rate = benchmark?.cashBenchmarkPercent ?? null;
    const indicativeAnnual =
      rate != null && Number.isFinite(rate) ? amount * (rate / 100) : null;
    const amountInEur = convertAmountToEur(amount, currency, input.fxRates);
    const annualInEur =
      indicativeAnnual == null
        ? null
        : convertAmountToEur(indicativeAnnual, currency, input.fxRates);
    const amountInBase =
      amountInEur == null
        ? null
        : convertCanonicalEurAmount(amountInEur, fxSnapshot);
    const annualInBase =
      annualInEur == null
        ? null
        : convertCanonicalEurAmount(annualInEur, fxSnapshot);

    if (amountInEur == null) {
      hasEurConversion = false;
    } else {
      totalCashInEur += amountInEur;
    }
    if (annualInEur != null) {
      totalAnnualInEur += annualInEur;
    }

    byCurrency.push({
      currency,
      cashAmount: amount,
      cashWeightPercent: null,
      benchmarkPercent: rate,
      benchmarkLabel: benchmark?.cashBenchmarkLabel ?? null,
      indicativeAnnualYield: indicativeAnnual,
      indicativeMonthlyYield:
        indicativeAnnual != null ? indicativeAnnual / 12 : null,
      amountInBase,
      annualYieldInBase: annualInBase,
      amountInEur,
      annualYieldInEur: annualInEur,
    });
  }

  const hasCash = byCurrency.length > 0;
  const baseCurrencyBenchmark: CurrencyCashBenchmark | null =
    benchmarkByCurrency.get(input.baseCurrency as CashBenchmarkCurrency) ??
    benchmarkByCurrency.get("EUR") ??
    null;

  return {
    benchmarks: input.benchmarks,
    baseCurrency: input.baseCurrency,
    hasCash,
    totalCashAmount: hasCash && hasEurConversion ? totalCashInEur : null,
    totalCashInEur: hasCash && hasEurConversion ? totalCashInEur : null,
    totalCashInBase:
      hasCash && hasEurConversion
        ? convertCanonicalEurAmount(totalCashInEur, fxSnapshot)
        : null,
    totalIndicativeAnnualYieldInEur:
      hasCash && hasEurConversion ? totalAnnualInEur : null,
    totalIndicativeAnnualYieldInBase:
      hasCash && hasEurConversion
        ? convertCanonicalEurAmount(totalAnnualInEur, fxSnapshot)
        : null,
    portfolioCashWeightPercent: hasCash
      ? (input.portfolioCashWeightPercent ?? null)
      : null,
    byCurrency,
    baseCurrencyBenchmark,
    disclaimer: CASH_INTELLIGENCE_DISCLAIMER,
    fxStatus:
      input.baseCurrency === "EUR"
        ? "identity"
        : fxSnapshot.status === "unavailable"
          ? "unavailable"
          : fxSnapshot.status,
  };
}
