import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DASHBOARD_DEEP_LINKS,
  parseSectionHash,
  SECTION_IDS,
} from "@/lib/navigation/deepLinks";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard deep links", () => {
  it("exposes stable Analysis and Goals section anchors", () => {
    expect(DASHBOARD_DEEP_LINKS.cashIntelligence).toBe(
      "/analysis#cash-intelligence",
    );
    expect(DASHBOARD_DEEP_LINKS.dividendIntelligence).toBe(
      "/analysis#dividend-intelligence",
    );
    expect(DASHBOARD_DEEP_LINKS.portfolioAllocation).toBe(
      "/analysis#portfolio-allocation",
    );
    expect(DASHBOARD_DEEP_LINKS.scenarioStress).toBe(
      "/analysis#scenario-stress",
    );
    expect(DASHBOARD_DEEP_LINKS.resilienceSleep).toBe(
      "/analysis#resilience-sleep",
    );
    expect(DASHBOARD_DEEP_LINKS.goalProgress).toBe("/goals#goal-progress");
    expect(DASHBOARD_DEEP_LINKS.goalScore).toBe("/portfolio-health#goal");
    expect(DASHBOARD_DEEP_LINKS.portfolioMomentum).toBe(
      "/portfolio-health#momentum",
    );
    expect(DASHBOARD_DEEP_LINKS.portfolioReadiness).toBe(
      "/portfolio-health#readiness",
    );
    expect(DASHBOARD_DEEP_LINKS.marketBriefing).toBe("/news#news-market-brief");
    expect(DASHBOARD_DEEP_LINKS.portfolioHealth).toBe("/portfolio-health#health");
    expect(DASHBOARD_DEEP_LINKS.scorecardHealth).toBe("/portfolio-health#health");
    expect(DASHBOARD_DEEP_LINKS.scorecardGoal).toBe("/portfolio-health#goal");
    expect(DASHBOARD_DEEP_LINKS.scorecardMomentum).toBe(
      "/portfolio-health#momentum",
    );
    expect(DASHBOARD_DEEP_LINKS.scorecardReadiness).toBe(
      "/portfolio-health#readiness",
    );
    expect(parseSectionHash("#cash-intelligence")).toBe("cash-intelligence");
  });

  it("keeps matching ids on destination sections", () => {
    expect(read("components/analysis/CashIntelligenceSection.tsx")).toContain(
      `id="${SECTION_IDS.cashIntelligence}"`,
    );
    expect(
      read("components/analysis/DividendIntelligenceSection.tsx"),
    ).toContain(`id="${SECTION_IDS.dividendIntelligence}"`);
    expect(read("components/analysis/ScenarioStressSection.tsx")).toContain(
      `id="${SECTION_IDS.scenarioStress}"`,
    );
    expect(read("components/analysis/ScenarioStressSection.tsx")).toContain(
      `id="${SECTION_IDS.resilienceSleep}"`,
    );
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      `id="${SECTION_IDS.portfolioAllocation}"`,
    );
    expect(
      read("components/portfolioHealth/PortfolioHealthPage.tsx"),
    ).toContain(`id={SECTION_IDS.scorecardHealth}`);
    expect(
      read("components/portfolioHealth/PortfolioHealthPage.tsx"),
    ).toContain(`id={SECTION_IDS.scorecardGoal}`);
    expect(
      read("components/portfolioHealth/PortfolioHealthPage.tsx"),
    ).toContain(`id={SECTION_IDS.scorecardMomentum}`);
    expect(
      read("components/portfolioHealth/PortfolioHealthPage.tsx"),
    ).toContain(`id={SECTION_IDS.scorecardReadiness}`);
    expect(read("app/goals/page.tsx")).toContain(
      `id="${SECTION_IDS.goalProgress}"`,
    );
    expect(read("components/news/NewsMarketBriefSection.tsx")).toContain(
      `id="${SECTION_IDS.newsMarketBrief}"`,
    );
  });

  it("wires Dashboard cards to deep-link destinations", () => {
    expect(
      read("components/dashboard/DashboardCashIntelligenceCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(read("components/dashboard/DashboardDividendCard.tsx")).toContain(
      "DASHBOARD_DEEP_LINKS.dividendIntelligence",
    );
    expect(
      read("components/dashboard/DashboardPortfolioExposureCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(read("components/dashboard/ScoreRing.tsx")).toContain("score.href");
    expect(
      read("components/dashboard/DashboardTodaysMarketBriefing.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.marketBriefing");
    expect(
      read("components/dashboard/DashboardIntelligencePreview.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.marketBriefing");
    expect(
      read("lib/services/portfolio/scorecard/adaptHealth.ts"),
    ).toContain("DASHBOARD_DEEP_LINKS.scorecardHealth");
  });

  it("mounts a shared deep-link scroller once", () => {
    expect(read("components/providers/AppProviders.tsx")).toContain(
      "SectionDeepLinkEffect",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "scrollIntoView",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "prefers-reduced-motion",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain('tabindex", "-1"');
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(".focus(");
  });
});
