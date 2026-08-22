import { describe, expect, it } from "vitest";

import {
  OBSERVATION_LARGEST_WEIGHT_THRESHOLD,
  buildPortfolioAnalysis,
  buildValuedPositions,
  calculateHerfindahlIndex,
  classifyConcentration,
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    symbol: overrides.symbol,
    name: overrides.name,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
  };
}

describe("portfolioAnalysis", () => {
  it("calculates allocation percentages that sum to 100", () => {
    const holdings = [
      holding({ symbol: "AAA", name: "AAA", quantity: 10, currentPrice: 100 }),
      holding({ symbol: "BBB", name: "BBB", quantity: 5, currentPrice: 100 }),
      holding({
        symbol: "EUR",
        name: "EUR Cash",
        assetType: "cash",
        quantity: 500,
        currentPrice: 1,
        purchasePrice: 1,
      }),
    ];

    const { valuedPositions, totalValue } = buildValuedPositions(holdings);
    const weightSum = valuedPositions.reduce(
      (sum, position) => sum + position.weightPercent,
      0,
    );

    expect(totalValue).toBe(2000);
    expect(weightSum).toBeCloseTo(100, 5);
  });

  it("includes estimated purchase-price valuations when live price is missing", () => {
    const holdings = [
      holding({ symbol: "AAA", name: "AAA", quantity: 10, currentPrice: 100 }),
      holding({ symbol: "BBB", name: "BBB", quantity: 5, currentPrice: 0, purchasePrice: 100 }),
    ];

    const analysis = buildPortfolioAnalysis(holdings);

    expect(analysis.totalValue).toBe(1500);
    expect(analysis.unvaluedHoldings).toHaveLength(0);
  });

  it("includes cash in allocation totals", () => {
    const holdings = [
      holding({ symbol: "AAA", name: "AAA", quantity: 1, currentPrice: 100 }),
      holding({
        symbol: "EUR",
        name: "EUR Cash",
        assetType: "cash",
        quantity: 100,
        currentPrice: 1,
        purchasePrice: 1,
      }),
    ];

    const analysis = buildPortfolioAnalysis(holdings);

    expect(analysis.cashWeightPercent).toBeCloseTo(50, 5);
    expect(analysis.assetTypeBreakdown).toHaveLength(2);
  });

  it("classifies concentration using HHI thresholds", () => {
    expect(classifyConcentration(0.1)).toBe("broadly_spread");
    expect(classifyConcentration(0.2)).toBe("moderately_concentrated");
    expect(classifyConcentration(0.4)).toBe("highly_concentrated");
  });

  it("computes transparent HHI values", () => {
    const hhi = calculateHerfindahlIndex([50, 30, 20]);
    expect(hhi).toBeCloseTo(0.38, 5);
  });

  it("flags a dominant largest position in observations", () => {
    const holdings = [
      holding({ symbol: "AAA", name: "AAA", quantity: 9, currentPrice: 100 }),
      holding({ symbol: "BBB", name: "BBB", quantity: 1, currentPrice: 100 }),
    ];

    const analysis = buildPortfolioAnalysis(holdings);

    expect(analysis.largestPosition?.weightPercent).toBeGreaterThanOrEqual(
      OBSERVATION_LARGEST_WEIGHT_THRESHOLD,
    );
    expect(analysis.observations[0]).toContain("AAA");
  });

  it("treats cash market value as quantity when price is fixed at 1", () => {
    const value = getHoldingMarketValue(
      holding({
        symbol: "EUR",
        name: "EUR Cash",
        assetType: "cash",
        quantity: 250,
        currentPrice: 1,
        purchasePrice: 1,
      }),
    );

    expect(value).toBe(250);
  });
});
