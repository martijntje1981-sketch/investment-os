import { describe, expect, it } from "vitest";

import {
  buildGoalCoach,
  buildGoalCurrencyMilestones,
  buildGoalInsight,
  buildGoalScenarioComparison,
  estimateMonthsToReachTarget,
} from "@/lib/services/goals/goalCoach";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const baseGoal: GoalSettings = {
  targetValue: 200_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 7,
};

function mockProgress(overrides: Partial<GoalProgress>): GoalProgress {
  return {
    currentProgressPercent: 50,
    currentValue: 100_000,
    targetValue: baseGoal.targetValue,
    remainingAmount: 100_000,
    estimatedCompletionDate: "2035-03-01T00:00:00.000Z",
    estimatedCompletionLabel: "March 2035",
    requiredMonthlyGrowth: null,
    currentTrajectory: "On track",
    status: "On track",
    summary: "On track toward your goal.",
    generatedAt: "2026-07-20T08:00:00.000Z",
    hasGoal: true,
    goalReached: false,
    ...overrides,
  };
}

describe("goalCoach", () => {
  it("explains on-track status with projected completion and contribution guidance", () => {
    const coach = buildGoalCoach({
      progress: mockProgress({ status: "On track" }),
      goal: baseGoal,
      projectedValueAtTargetYear: 210_000,
      now: new Date("2026-07-20T08:00:00.000Z"),
    });

    expect(coach.headline).toBe("You're currently on track.");
    expect(coach.body).toContain("Projected completion:");
    expect(coach.reason).toMatch(/^Why:/);
    expect(coach.actionLine).toContain("Keep investing");
  });

  it("explains ahead-of-schedule status with early completion context", () => {
    const coach = buildGoalCoach({
      progress: mockProgress({
        status: "Ahead of schedule",
        currentValue: 110_000,
        currentProgressPercent: 91,
      }),
      goal: { ...baseGoal, targetValue: 120_000, targetYear: 2040 },
      projectedValueAtTargetYear: 180_000,
      now: new Date("2026-07-20T08:00:00.000Z"),
    });

    expect(coach.headline).toBe("You're ahead of schedule.");
    expect(coach.reason).toMatch(/^Why:/);
    expect(coach.actionLine).toContain("Keep investing");
  });

  it("suggests contribution increase when slightly behind", () => {
    const coach = buildGoalCoach({
      progress: mockProgress({
        status: "Slightly behind",
        currentValue: 40_000,
        currentProgressPercent: 8,
      }),
      goal: {
        ...baseGoal,
        targetValue: 500_000,
        targetYear: 2030,
        monthlyContribution: 200,
      },
      projectedValueAtTargetYear: 180_000,
      now: new Date("2026-07-20T08:00:00.000Z"),
    });

    expect(coach.headline).toBe("You're slightly behind schedule.");
    expect(coach.body).toMatch(/€100|additional|Increasing monthly/i);
    expect(coach.reason).toContain("Why:");
  });

  it("handles reached goals without fabricating future projections", () => {
    const coach = buildGoalCoach({
      progress: mockProgress({
        goalReached: true,
        currentProgressPercent: 100,
        currentValue: 250_000,
        status: "Ahead of schedule",
      }),
      goal: baseGoal,
      projectedValueAtTargetYear: 250_000,
    });

    expect(coach.headline).toContain("reached");
    expect(coach.reason).toContain("Why:");
  });
});

describe("buildGoalCurrencyMilestones", () => {
  it("adapts milestone steps to goal size and marks reached values", () => {
    const milestones = buildGoalCurrencyMilestones(125_000, 200_000);

    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[milestones.length - 1].label).toBe("Goal");
    expect(milestones.some((m) => m.reached && m.value <= 125_000)).toBe(true);
    expect(milestones.some((m) => !m.reached && m.value > 125_000)).toBe(true);
  });

  it("returns empty milestones when target is zero", () => {
    expect(buildGoalCurrencyMilestones(10_000, 0)).toEqual([]);
  });
});

describe("buildGoalScenarioComparison", () => {
  it("compares current, contribution bump, and return bump scenarios", () => {
    const comparison = buildGoalScenarioComparison({
      currentValue: 50_000,
      goal: baseGoal,
    });

    expect(comparison.rows).toHaveLength(3);
    expect(comparison.rows[0].label).toBe("Current");
    expect(comparison.rows[1].label).toContain("/month");
    expect(comparison.rows[2].label).toContain("annual return");
    comparison.rows.forEach((row) => {
      expect(row.completionLabel.length).toBeGreaterThan(0);
    });
  });
});

describe("buildGoalInsight", () => {
  it("returns factual journey progress when on track", () => {
    const insight = buildGoalInsight({
      progress: mockProgress({
        currentProgressPercent: 49,
        currentValue: 98_000,
      }),
      goal: baseGoal,
      projectedValueAtTargetYear: 210_000,
    });

    expect(insight).toMatch(/49% of your journey|exceeds your goal|per month separates/i);
  });

  it("highlights projection buffer when ahead", () => {
    const insight = buildGoalInsight({
      progress: mockProgress({
        status: "Ahead of schedule",
        currentValue: 150_000,
      }),
      goal: baseGoal,
      projectedValueAtTargetYear: 236_000,
    });

    expect(insight).toContain("exceeds your goal by");
  });
});

describe("estimateMonthsToReachTarget", () => {
  it("returns zero when target is already met", () => {
    expect(
      estimateMonthsToReachTarget(200_000, 200_000, 500, 7),
    ).toBe(0);
  });

  it("returns null when target cannot be reached within the horizon", () => {
    expect(
      estimateMonthsToReachTarget(1_000, 1_000_000, 0, 0, 24),
    ).toBeNull();
  });
});
