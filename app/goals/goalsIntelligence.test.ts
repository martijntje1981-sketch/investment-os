import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 3B Goals Intelligence wiring", () => {
  const page = read("app/goals/page.tsx");
  const intelligence = read(
    "lib/services/goals/buildGoalsIntelligence.ts",
  );

  it("reuses Portfolio Timeline for goal progress history", () => {
    expect(page).toContain("buildPortfolioTimeline");
    expect(page).toContain("timelineToGoalHistoryPoints");
    expect(page).toContain("portfolioHistory: timelineToGoalHistoryPoints");
    expect(page).toContain("usePortfolioPerformanceHistory");
    expect(page).not.toContain("fakeHistory");
  });

  it("keeps goal progress and estimated completion from the shared engine", () => {
    expect(page).toContain("useGoalProgress");
    expect(page).toContain("estimatedCompletionLabel");
    expect(page).toContain("buildGoalsIntelligence");
    expect(intelligence).toContain("Insufficient history");
    expect(intelligence).not.toMatch(/\bbuy\b|\bsell\b|\brebalanc/i);
  });

  it("reuses Export Portfolio instead of a separate Goals export", () => {
    expect(page).toContain("ExportPortfolioButton");
    expect(page).toContain('variant="hero"');
    expect(page).toContain("downloadPortfolioWorkbook");
    expect(page).not.toContain("Export Excel");
    expect(page).not.toContain("downloadPortfolioHistoryWorkbook");
  });

  it("keeps mobile-first layout markers and minimal form fields", () => {
    expect(page).toContain("min-w-0");
    expect(page).toContain("min-h-[44px]");
    expect(page).toContain("Goal name");
    expect(page).toContain("Target amount");
    expect(page).toContain("Target year");
    expect(page).toContain("Monthly contribution");
    expect(page).toContain("Expected annual return");
    expect(page).toContain("Your assumption");
    expect(page).toContain("ExpectedReturnAssumptionEditor");
    expect(page).not.toContain("GoalCoachCard");
    expect(page).not.toContain("GoalWhatIfCard");
    expect(page).toContain("WhatIfExplorer");
    expect(page).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });

  it("supports empty goal and single-goal model (no multi-goal UI)", () => {
    expect(page).toContain("Set your goal");
    expect(page).not.toContain("Add another goal");
    expect(page).not.toContain("goals.map");
    expect(page).toContain("EmptyPortfolioGuide");
  });
});
