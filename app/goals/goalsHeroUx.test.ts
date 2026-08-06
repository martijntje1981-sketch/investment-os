import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("goals hero integration", () => {
  it("uses the shared goal progress hook for portfolio valuation", () => {
    const goalsPage = readFileSync(
      path.resolve(process.cwd(), "app/goals/page.tsx"),
      "utf8",
    );

    expect(goalsPage).toContain("useGoalProgress");
    expect(goalsPage).toContain("goalProgress.currentValue");
    expect(goalsPage).toContain("timelineToGoalHistoryPoints");
    expect(goalsPage).not.toContain("calculatePortfolioValue");
  });

  it("renders the hero progress visual inside PageHero", () => {
    const goalsPage = readFileSync(
      path.resolve(process.cwd(), "app/goals/page.tsx"),
      "utf8",
    );

    expect(goalsPage).toContain("GoalHeroProgressVisual");
    expect(goalsPage).toContain("visual={");
  });
});
