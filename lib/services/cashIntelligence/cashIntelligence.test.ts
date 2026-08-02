import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  classifyCashYieldEnvironment,
  CASH_BENCHMARK_LABELS,
  CASH_INTELLIGENCE_DISCLAIMER,
  CASH_YIELD_ENVIRONMENT_THRESHOLDS,
  calculateCashImpact,
  selectCashBenchmarkForTests,
} from "@/lib/services/cashIntelligence";
import type {
  CashBenchmarksSnapshot,
  CashRatePoint,
} from "@/lib/services/cashIntelligence/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function rate(ratePercent: number, seriesId: string): CashRatePoint {
  return {
    ratePercent,
    effectiveDate: "2026-07-31",
    sourceName: "Test source",
    sourceUrl: "https://example.com",
    seriesId,
  };
}

function emptyBenchmarks(
  overrides: Partial<CashBenchmarksSnapshot> = {},
): CashBenchmarksSnapshot {
  return {
    currencies: [
      selectCashBenchmarkForTests("EUR", {
        overnight: rate(2.1, "ESTR"),
        policy: rate(2.0, "DFR"),
        errors: [],
      }),
      selectCashBenchmarkForTests("USD", {
        overnight: rate(4.3, "SOFR"),
        policy: rate(4.33, "EFFR"),
        errors: [],
      }),
      selectCashBenchmarkForTests("GBP", {
        overnight: rate(3.9, "SONIA"),
        policy: rate(3.75, "IUDBEDR"),
        errors: [],
      }),
    ],
    fetchedAt: "2026-08-02T06:00:00.000Z",
    cacheExpiresAt: "2026-08-02T14:00:00.000Z",
    isStale: false,
    providerErrors: [],
    ...overrides,
  };
}

function cashHolding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol">,
): StoredPortfolioHolding {
  return {
    name: `${overrides.symbol} Cash`,
    quantity: 10_000,
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    assetType: "cash",
    ...overrides,
  };
}

describe("cash benchmark selection", () => {
  it("prefers EUR €STR overnight and keeps Deposit Facility as policy context", () => {
    const row = selectCashBenchmarkForTests("EUR", {
      overnight: rate(2.15, "ESTR"),
      policy: rate(2.0, "DFR"),
      errors: [],
    });

    expect(row.cashBenchmarkPercent).toBe(2.15);
    expect(row.cashBenchmarkLabel).toBe(
      CASH_BENCHMARK_LABELS.EUR.overnightPreferred,
    );
    expect(row.overnightIsFallback).toBe(false);
    expect(row.policy?.ratePercent).toBe(2.0);
    expect(row.environment).toBe("Moderate");
  });

  it("falls back USD SOFR → EFFR and GBP SONIA → Bank Rate", () => {
    const usd = selectCashBenchmarkForTests("USD", {
      overnight: null,
      policy: rate(4.4, "EFFR"),
      errors: [],
    });
    expect(usd.cashBenchmarkPercent).toBe(4.4);
    expect(usd.overnightIsFallback).toBe(true);
    expect(usd.cashBenchmarkLabel).toBe("EFFR");
    expect(usd.environment).toBe("Higher");

    const gbp = selectCashBenchmarkForTests("GBP", {
      overnight: null,
      policy: rate(3.75, "IUDBEDR"),
      errors: [],
    });
    expect(gbp.cashBenchmarkPercent).toBe(3.75);
    expect(gbp.overnightIsFallback).toBe(true);
    expect(gbp.cashBenchmarkLabel).toBe("Bank Rate");
  });

  it("classifies Low / Moderate / Higher environments from thresholds", () => {
    expect(classifyCashYieldEnvironment(1.5)).toBe("Low");
    expect(
      classifyCashYieldEnvironment(
        CASH_YIELD_ENVIRONMENT_THRESHOLDS.moderateMinPercent,
      ),
    ).toBe("Moderate");
    expect(
      classifyCashYieldEnvironment(
        CASH_YIELD_ENVIRONMENT_THRESHOLDS.higherMinPercent,
      ),
    ).toBe("Higher");
    expect(classifyCashYieldEnvironment(null)).toBeNull();
  });
});

describe("calculateCashImpact", () => {
  it("does not invent cash when none is recorded", () => {
    const snapshot = calculateCashImpact({
      holdings: [
        {
          id: "eq",
          symbol: "ASML",
          name: "ASML",
          quantity: 1,
          purchasePrice: 100,
          currentPrice: 110,
          currency: "EUR",
          assetType: "investment",
        },
      ],
      benchmarks: emptyBenchmarks(),
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: 0.9, GBP_TO_EUR: 1.15 },
    });

    expect(snapshot.hasCash).toBe(false);
    expect(snapshot.totalCashAmount).toBeNull();
    expect(snapshot.totalIndicativeAnnualYieldInEur).toBeNull();
    expect(snapshot.byCurrency).toHaveLength(0);
    expect(snapshot.disclaimer).toBe(CASH_INTELLIGENCE_DISCLAIMER);
  });

  it("calculates indicative annual yield for one cash currency", () => {
    const snapshot = calculateCashImpact({
      holdings: [cashHolding({ id: "c1", symbol: "EUR", quantity: 20_000 })],
      benchmarks: emptyBenchmarks(),
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: 0.9, GBP_TO_EUR: 1.15 },
      portfolioCashWeightPercent: 25,
    });

    expect(snapshot.hasCash).toBe(true);
    expect(snapshot.byCurrency).toHaveLength(1);
    expect(snapshot.byCurrency[0]?.indicativeAnnualYield).toBeCloseTo(420, 6);
    expect(snapshot.totalIndicativeAnnualYieldInEur).toBeCloseTo(420, 6);
    expect(snapshot.portfolioCashWeightPercent).toBe(25);
  });

  it("handles multi-currency cash with FX conversion to EUR", () => {
    const snapshot = calculateCashImpact({
      holdings: [
        cashHolding({ id: "eur", symbol: "EUR", quantity: 10_000 }),
        cashHolding({ id: "usd", symbol: "USD", quantity: 10_000 }),
      ],
      benchmarks: emptyBenchmarks(),
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: 0.9, GBP_TO_EUR: null },
    });

    expect(snapshot.byCurrency).toHaveLength(2);
    expect(snapshot.totalCashInEur).toBeCloseTo(10_000 + 9_000, 6);
    const usd = snapshot.byCurrency.find((row) => row.currency === "USD");
    expect(usd?.indicativeAnnualYield).toBeCloseTo(430, 6);
    expect(usd?.amountInEur).toBeCloseTo(9_000, 6);
  });

  it("returns null yield conversion when FX is missing", () => {
    const snapshot = calculateCashImpact({
      holdings: [cashHolding({ id: "usd", symbol: "USD", quantity: 5_000 })],
      benchmarks: emptyBenchmarks(),
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null },
    });

    expect(snapshot.hasCash).toBe(true);
    expect(snapshot.byCurrency[0]?.amountInEur).toBeNull();
    expect(snapshot.totalCashInEur).toBeNull();
  });
});

describe("cash intelligence surface constraints", () => {
  it("includes the required disclaimer and no bank/broker fields", () => {
    const section = readFileSync(
      path.resolve(
        process.cwd(),
        "components/analysis/CashIntelligenceSection.tsx",
      ),
      "utf8",
    );
    const card = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardCashIntelligenceCard.tsx",
      ),
      "utf8",
    );
    const types = readFileSync(
      path.resolve(process.cwd(), "lib/services/cashIntelligence/types.ts"),
      "utf8",
    );

    expect(types).toContain(CASH_INTELLIGENCE_DISCLAIMER);
    expect(section).toContain("disclaimer");
    expect(card).toContain("disclaimer");
    expect(section).not.toMatch(/bankName|broker|savingsAccount|providerName/i);
    expect(card).not.toMatch(/bankName|broker|savingsAccount/i);
    expect(section).not.toMatch(/\b\d\.\d{2}%\b/);
  });
});
