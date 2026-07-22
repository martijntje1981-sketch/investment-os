import { describe, expect, it, vi } from "vitest";

import {
  buildGoalProgressEngine,
  buildGoalProgressScenarioPlan,
  projectPortfolioValue,
} from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const baseGoal: GoalSettings = {
  targetValue: 100_000,
  targetYear: 2036,
  monthlyContribution: 500,
  expectedAnnualReturn: 8,
};

describe("goalProgressEngine", () => {
  it("returns unknown progress when no goal is saved", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 25_000,
      goal: null,
      hasSavedGoal: false,
    });

    expect(progress.hasGoal).toBe(false);
    expect(progress.status).toBe("Unknown");
    expect(progress.summary).toContain("Save a financial goal");
  });

  it("projects using saved goal inputs when no history is available", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 20_000,
      goal: baseGoal,
      hasSavedGoal: true,
      generatedAt: "2026-07-20T08:00:00.000Z",
    });

    expect(progress.hasGoal).toBe(true);
    expect(progress.currentProgressPercent).toBe(20);
    expect(progress.remainingAmount).toBe(80_000);
    expect(["On track", "Slightly behind", "Behind schedule", "Ahead of schedule"]).toContain(
      progress.status,
    );
    expect(progress.summary.length).toBeGreaterThan(0);
  });

  it("uses portfolio history when available to refine trajectory", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 60_000,
      goal: baseGoal,
      hasSavedGoal: true,
      portfolioHistory: [
        { date: "2026-01-01T00:00:00.000Z", value: 40_000 },
        { date: "2026-07-01T00:00:00.000Z", value: 60_000 },
      ],
      generatedAt: "2026-07-20T08:00:00.000Z",
    });

    expect(progress.estimatedCompletionLabel).not.toBe("Insufficient history");
    expect(progress.currentTrajectory).not.toBe("Unknown");
  });

  it("marks a reached goal as ahead of schedule", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 120_000,
      goal: baseGoal,
      hasSavedGoal: true,
    });

    expect(progress.goalReached).toBe(true);
    expect(progress.currentProgressPercent).toBe(100);
    expect(progress.status).toBe("Ahead of schedule");
    expect(progress.remainingAmount).toBe(0);
  });

  it("handles a large portfolio nearing completion", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 95_000,
      goal: { ...baseGoal, targetValue: 100_000 },
      hasSavedGoal: true,
    });

    expect(progress.currentProgressPercent).toBe(95);
    expect(progress.remainingAmount).toBe(5_000);
    expect(progress.status).toBe("Ahead of schedule");
  });

  it("handles a small portfolio with conservative summary", () => {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: 500,
      goal: baseGoal,
      hasSavedGoal: true,
    });

    expect(progress.currentProgressPercent).toBe(0.5);
    expect(progress.remainingAmount).toBe(99_500);
    expect(progress.summary.length).toBeGreaterThan(0);
  });

  it("builds future scenario plans without making provider calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const plan = buildGoalProgressScenarioPlan({
      currentPortfolioValue: 30_000,
      goal: baseGoal,
      hasSavedGoal: true,
    });

    expect(plan.base.requiredMonthlyContribution).toBe(500);
    expect(plan.milestones).toHaveLength(4);
    expect(plan.bear.estimatedCompletionDate).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("projects portfolio value deterministically", () => {
    const projected = projectPortfolioValue(10_000, 500, 8, 12);
    expect(projected).toBeGreaterThan(16_000);
  });
});

describe("goal progress reuse", () => {
  it("dashboard uses the shared goal progress hook and card", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const dashboard = readFileSync(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );

    expect(dashboard).toContain("useGoalProgress");
    expect(dashboard).toContain("DashboardGoalProgressCard");
  });
});
