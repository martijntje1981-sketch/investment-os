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
});
