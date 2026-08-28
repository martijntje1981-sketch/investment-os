import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  ON_TRACK_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Analysis glance → explore architecture", () => {
  const page = read("components/analysis/PortfolioAnalysisPage.tsx");
  const explore = read("components/analysis/glance/AnalysisExploreNav.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const glance = read("lib/services/analysisGlance/buildAnalysisGlance.ts");

  it("keeps primary Analysis to three intelligence blocks then Explore", () => {
    const intro = page.indexOf("<AnalysisIntro");
    const primary = page.indexOf('data-testid="analysis-primary"');
    const stance = page.indexOf("<AnalysisStanceBlock");
    const attention = page.indexOf("<AnalysisAttentionBlock");
    const outlook = page.indexOf("<AnalysisOutlookBlock");
    const exploreIdx = page.indexOf("<AnalysisExploreNav");
    const depth = page.indexOf('data-testid="analysis-depth"');

    expect(intro).toBeGreaterThan(-1);
    expect(primary).toBeGreaterThan(intro);
    expect(stance).toBeGreaterThan(primary);
    expect(attention).toBeGreaterThan(stance);
    expect(outlook).toBeGreaterThan(attention);
    expect(exploreIdx).toBeGreaterThan(outlook);
    expect(depth).toBeGreaterThan(exploreIdx);
  });

  it("does not repeat Four Questions navigation in the primary flow", () => {
    expect(page).not.toContain("AuthenticatedFourQuestionsNav");
    expect(page).not.toContain("AnalysisFourQuestionsNav");
    expect(page).not.toContain("item={Q1}");
    expect(page).not.toContain("<AnalysisQuestionSection");
    const primary = page.slice(
      page.indexOf('data-testid="analysis-primary"'),
      page.indexOf('data-testid="analysis-explore"') > -1
        ? page.indexOf("<AnalysisExploreNav")
        : page.length,
    );
    expect(primary).not.toContain("What happened?");
    expect(primary).not.toContain("What matters now?");
  });

  it("keeps Four Questions hub routes reachable through Explore", () => {
    expect(explore).toContain("WHAT_HAPPENED_HUB_PATH");
    expect(explore).toContain("WHAT_MATTERS_HUB_PATH");
    expect(explore).toContain("ON_TRACK_HUB_PATH");
    expect(explore).toContain("WHATS_AHEAD_HUB_PATH");
    expect(WHAT_HAPPENED_HUB_PATH).toBe("/what-happened");
    expect(WHAT_MATTERS_HUB_PATH).toBe("/what-matters");
    expect(ON_TRACK_HUB_PATH).toBe("/on-track");
    expect(WHATS_AHEAD_HUB_PATH).toBe("/whats-ahead");
  });

  it("keeps existing Analysis engines reachable after Explore", () => {
    const depth = page.slice(page.indexOf('data-testid="analysis-depth"'));
    expect(depth).toContain("PortfolioPerformanceSection");
    expect(depth).toContain("TopPerformersByCategorySection");
    expect(depth).toContain("PortfolioExposureSection");
    expect(depth).toContain("BondsRatesSection");
    expect(depth).toContain("PortfolioXRaySection");
    expect(depth).toContain("CryptoIntelligenceSection");
    expect(depth).toContain('id="portfolio-allocation"');
    expect(depth).toContain("DividendIntelligenceSection");
    expect(depth).toContain("CashIntelligenceSection");
    expect(depth).toContain("AnalysisOnTrackGateway");
    expect(depth).toContain("ScenarioStressSection");
    expect(depth).toContain("MarketConsensusSection");
    expect(explore).toContain("DASHBOARD_DEEP_LINKS.portfolioAllocation");
    expect(explore).toContain("DASHBOARD_DEEP_LINKS.scenarioStress");
    expect(SECTION_IDS.portfolioPerformance).toBe("portfolio-performance");
    expect(DASHBOARD_DEEP_LINKS.whatHappened).toBe("/analysis#what-happened");
  });

  it("reuses canonical stance, coverage, and scenario helpers", () => {
    expect(glance).toContain("buildPortfolioStance");
    expect(glance).toContain("resolvePortfolioValuationCoverage");
    expect(glance).toContain("selectRelevantPortfolioScenarios");
    expect(glance).toContain("buildResilienceProfile");
    expect(glance).not.toMatch(/Math\.random|fakeScore|inventedStance/i);
  });

  it("does not restyle the approved Dashboard glance architecture", () => {
    expect(dashboard).toContain("DashboardSummary");
    expect(dashboard).toContain("HoldingsToday");
    expect(dashboard).toContain("DashboardPersonalIntelligence");
    expect(dashboard).toContain("DashboardSecondaryNav");
    expect(dashboard).not.toContain("AnalysisStanceBlock");
  });
});
