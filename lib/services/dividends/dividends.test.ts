import { describe, expect, it } from "vitest";

import {
  buildDividendInsight,
  buildDividendObservations,
  buildPortfolioDividendSnapshot,
  computePassiveIncomeProgress,
  scaleDividendQuoteForQuantity,
} from "@/lib/services/dividends";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    symbol: overrides.symbol,
    name: overrides.name,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
  };
}

function quote(overrides: Partial<DividendApiQuote> & Pick<DividendApiQuote, "symbol">): DividendApiQuote {
  return {
    providerSymbol: `${overrides.symbol}.XETRA`,
    paysDividends: true,
    dividendYield: 2.5,
    forwardAnnualDividendRate: 3,
    estimatedAnnualDividendEur: 30,
    estimatedNextPaymentEur: 7.5,
    nextExDate: "2026-08-01",
    nextPaymentDate: "2026-08-15",
    frequency: "quarterly",
    currency: "EUR",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("dividend intelligence", () => {
  it("scales per-share dividend quotes by holding quantity", () => {
    const scaled = scaleDividendQuoteForQuantity(
      quote({ symbol: "VWCE", estimatedAnnualDividendEur: 10, estimatedNextPaymentEur: 2.5 }),
      5,
    );

    expect(scaled.estimatedAnnualDividendEur).toBe(50);
    expect(scaled.estimatedNextPaymentEur).toBe(12.5);
  });

  it("builds portfolio dividend snapshot totals", () => {
    const holdings = [
      holding({ symbol: "VWCE", name: "Vanguard All-World", quantity: 10, currentPrice: 100, providerSymbol: "VWCE.XETRA" }),
      holding({ symbol: "ASML", name: "ASML", quantity: 2, currentPrice: 900, providerSymbol: "ASML.AS" }),
    ];

    const snapshot = buildPortfolioDividendSnapshot(holdings, [
      quote({ symbol: "VWCE", estimatedAnnualDividendEur: 12 }),
      quote({ symbol: "ASML", estimatedAnnualDividendEur: 15, dividendYield: 1.2 }),
    ]);

    expect(snapshot.estimatedAnnualIncomeEur).toBe(150);
    expect(snapshot.payingHoldingsCount).toBe(2);
    expect(snapshot.hasDividendData).toBe(true);
    expect(snapshot.largestContributor?.symbol).toBe("VWCE");
  });

  it("generates concentration insight when income is concentrated", () => {
    const insight = buildDividendInsight({
      estimatedAnnualIncomeEur: 1000,
      payingHoldingsCount: 2,
      portfolioYieldPercent: 3,
      concentrationSharePercent: 62,
      incomeDiversificationLabel: "concentrated",
      largestContributor: {
        symbol: "VWCE",
        name: "Vanguard All-World",
        incomeEur: 620,
        sharePercent: 62,
      },
      highestYield: { symbol: "VWCE", name: "Vanguard All-World", yieldPercent: 2.1 },
    });

    expect(insight).toContain("62%");
    expect(insight).toContain("VWCE");
  });

  it("notes well diversified income", () => {
    const observations = buildDividendObservations({
      estimatedAnnualIncomeEur: 500,
      payingHoldingsCount: 4,
      portfolioYieldPercent: 2,
      concentrationSharePercent: 22,
      incomeDiversificationLabel: "well_diversified",
      largestContributor: {
        symbol: "VWCE",
        name: "Vanguard All-World",
        incomeEur: 110,
        sharePercent: 22,
      },
      highestYield: null,
    });

    expect(observations.some((item) => item.includes("well diversified"))).toBe(true);
  });

  it("computes passive income goal progress", () => {
    expect(computePassiveIncomeProgress(1200, 2400)).toBe(50);
    expect(computePassiveIncomeProgress(1200, null)).toBe(0);
  });
});
