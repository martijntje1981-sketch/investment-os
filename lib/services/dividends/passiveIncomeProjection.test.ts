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

  it("excludes user-confirmed non_distributing holdings with a distinct reason", () => {
    const nonDist = holding({
      symbol: "SYN-ND",
      name: "Synthetic Non Dist",
      providerSymbol: "SYNND.XETRA",
      distributionPolicyUserOverride: "non_distributing",
    });
    const dividendQuote = quote({
      symbol: "SYN-ND",
      providerSymbol: "SYNND.XETRA",
      estimatedAnnualDividendEur: 50,
    });

    const projection = buildPassiveIncomeProjection([nonDist], [dividendQuote]);
    expect(projection.holdingRecords[0]?.estimateStatus).toBe(
      "ineligible_non_distributing",
    );
    expect(projection.holdingRecords[0]?.distributionPolicy).toBe("non_distributing");
    expect(projection.holdingRecords[0]?.distributionPolicy).not.toBe("accumulating");
    expect(projection.holdingRecords[0]?.explanation).toBe(
      "Excluded — no current cash distributions.",
    );
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("excludes spot crypto without creating staking income", () => {
    const projection = buildPassiveIncomeProjection(
      [
        holding({
          symbol: "ETH",
          name: "Ethereum",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "ETH-USD.CC",
        }),
        holding({
          symbol: "SOL",
          name: "Solana",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "SOL-USD.CC",
        }),
      ],
      [],
    );

    expect(projection.holdingRecords).toHaveLength(2);
    expect(
      projection.holdingRecords.every(
        (record) => record.estimateStatus === "not_applicable",
      ),
    ).toBe(true);
    expect(
      projection.holdingRecords.every((record) =>
        record.explanation.includes("staking rewards are not included"),
      ),
    ).toBe(true);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("keeps STRC user-confirmed accumulating excluded as accumulating", () => {
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

describe("passive income user estimates (phase 1B)", () => {
  function eligibleWithoutProvider(overrides: Partial<StoredPortfolioHolding> = {}) {
    return holding({
      symbol: "CUSTOM",
      name: "Custom Fund Dist",
      providerSymbol: "CUSTOM.XETRA",
      distributionPolicyUserOverride: "distributing",
      quantity: 10,
      currentPrice: 200,
      purchasePrice: 50,
      ...overrides,
    });
  }

  function emptyQuote(symbol = "CUSTOM"): DividendApiQuote {
    return quote({
      symbol,
      providerSymbol: `${symbol}.XETRA`,
      paysDividends: false,
      estimatedAnnualDividendEur: null,
      dividendYield: null,
      forwardAnnualDividendRate: null,
    });
  }

  it("uses 4.5% yield against current market value, never purchase value", () => {
    const dist = eligibleWithoutProvider({
      quantity: 10,
      currentPrice: 200,
      purchasePrice: 50,
      passiveIncomeUserEstimate: {
        mode: "annual_yield",
        annualYieldPercent: 4.5,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    const projection = buildPassiveIncomeProjection([dist], [emptyQuote()]);
    const record = projection.holdingRecords[0]!;

    // market value = 10 * 200 = 2000; 4.5% = 90. Purchase capital would be 500.
    expect(record.estimateStatus).toBe("user_estimated");
    expect(record.estimateSource).toBe("user_annual_yield");
    expect(record.estimatedAnnualCashDistributionEur).toBe(90);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(90);
    expect(projection.includesUserEstimates).toBe(true);
    expect(dist.purchasePrice).toBe(50);
    expect(dist.quantity).toBe(10);
  });

  it("applies annual cash amount without requiring current valuation", () => {
    const dist = eligibleWithoutProvider({
      currentPrice: 0,
      previousClose: undefined,
      passiveIncomeUserEstimate: {
        mode: "annual_cash_amount",
        annualCashAmountEur: 480,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    const projection = buildPassiveIncomeProjection([dist], [emptyQuote()]);
    const record = projection.holdingRecords[0]!;

    expect(record.estimateStatus).toBe("user_estimated");
    expect(record.estimateSource).toBe("user_annual_cash_amount");
    expect(record.estimatedAnnualCashDistributionEur).toBe(480);
  });

  it("marks yield unavailable when market value is missing", () => {
    const dist = eligibleWithoutProvider({
      currentPrice: 0,
      previousClose: undefined,
      passiveIncomeUserEstimate: {
        mode: "annual_yield",
        annualYieldPercent: 4.5,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    const projection = buildPassiveIncomeProjection([dist], [emptyQuote()]);
    const record = projection.holdingRecords[0]!;

    expect(record.estimateStatus).toBe("market_value_unavailable");
    expect(record.estimatedAnnualCashDistributionEur).toBeNull();
    expect(projection.hasUsableEstimate).toBe(false);
  });

  it("gives provider data priority and never adds provider plus user estimates", () => {
    const dist = eligibleWithoutProvider({
      passiveIncomeUserEstimate: {
        mode: "annual_cash_amount",
        annualCashAmountEur: 999,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });
    // Quote amounts are per-unit; lookup scales by quantity (10).
    const dividendQuote = quote({
      symbol: "CUSTOM",
      providerSymbol: "CUSTOM.XETRA",
      estimatedAnnualDividendEur: 12,
    });

    const projection = buildPassiveIncomeProjection([dist], [dividendQuote]);
    const record = projection.holdingRecords[0]!;

    expect(record.estimateSource).toBe("provider");
    expect(record.estimateStatus).toBe("estimated");
    expect(record.estimatedAnnualCashDistributionEur).toBe(120);
    expect(record.storedUserEstimate?.mode).toBe("annual_cash_amount");
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(120);
    expect(projection.includesUserEstimates).toBe(false);
  });

  it("falls back to the stored user estimate when provider data disappears", () => {
    const dist = eligibleWithoutProvider({
      passiveIncomeUserEstimate: {
        mode: "annual_cash_amount",
        annualCashAmountEur: 300,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    const withProvider = buildPassiveIncomeProjection(
      [dist],
      [quote({ symbol: "CUSTOM", providerSymbol: "CUSTOM.XETRA", estimatedAnnualDividendEur: 8 })],
    );
    expect(withProvider.holdingRecords[0]?.estimateSource).toBe("provider");
    expect(withProvider.eligibleEstimatedAnnualCashDistributionEur).toBe(80);

    const withoutProvider = buildPassiveIncomeProjection([dist], [emptyQuote()]);
    expect(withoutProvider.holdingRecords[0]?.estimateSource).toBe(
      "user_annual_cash_amount",
    );
    expect(withoutProvider.eligibleEstimatedAnnualCashDistributionEur).toBe(300);
  });

  it("retains but excludes estimates when the holding becomes ineligible", () => {
    const estimate = {
      mode: "annual_cash_amount" as const,
      annualCashAmountEur: 250,
      updatedAt: "2026-07-26T09:00:00.000Z",
    };
    const accumulating = holding({
      symbol: "CUSTOM",
      name: "Custom Fund Acc",
      providerSymbol: "CUSTOM.XETRA",
      distributionPolicyUserOverride: "accumulating",
      passiveIncomeUserEstimate: estimate,
    });

    const projection = buildPassiveIncomeProjection(
      [accumulating],
      [
        quote({
          symbol: "CUSTOM",
          providerSymbol: "CUSTOM.XETRA",
          estimatedAnnualDividendEur: 999,
        }),
      ],
    );
    const record = projection.holdingRecords[0]!;

    expect(record.eligibility).toBe("ineligible");
    expect(record.estimatedAnnualCashDistributionEur).toBeNull();
    expect(record.storedUserEstimate).toEqual(estimate);
    expect(record.warnings.some((warning) => /retained/i.test(warning))).toBe(true);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("reuses a retained estimate when the holding becomes eligible again", () => {
    const estimate = {
      mode: "annual_yield" as const,
      annualYieldPercent: 5,
      updatedAt: "2026-07-26T09:00:00.000Z",
    };
    const eligible = eligibleWithoutProvider({
      quantity: 10,
      currentPrice: 100,
      passiveIncomeUserEstimate: estimate,
    });

    const projection = buildPassiveIncomeProjection([eligible], [emptyQuote()]);
    expect(projection.holdingRecords[0]?.estimatedAnnualCashDistributionEur).toBe(50);
  });

  it("excludes spot crypto and never invents staking income", () => {
    const btc = holding({
      symbol: "BTC",
      name: "Bitcoin",
      assetType: "crypto",
      quantity: 1,
      currentPrice: 50_000,
      passiveIncomeUserEstimate: {
        mode: "annual_yield",
        annualYieldPercent: 5,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    const projection = buildPassiveIncomeProjection([btc], []);
    const record = projection.holdingRecords[0]!;

    expect(record.eligibility).toBe("ineligible");
    expect(record.estimateStatus).toBe("not_applicable");
    expect(record.acceptsUserEstimate).toBe(false);
    expect(record.estimatedAnnualCashDistributionEur).toBeNull();
    expect(record.explanation).toMatch(/staking/i);
    expect(projection.eligibleEstimatedAnnualCashDistributionEur).toBe(0);
  });

  it("shows Unavailable rather than a verified zero when no estimate exists", () => {
    const dist = eligibleWithoutProvider();
    const projection = buildPassiveIncomeProjection([dist], [emptyQuote()]);

    expect(projection.holdingRecords[0]?.estimateStatus).toBe("insufficient_data");
    expect(projection.holdingRecords[0]?.estimatedAnnualCashDistributionEur).toBeNull();
    expect(projection.hasUsableEstimate).toBe(false);
    expect(projection.holdingRecords[0]?.acceptsUserEstimate).toBe(true);

    const progress = buildPassiveIncomeGoalProgressState({
      projection,
      passiveIncomeTargetEur: 2_400,
    });
    expect(progress.status).toBe("estimate-unavailable");
  });

  it("keeps Dashboard and Goals totals identical via the same snapshot", () => {
    const dist = eligibleWithoutProvider({
      passiveIncomeUserEstimate: {
        mode: "annual_cash_amount",
        annualCashAmountEur: 360,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });
    const snapshot = buildPortfolioDividendSnapshot([dist], [emptyQuote()]);

    expect(snapshot.estimatedAnnualIncomeEur).toBe(360);
    expect(snapshot.passiveIncome.eligibleEstimatedAnnualCashDistributionEur).toBe(360);
    expect(snapshot.passiveIncome.includesUserEstimates).toBe(true);
  });

  it("does not mutate cash, valuation, quantity or purchase data when estimating", () => {
    const cash = holding({
      id: "cash-1",
      symbol: "EUR",
      name: "Euro cash",
      assetType: "cash",
      quantity: 5_000,
      purchasePrice: 1,
      currentPrice: 1,
    });
    const dist = eligibleWithoutProvider({
      id: "inv-1",
      quantity: 7,
      purchasePrice: 88,
      currentPrice: 120,
      passiveIncomeUserEstimate: {
        mode: "annual_yield",
        annualYieldPercent: 3,
        updatedAt: "2026-07-26T09:00:00.000Z",
      },
    });

    buildPassiveIncomeProjection([cash, dist], [emptyQuote()]);

    expect(cash.quantity).toBe(5_000);
    expect(cash.currentPrice).toBe(1);
    expect(dist.quantity).toBe(7);
    expect(dist.purchasePrice).toBe(88);
    expect(dist.currentPrice).toBe(120);
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
      includesUserEstimates: false,
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
        includesUserEstimates: false,
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
