/**
 * Scorecard navigation — Dashboard rings → central /portfolio-health page.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Scorecard navigation", () => {
  it("routes all four Dashboard score rings to the central Scorecard page", () => {
    expect(DASHBOARD_DEEP_LINKS.scorecardHealth).toBe(
      "/portfolio-health#health",
    );
    expect(DASHBOARD_DEEP_LINKS.scorecardGoal).toBe("/portfolio-health#goal");
    expect(DASHBOARD_DEEP_LINKS.scorecardMomentum).toBe(
      "/portfolio-health#momentum",
    );
    expect(DASHBOARD_DEEP_LINKS.scorecardReadiness).toBe(
      "/portfolio-health#readiness",
    );

    expect(read("lib/services/portfolio/scorecard/adaptHealth.ts")).toContain(
      "DASHBOARD_DEEP_LINKS.scorecardHealth",
    );
    expect(
      read("lib/services/portfolio/scorecard/buildGoalScore.ts"),
    ).toContain("DASHBOARD_DEEP_LINKS.scorecardGoal");
    expect(
      read("lib/services/portfolio/scorecard/buildMomentumScore.ts"),
    ).toContain("DASHBOARD_DEEP_LINKS.scorecardMomentum");
    expect(
      read("lib/services/portfolio/scorecard/buildReadinessScore.ts"),
    ).toContain("DASHBOARD_DEEP_LINKS.scorecardReadiness");
  });

  it("keeps legacy /portfolio-health path as the Scorecard destination", () => {
    const page = read("components/portfolioHealth/PortfolioHealthPage.tsx");
    expect(page).toContain("Portfolio Scorecard");
    expect(page).toContain(`id={SECTION_IDS.scorecardHealth}`);
    expect(page).toContain(`id={SECTION_IDS.scorecardGoal}`);
    expect(page).toContain(`id={SECTION_IDS.scorecardMomentum}`);
    expect(page).toContain(`id={SECTION_IDS.scorecardReadiness}`);
    expect(page).toContain("ScoreRing");
    expect(page).toContain("buildPortfolioScorecard");
    expect(read("app/portfolio-health/page.tsx")).toContain(
      "PortfolioHealthPage",
    );
  });

  it("does not leave Goal/Momentum/Readiness score details on Goals/Analysis", () => {
    const goals = read("app/goals/page.tsx");
    const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
    expect(goals).not.toContain("PortfolioScoreDetailSection");
    expect(analysis).not.toContain("PortfolioScoreDetailSection");
    expect(goals).toContain("DASHBOARD_DEEP_LINKS.scorecardGoal");
    expect(read("components/analysis/glance/AnalysisExploreNav.tsx")).toContain(
      "ANALYSIS_EXPLORE_DESTINATIONS.scorecard",
    );
  });

  it("exposes stable section ids for accessibility anchors", () => {
    expect(SECTION_IDS.scorecardHealth).toBe("health");
    expect(SECTION_IDS.scorecardGoal).toBe("goal");
    expect(SECTION_IDS.scorecardMomentum).toBe("momentum");
    expect(SECTION_IDS.scorecardReadiness).toBe("readiness");
  });
});
