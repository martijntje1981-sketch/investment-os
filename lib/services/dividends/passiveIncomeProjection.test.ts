import { describe, expect, it } from "vitest";

import {
  buildPassiveIncomeGoalProgressState,
  buildPassiveIncomeProjection,
} from "@/lib/services/dividends/passiveIncomeProjection";
import { buildPortfolioDividendSnapshot } from "@/lib/services/dividends/dividendCalculator";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const SYNTHETIC_DIST_ISIN = "IE00TESTDIST01";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    ...overrides,
  };
}

function quote(
  overrides: Partial<DividendApiQuote> & Pick<DividendApiQuote, "symbol">,
): DividendApiQuote {
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
    verifiedCashDistributionEvent: null,
    providerUnavailable: false,
    ...overrides,
  };
}

function verifiedDistributingFund(
  symbol: string,
  name: string,
  annualEur: number,
): { holding: StoredPortfolioHolding; dividendQuote: DividendApiQuote } {
  const providerSymbol = `${symbol}.XETRA`;
  return {
    holding: holding({
      symbol,
      name,
      isin: SYNTHETIC_DIST_ISIN,
      providerSymbol,
      quantity: 10,
      currentPrice: 100,
    }),
    dividendQuote: quote({
      symbol,
      providerSymbol,
      estimatedAnnualDividendEur: annualEur / 10,
      verifiedCashDistributionEvent: {
        date: "2026-06-01",
        amount: 0.42,
        currency: "EUR",
      },
    }),
  };
}

describe("passive income projection", () => {
  it("includes verified distributing holdings with reliable income data", () => {
    const { holding: dist, dividendQuote } = verifiedDistributingFund(
      "SYN-DIST",
      "Synthetic Global Dist UCITS ETF",
      120,
    );

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    const record = projection.holdingRecords[0]!;

    expect(record.eligibility).toBe("eligible");
    expect(record.estimateStatus).toBe("estimated");
    expect(record.estimatedAnnualCashDistributionEur).toBe(120);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(120);
  });

  it("includes user-confirmed distributing holdings with income data and labels them user-confirmed", () => {
    const dist = holding({
      symbol: "CUSTOM",
      name: "Custom Fund Dist",
      providerSymbol: "CUSTOM.XETRA",
      distributionPolicyUserOverride: "distributing",
    });
    const dividendQuote = quote({
      symbol: "CUSTOM",
      providerSymbol: "CUSTOM.XETRA",
      estimatedAnnualDividendEur: 8,
    });

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    const record = projection.holdingRecords[0]!;

    expect(record.eligibility).toBe("eligible");
    expect(record.estimateStatus).toBe("estimated");
    expect(record.confidenceLabel).toBe("User confirmed");
    expect(record.explanation).toContain("user-confirmed");
  });

  it("keeps user-confirmed distributing holdings eligible without fabricating missing amounts", () => {
    const dist = holding({
      symbol: "CUSTOM",
      name: "Custom Fund Dist",
      providerSymbol: "CUSTOM.XETRA",
      distributionPolicyUserOverride: "distributing",
    });
    const dividendQuote = quote({
      symbol: "CUSTOM",
      providerSymbol: "CUSTOM.XETRA",
      paysDividends: false,
      estimatedAnnualDividendEur: null,
      dividendYield: null,
      forwardAnnualDividendRate: null,
    });

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    const record = projection.holdingRecords[0]!;

    expect(record.eligibility).toBe("eligible");
    expect(record.estimateStatus).toBe("insufficient_data");
    expect(record.estimatedAnnualCashDistributionEur).toBeNull();
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
    expect(projection.hasUsableEstimate).toBe(false);
  });

  it("excludes accumulating holdings", () => {
    const acc = holding({
      symbol: "VWCE",
      name: "Vanguard All-World",
      isin: "IE00BK5BQT80",
      providerSymbol: "VWCE.XETRA",
    });
    const dividendQuote = quote({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      estimatedAnnualDividendEur: 500,
    });

    const projection = buildPassiveIncomeProjection([acc], [dividendQuote]);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("ineligible_accumulating");
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("excludes STRC when user confirms accumulating", () => {
    const strc = holding({
      symbol: "STRC",
      name: "21Shares Strategy Yield ETP",
      providerSymbol: "STRC.AS",
      distributionPolicyUserOverride: "accumulating",
    });
    const dividendQuote = quote({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      estimatedAnnualDividendEur: 200,
    });

    const projection = buildPassiveIncomeProjection([strc], [dividendQuote]);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("ineligible_accumulating");
  });

  it("excludes unknown holdings", () => {
    const unknown = holding({
      symbol: "MYFUND",
      name: "Mystery Fund UCITS ETF",
      providerSymbol: "MYFUND.XETRA",
    });

    const projection = buildPassiveIncomeProjection(
      [unknown],
      [quote({ symbol: "MYFUND", providerSymbol: "MYFUND.XETRA" })],
    );
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("ineligible_unknown_policy");
  });

  it("excludes conflicted holdings", () => {
    const conflicted = holding({
      symbol: "VWCE",
      name: "Vanguard All-World",
      isin: "IE00BK5BQT80",
      providerSymbol: "VWCE.XETRA",
      distributionPolicyUserOverride: "distributing",
    });

    const projection = buildPassiveIncomeProjection(
      [conflicted],
      [quote({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", estimatedAnnualDividendEur: 100 })],
    );
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("ineligible_conflict");
  });

  it("marks cash and crypto as not applicable", () => {
    const projection = buildPassiveIncomeProjection(
      [
        holding({ symbol: "EUR", name: "Cash", assetType: "cash" }),
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          pairCurrency: "USD",
        }),
      ],
      [],
    );

    expect(projection.holdingRecords).toHaveLength(1);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("not_applicable");
  });

  it("rejects invalid, negative, and NaN dividend amounts", () => {
    const { holding: dist, dividendQuote } = verifiedDistributingFund(
      "SYN-DIST",
      "Synthetic Global Dist UCITS ETF",
      Number.NaN,
    );

    const projection = buildPassiveIncomeProjection(
      [dist],
      [{ ...dividendQuote, estimatedAnnualDividendEur: Number.NaN }],
    );
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("insufficient_data");
  });

  it("treats zero as distinct from unavailable", () => {
    const { holding: dist, dividendQuote } = verifiedDistributingFund(
      "SYN-DIST",
      "Synthetic Global Dist UCITS ETF",
      0,
    );

    const projection = buildPassiveIncomeProjection(
      [dist],
      [{ ...dividendQuote, estimatedAnnualDividendEur: 0 }],
    );
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("insufficient_data");
    expect(projection.hasUsableEstimate).toBe(false);
  });

  it("excludes amounts when quote currency is non-EUR without proven conversion", () => {
    const dist = holding({
      symbol: "USDSTOCK",
      name: "USD Stock",
      providerSymbol: "USDSTOCK.US",
      quantity: 10,
      distributionPolicyUserOverride: "distributing",
    });
    const dividendQuote = quote({
      symbol: "USDSTOCK",
      providerSymbol: "USDSTOCK.US",
      currency: "USD",
      forwardAnnualDividendRate: 3,
      // Even when the numeric field looks converted, non-EUR currency is excluded.
      estimatedAnnualDividendEur: 2.7,
    });

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("conversion_unavailable");
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("scales per-unit API quotes exactly once by holding quantity", () => {
    const dist = holding({
      id: "qty-scale",
      symbol: "SYN-DIST",
      name: "Synthetic Dist",
      isin: SYNTHETIC_DIST_ISIN,
      providerSymbol: "SYNDIST.XETRA",
      quantity: 10,
    });
    const perUnitQuote = quote({
      symbol: "SYN-DIST",
      providerSymbol: "SYNDIST.XETRA",
      estimatedAnnualDividendEur: 12,
      verifiedCashDistributionEvent: {
        date: "2026-06-01",
        amount: 0.42,
        currency: "EUR",
      },
    });

    const projection = buildPassiveIncomeProjection([dist], [perUnitQuote]);
    expect(projection.holdingRecords[0]?.estimatedAnnualCashDistributionEur).toBe(120);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(120);
    expect(projection.holdingRecords[0]?.estimatedAnnualCashDistributionEur).not.toBe(
      12 * 10 * 10,
    );
  });

  it("sums multiple eligible holdings correctly", () => {
    const first = verifiedDistributingFund("SYN-DIST", "Synthetic Dist A", 120);
    const second = holding({
      symbol: "ASML",
      name: "ASML Holding",
      providerSymbol: "ASML.AS",
      quantity: 2,
      currentPrice: 900,
    });
    const asmlQuote = quote({
      symbol: "ASML",
      providerSymbol: "ASML.AS",
      estimatedAnnualDividendEur: 7.5,
      verifiedCashDistributionEvent: {
        date: "2026-05-01",
        amount: 1.52,
        currency: "EUR",
      },
    });

    const projection = buildPassiveIncomeProjection(
      [first.holding, second],
      [first.dividendQuote, asmlQuote],
    );

    expect(projection.contributingHoldingsCount).toBe(2);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(135);
  });

  it("uses the same canonical result in Dashboard and Goals snapshots", () => {
    const first = verifiedDistributingFund("SYN-DIST", "Synthetic Dist A", 120);
    const acc = holding({
      symbol: "VWCE",
      name: "Vanguard All-World",
      isin: "IE00BK5BQT80",
      providerSymbol: "VWCE.XETRA",
    });

    const snapshot = buildPortfolioDividendSnapshot(
      [first.holding, acc],
      [first.dividendQuote, quote({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", estimatedAnnualDividendEur: 999 })],
    );

    expect(snapshot.estimatedAnnualIncomeEur).toBe(120);
    expect(snapshot.passiveIncome.eligibleEstimatedAnnualCashDistributionEur).toBe(120);
    expect(snapshot.passiveIncome.excludedHoldingsCount).toBe(1);
  });

  it("does not fabricate yield-based income when annual amount is missing despite yield data", () => {
    const dist = holding({
      symbol: "CUSTOM",
      name: "Custom Fund Dist",
      providerSymbol: "CUSTOM.XETRA",
      distributionPolicyUserOverride: "distributing",
      currentPrice: 0,
    });
    const dividendQuote = quote({
      symbol: "CUSTOM",
      providerSymbol: "CUSTOM.XETRA",
      dividendYield: 4.5,
      forwardAnnualDividendRate: null,
      estimatedAnnualDividendEur: null,
    });

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe("insufficient_data");
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("preserves holding ids, quantities, and purchase data in projection records only", () => {
    const dist = holding({
      id: "holding-123",
      symbol: "CUSTOM",
      name: "Custom Fund Dist",
      providerSymbol: "CUSTOM.XETRA",
      quantity: 42,
      purchasePrice: 55,
      distributionPolicyUserOverride: "distributing",
    });

    const projection = buildPassiveIncomeProjection(
      [dist],
      [quote({ symbol: "CUSTOM", providerSymbol: "CUSTOM.XETRA", estimatedAnnualDividendEur: 9 })],
    );

    expect(projection.holdingRecords[0]?.holdingId).toBe("holding-123");
    expect(dist.quantity).toBe(42);
    expect(dist.purchasePrice).toBe(55);
  });
});

describe("passive income goal progress", () => {
  function projection(total: number, contributing = 1): ReturnType<typeof buildPassiveIncomeProjection> {
    return {
      eligibleEstimatedAnnualCashDistributionEur: total,
      eligibleHoldingsCount: contributing,
      contributingHoldingsCount: contributing,
      excludedHoldingsCount: 0,
      awaitingDataHoldingsCount: 0,
      hasUsableEstimate: contributing > 0 && total > 0,
      holdingRecords: [],
      updatedAt: "2026-07-20T00:00:00.000Z",
    };
  }

  it("computes 0%, 50%, 100%, and above-target progress honestly", () => {
    expect(
      buildPassiveIncomeGoalProgressState({
        projection: projection(0, 0),
        passiveIncomeTargetEur: 2_400,
      }).status,
    ).toBe("no-eligible-holdings");

    const half = buildPassiveIncomeGoalProgressState({
      projection: projection(1_200),
      passiveIncomeTargetEur: 2_400,
    });
    expect(half.status).toBe("ready");
    expect(half.rawProgressPercent).toBe(50);
    expect(half.fillProgressPercent).toBe(50);

    const full = buildPassiveIncomeGoalProgressState({
      projection: projection(2_400),
      passiveIncomeTargetEur: 2_400,
    });
    expect(full.fillProgressPercent).toBe(100);

    const above = buildPassiveIncomeGoalProgressState({
      projection: projection(3_600),
      passiveIncomeTargetEur: 2_400,
    });
    expect(above.fillProgressPercent).toBe(100);
    expect(above.rawProgressPercent).toBe(150);
    expect(above.remainingAnnualEur).toBe(0);
  });

  it("handles missing, zero, negative, and malformed targets", () => {
    expect(
      buildPassiveIncomeGoalProgressState({
        projection: projection(1_000),
        passiveIncomeTargetEur: undefined,
      }).status,
    ).toBe("no-target");

    expect(
      buildPassiveIncomeGoalProgressState({
        projection: projection(1_000),
        passiveIncomeTargetEur: 0,
      }).status,
    ).toBe("no-target");

    expect(
      buildPassiveIncomeGoalProgressState({
        projection: projection(1_000),
        passiveIncomeTargetEur: -100,
      }).status,
    ).toBe("invalid-target");
  });

  it("returns unavailable estimate state instead of misleading verified zero", () => {
    const state = buildPassiveIncomeGoalProgressState({
      projection: {
        eligibleEstimatedAnnualCashDistributionEur: 0,
        eligibleHoldingsCount: 1,
        contributingHoldingsCount: 0,
        excludedHoldingsCount: 0,
        awaitingDataHoldingsCount: 1,
        hasUsableEstimate: false,
        holdingRecords: [],
        updatedAt: null,
      },
      passiveIncomeTargetEur: 2_400,
    });

    expect(state.status).toBe("estimate-unavailable");
    expect(state.displayProgressPercent).toBeNull();
  });

  it("labels monthly equivalent as derived from the annual estimate", () => {
    const state = buildPassiveIncomeGoalProgressState({
      projection: projection(1_200),
      passiveIncomeTargetEur: 2_400,
    });

    expect(state.estimatedMonthlyEquivalentEur).toBe(100);
  });
});
