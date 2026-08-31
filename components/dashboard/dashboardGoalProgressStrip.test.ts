import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard goal progress strip wiring", () => {
  it("places compact goal progress after the hero and reuses existing goal data", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const strip = read("components/dashboard/DashboardGoalProgressStrip.tsx");
    const catalog = read("lib/services/fourQuestions/catalog.ts");

    expect(dashboard).toContain("DashboardGoalProgressStrip");
    expect(dashboard).toContain("useGoalProgress");
    expect(dashboard).toContain("historyReady={historyEnabled}");
    expect(dashboard).not.toContain("DashboardGoalProgressCard");
    expect(strip).toContain("buildGoalHeroProgressState");
    expect(strip).toContain("formatGoalHeroProgressPercent");
    expect(strip).toContain("buildGoalPeriodSnapshot");
    expect(strip).toContain("goalsStatusBadgeLabel");
    expect(strip).toContain('useState<GoalProgressPeriodId>("ALL")');
    expect(strip).toContain("Target ${targetYear}");
    expect(dashboard).toContain("targetYear={goal?.targetYear ?? null}");
    expect(strip).toContain("DASHBOARD_DEEP_LINKS.goalProgress");
    expect(strip).toContain("1M");
    expect(strip).toContain("1Y");
    expect(strip).toContain("5Y");
    expect(strip).toContain("ALL");
    expect(catalog).toContain("View and edit your goal");
    expect(catalog).toContain("#goal-progress");
  });

  it("keeps live headline progress separate from the EOD period estimate", () => {
    const strip = read("components/dashboard/DashboardGoalProgressStrip.tsx");
    const periods = read("lib/client/goalProgressPeriods.ts");

    expect(strip).toContain("buildGoalHeroProgressState");
    expect(strip).toContain("state.currentValue");
    expect(strip).toContain("formatGoalHeroProgressPercent(state.displayPercent)");
    expect(strip).not.toContain("currentValue: state.currentValue");
    expect(strip).not.toContain("currentValue: progress.currentValue");
    expect(periods).not.toMatch(/finiteValue\(input\.currentValue\)/);
    expect(periods).toContain("Estimated price move");
    expect(periods).toContain("percentage points of your goal");
    expect(periods).toContain("through ${endLabel}");
    expect(periods).toContain("since ${startLabel}");
  });

  it("does not label the reconstructed period metric as growth, profit, or investment return", () => {
    const strip = read("components/dashboard/DashboardGoalProgressStrip.tsx");
    const periods = read("lib/client/goalProgressPeriods.ts");

    expect(strip).toContain("formatGoalPeriodDetailCopy");
    expect(strip).toContain("About this estimate");
    expect(strip).toContain("aria-expanded");
    expect(strip).toContain("skippedHoldingCount");
    expect(strip).toContain("copy.shortExplanation");
    expect(strip).not.toContain("Growth");
    expect(strip).not.toMatch(/\b[Pp]rofit\b/);
    expect(periods).not.toContain("Growth ${");
    expect(periods).not.toContain("`Growth");
    expect(periods).not.toContain("Portfolio change");
    expect(periods).not.toMatch(/parts\.push\(`Growth/);
    expect(periods).toContain(
      "It is not your contribution-adjusted investment return.",
    );
  });

  it("leaves Goal engine and reconstructed history formulas unchanged", () => {
    const engine = read("lib/services/goals/goalProgressEngine.ts");
    const series = read("lib/services/performance/buildHistoricalPortfolioSeries.ts");
    const strip = read("components/dashboard/DashboardGoalProgressStrip.tsx");

    expect(engine).toContain("export function buildGoalProgressEngine");
    expect(series).toContain("export function buildHistoricalPortfolioSeries");
    expect(strip).not.toContain("calculateGoalProgress");
    expect(strip).not.toContain("buildHistoricalPortfolioSeries");
  });
});
