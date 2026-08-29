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

  it("renders the hero progress visual in the on-track block", () => {
    const goalsPage = readFileSync(
      path.resolve(process.cwd(), "app/goals/page.tsx"),
      "utf8",
    );

    expect(goalsPage).toContain("GoalHeroProgressVisual");
    expect(goalsPage).toContain("CalmPageIntro");
    expect(goalsPage).toContain('canvas="navy"');
    expect(goalsPage).toContain("Am I on track?");
    expect(goalsPage).toContain("onDark");
    expect(goalsPage).toContain("Estimated completion");
    expect(goalsPage).not.toContain("<PageHero");
  });
});
