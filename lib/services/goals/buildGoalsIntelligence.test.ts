import { describe, expect, it } from "vitest";

import {
  buildGoalsIntelligence,
  goalsStatusBadgeLabel,
} from "@/lib/services/goals/buildGoalsIntelligence";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

function progress(overrides: Partial<GoalProgress> = {}): GoalProgress {
  return {
    currentProgressPercent: 40,
    currentValue: 40000,
    targetValue: 100000,
    remainingAmount: 60000,
    estimatedCompletionDate: "2032-06-01T00:00:00.000Z",
    estimatedCompletionLabel: "Jun 2032",
    requiredMonthlyGrowth: 500,
    currentTrajectory: "On track",
    status: "On track",
    summary: "On track",
    generatedAt: "2026-08-06T00:00:00.000Z",
    hasGoal: true,
    goalReached: false,
    ...overrides,
  };
}

describe("buildGoalsIntelligence", () => {
  it("builds on-track insights and forecast from engine progress", () => {
    const result = buildGoalsIntelligence({
      progress: progress(),
      monthlyContribution: 500,
      hasTimelineHistory: true,
      timelineSummary: {
        currentPortfolioValue: 40000,
        portfolioValueAvailable: true,
        netContributions: 30000,
        totalContributed: 30000,
        totalWithdrawn: 0,
        portfolioGrowth: 8000,
        portfolioGrowthPercent: 25,
        investmentReturn: 10000,
        investmentReturnPercent: 33,
        startingPortfolioValue: 32000,
        endingPortfolioValue: 40000,
        periodLabel: "1 year",
        contributionSummary: {
          totalContributed: 30000,
          totalWithdrawn: 0,
          netContributed: 30000,
          currentValue: 40000,
          valueAboveContributions: 10000,
          valueAboveContributionsPercent: 33,
          contributionCount: 1,
          withdrawalCount: 0,
          hasContributionData: true,
        },
      },
    });

    expect(result.forecast.statusLabel).toBe("On track");
    expect(result.forecast.isEstimate).toBe(true);
    expect(result.insights.some((item) => item.id === "on-track")).toBe(true);
    expect(result.insights.some((item) => item.id === "growth-vs-contrib")).toBe(
      true,
    );
    expect(result.insights.join(" ")).not.toMatch(/\bbuy\b|\bsell\b/i);
  });

  it("states insufficient history clearly", () => {
    const result = buildGoalsIntelligence({
      progress: progress({
        estimatedCompletionLabel: "Insufficient history",
        status: "Unknown",
        currentTrajectory: "Unknown",
      }),
      monthlyContribution: 0,
      hasTimelineHistory: false,
    });

    expect(result.forecast.hasSufficientHistory).toBe(false);
    expect(result.forecast.isEstimate).toBe(false);
    expect(
      result.insights.some((item) => item.id === "insufficient-history"),
    ).toBe(true);
  });

  it("handles empty goal state", () => {
    const result = buildGoalsIntelligence({
      progress: progress({
        hasGoal: false,
        status: "Unknown",
        remainingAmount: 0,
        targetValue: 0,
      }),
      monthlyContribution: 0,
      hasTimelineHistory: false,
    });

    expect(result.insights[0]?.id).toBe("no-goal");
    expect(goalsStatusBadgeLabel("Unknown", false)).toBe("Status unavailable");
  });

  it("includes factual alignment without advice", () => {
    const result = buildGoalsIntelligence({
      progress: progress(),
      monthlyContribution: 250,
      hasTimelineHistory: true,
      goalAlignment: {
        label: "Strong alignment",
        reason: "Time horizon and contribution plan fit the saved target.",
      },
      concentrationLevel: "highly_concentrated",
      largestSymbol: "VWCE",
      largestWeightPercent: 62,
    });

    expect(result.alignment?.label).toBe("Strong alignment");
    expect(result.alignment?.concentrationLine).toContain("highly concentrated");
    expect(result.alignment?.reason).not.toMatch(/\bbuy\b|\bsell\b|\brebalanc/i);
  });
});
