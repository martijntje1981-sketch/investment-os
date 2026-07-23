import { describe, expect, it } from "vitest";

import {
  buildAnalystInsight,
  buildAnalystObservations,
} from "@/lib/services/analyst/analystInsights";
import {
  buildPortfolioAnalystSnapshot,
  formatUpsideLabel,
} from "@/lib/services/analyst/analystCalculator";
import {
  calculateImpliedUpsidePercent,
  convertAnalystTargetToEur,
  coveredInvestedValue,
  portfolioInvestedValue,
  weightedConsensusRating,
} from "@/lib/services/analyst/analystCalculations";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import {
  consensusFromCounts,
  consensusFromProviderRating,
  normalizeRatingCounts,
  scoreToRating,
} from "@/lib/services/analyst/normalizeRating";
import type { AnalystApiQuote } from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { shouldShowAnalystDashboardCard } from "@/lib/services/news/analystNews";

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

function quote(
  overrides: Partial<AnalystApiQuote> & Pick<AnalystApiQuote, "symbol">,
): AnalystApiQuote {
  return {
    providerSymbol: `${overrides.symbol}.US`,
    coverageState: "live",
    coverageKind: "company",
    dataConfidence: "complete",
    consensusRating: "Buy",
    ratingCounts: {
      strongBuy: 2,
      buy: 5,
      hold: 1,
      sell: 0,
      strongSell: 0,
    },
    analystCount: 8,
    averagePriceTarget: 120,
    medianPriceTarget: null,
    highPriceTarget: null,
    lowPriceTarget: null,
    targetCurrency: "USD",
    source: "EODHD Fundamentals",
    updatedAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("analyst intelligence", () => {
  it("normalizes provider rating counts into consensus labels", () => {
    const counts = normalizeRatingCounts({
      StrongBuy: 2,
      Buy: 4,
      Hold: 1,
      Sell: 0,
      StrongSell: 0,
    });

    expect(consensusFromCounts(counts)).toBe("Buy");
    expect(scoreToRating(4.6)).toBe("Strong Buy");
    expect(consensusFromProviderRating(null, counts)).toBe("Buy");
  });

  it("converts non-EUR targets before upside calculations", () => {
    expect(convertAnalystTargetToEur(100, "USD", 0.9)).toBe(90);
    expect(convertAnalystTargetToEur(100, "EUR", null)).toBe(100);
    expect(convertAnalystTargetToEur(100, "USD", null)).toBeNull();
  });

  it("calculates implied upside from current price and average target", () => {
    expect(calculateImpliedUpsidePercent(100, 115)).toBeCloseTo(15);
    expect(calculateImpliedUpsidePercent(100, 85)).toBeCloseTo(-15);
    expect(calculateImpliedUpsidePercent(null, 120)).toBeNull();
    expect(calculateImpliedUpsidePercent(0, 120)).toBeNull();
  });

  it("builds weighted portfolio consensus and coverage metrics", () => {
    const holdings = [
      holding({
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 100,
        providerSymbol: "AAPL.US",
      }),
      holding({
        symbol: "VWCE",
        name: "All-World ETF",
        quantity: 20,
        currentPrice: 100,
        providerSymbol: "VWCE.XETRA",
      }),
    ];

    const quotes = [
      quote({ symbol: "AAPL", consensusRating: "Strong Buy", averagePriceTarget: 130 }),
      quote({
        symbol: "VWCE",
        consensusRating: "No Coverage",
        analystCount: 0,
        coverageState: "no_coverage",
        dataConfidence: "none",
        averagePriceTarget: null,
        ratingCounts: {
          strongBuy: 0,
          buy: 0,
          hold: 0,
          sell: 0,
          strongSell: 0,
        },
      }),
    ];

    const snapshot = buildPortfolioAnalystSnapshot({
      holdings,
      quotes,
    });

    expect(snapshot.coveredHoldingsCount).toBe(1);
    expect(snapshot.coveragePercentOfInvested).toBeCloseTo(33.333, 1);
    expect(snapshot.weightedConsensus).toBe("Strong Buy");
    expect(snapshot.hasMeaningfulCoverage).toBe(true);
    expect(snapshot.mostBullish?.symbol).toBe("AAPL");
    expect(snapshot.weightedAveragePriceTarget).toBeCloseTo(130, 0);
    expect(snapshot.totalAnalystRatingsCount).toBe(8);
  });

  it("computes weighted consensus from position weights", () => {
    const consensus = weightedConsensusRating([
      { rating: "Buy", weight: 1000 },
      { rating: "Hold", weight: 1000 },
    ]);

    expect(consensus).toBe("Buy");
  });

  it("explains missing analyst coverage for unsupported asset types", () => {
    const kind = inferAnalystCoverageKind({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      assetType: "investment",
    });

    expect(kind).toBe("fund_or_etc");

    const snapshot = buildPortfolioAnalystSnapshot({
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          currentPrice: 100,
        }),
      ],
      quotes: [
        quote({
          symbol: "VWCE",
          coverageKind: "fund_or_etc",
          coverageState: "no_coverage",
          consensusRating: "No Coverage",
          analystCount: 0,
          averagePriceTarget: null,
          dataConfidence: "none",
        }),
      ],
      coverageState: "no_coverage",
    });

    expect(snapshot.hasMeaningfulCoverage).toBe(false);
    expect(snapshot.observations[0]).toContain("holdings currently have traditional analyst coverage");
  });

  it("handles cached and provider unavailable states", () => {
    const snapshot = buildPortfolioAnalystSnapshot({
      holdings: [holding({ symbol: "AAPL", name: "Apple", providerSymbol: "AAPL.US" })],
      quotes: [
        quote({
          symbol: "AAPL",
          coverageState: "cached",
        }),
      ],
      coverageState: "cached",
    });

    expect(snapshot.coverageState).toBe("cached");
    expect(formatUpsideLabel(snapshot.averageImpliedUpsidePercent)).toContain("+");
  });

  it("does not show dashboard card without meaningful coverage", () => {
    expect(
      shouldShowAnalystDashboardCard({
        hasMeaningfulCoverage: false,
      }),
    ).toBe(false);
    expect(
      shouldShowAnalystDashboardCard({
        hasMeaningfulCoverage: true,
      }),
    ).toBe(true);
  });

  it("generates deterministic insight copy", () => {
    const insight = buildAnalystInsight({
      hasMeaningfulCoverage: true,
      coveredHoldingsCount: 3,
      totalInvestmentsCount: 5,
      coveragePercentOfInvested: 42,
      weightedConsensus: "Buy",
      weightedImpliedUpsidePercent: 11,
      mostBullish: null,
      mostCautious: null,
      recentActions: [],
      coverageState: "live",
    });

    expect(insight).toContain("3 of your holdings");
    expect(insight).toContain("Buy");

    const observations = buildAnalystObservations({
      hasMeaningfulCoverage: true,
      coveredHoldingsCount: 2,
      totalInvestmentsCount: 4,
      coveragePercentOfInvested: 50,
      weightedConsensus: "Hold",
      weightedImpliedUpsidePercent: -4,
      mostBullish: null,
      mostCautious: null,
      recentActions: [],
      coverageState: "live",
    });

    expect(observations.some((entry) => entry.includes("downside"))).toBe(true);
  });

  it("uses provider-unavailable insight copy", () => {
    const insight = buildAnalystInsight({
      hasMeaningfulCoverage: false,
      coveredHoldingsCount: 0,
      totalInvestmentsCount: 3,
      coveragePercentOfInvested: 0,
      weightedConsensus: "No Coverage",
      weightedImpliedUpsidePercent: null,
      mostBullish: null,
      mostCautious: null,
      recentActions: [],
      coverageState: "provider_unavailable",
    });

    expect(insight).toContain("temporarily unavailable");
  });

  it("measures covered invested value against total invested value", () => {
    const holdings = [
      holding({ symbol: "AAPL", name: "Apple", quantity: 5, currentPrice: 100 }),
      holding({ symbol: "VWCE", name: "ETF", quantity: 5, currentPrice: 100 }),
    ];

    const invested = portfolioInvestedValue(holdings);
    const covered = coveredInvestedValue(holdings, [
      quote({ symbol: "AAPL" }),
      quote({
        symbol: "VWCE",
        consensusRating: "No Coverage",
        analystCount: 0,
        coverageState: "no_coverage",
        averagePriceTarget: null,
        dataConfidence: "none",
      }),
    ]);

    expect(invested).toBe(1000);
    expect(covered).toBe(500);
  });
});
