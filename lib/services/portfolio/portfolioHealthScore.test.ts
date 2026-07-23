import { describe, expect, it } from "vitest";

import { buildPortfolioHealthScore } from "@/lib/services/portfolio/portfolioHealthScore";

const healthyGoal = {
  hasGoal: true,
  goalReached: false,
  status: "On track" as const,
  currentTrajectory: "On track" as const,
};

describe("buildPortfolioHealthScore", () => {
  it("returns a strong score for a balanced, on-track portfolio", () => {
    const result = buildPortfolioHealthScore({
      concentrationLevel: "broadly_spread",
      investmentCount: 8,
      largestPositionWeightPercent: 18,
      cashWeightPercent: 12,
      goalProgress: healthyGoal,
      isStale: false,
      portfolioStatus: "Stable",
      quietMarket: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.indicators).toHaveLength(6);
    expect(result.indicators.find((item) => item.id === "diversification")?.level).toBe(
      "good",
    );
    expect(result.summary).toContain("excellent health");
  });

  it("flags stale market data and elevated concentration", () => {
    const result = buildPortfolioHealthScore({
      concentrationLevel: "highly_concentrated",
      investmentCount: 3,
      largestPositionWeightPercent: 52,
      cashWeightPercent: 45,
      goalProgress: {
        hasGoal: true,
        goalReached: false,
        status: "Behind schedule",
        currentTrajectory: "Behind",
      },
      isStale: true,
      portfolioStatus: "High Attention",
      quietMarket: false,
    });

    expect(result.score).toBeLessThan(60);
    expect(result.indicators.find((item) => item.id === "market_data")?.level).toBe(
      "needs_attention",
    );
    expect(result.indicators.find((item) => item.id === "concentration")?.level).toBe(
      "needs_attention",
    );
  });

  it("uses the moderate concentration + on-track goal summary template", () => {
    const result = buildPortfolioHealthScore({
      concentrationLevel: "broadly_spread",
      investmentCount: 6,
      largestPositionWeightPercent: 32,
      cashWeightPercent: 10,
      goalProgress: healthyGoal,
      isStale: false,
      portfolioStatus: "Stable",
      quietMarket: true,
    });

    expect(result.indicators.find((item) => item.id === "concentration")?.level).toBe(
      "moderate",
    );
    expect(result.summary).toContain("Concentration is slightly elevated");
    expect(result.summary).toContain("long-term goal remains on track");
  });
});
