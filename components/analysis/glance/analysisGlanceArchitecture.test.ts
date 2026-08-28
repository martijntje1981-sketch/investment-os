import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_INCOMPLETE_COVERAGE_COPY,
  ANALYSIS_EXPLORE_DESTINATIONS,
} from "@/lib/services/analysisGlance";
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
  const detail = read("components/analysis/glance/AnalysisDetailView.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const glance = read("lib/services/analysisGlance/buildAnalysisGlance.ts");
  const attention = read("lib/services/analysisGlance/buildAnalysisAttention.ts");
  const stanceBlock = read("components/analysis/glance/AnalysisStanceBlock.tsx");
  const attentionBlock = read(
    "components/analysis/glance/AnalysisAttentionBlock.tsx",
  );
  const outlookBlock = read("components/analysis/glance/AnalysisOutlookBlock.tsx");

  it("keeps primary Analysis to three intelligence blocks then Explore", () => {
    const intro = page.indexOf("<AnalysisIntro");
    const primary = page.indexOf('data-testid="analysis-primary"');
    const stance = page.indexOf("<AnalysisStanceBlock");
    const attentionIdx = page.indexOf("<AnalysisAttentionBlock");
    const outlook = page.indexOf("<AnalysisOutlookBlock");
    const exploreIdx = page.indexOf("<AnalysisExploreNav");

    expect(intro).toBeGreaterThan(-1);
    expect(primary).toBeGreaterThan(intro);
    expect(stance).toBeGreaterThan(primary);
    expect(attentionIdx).toBeGreaterThan(stance);
    expect(outlook).toBeGreaterThan(attentionIdx);
    expect(exploreIdx).toBeGreaterThan(outlook);
    expect(page).not.toContain('data-testid="analysis-depth"');
    expect(page).not.toContain("<PortfolioPerformanceSection");
    expect(page).not.toContain("<PortfolioExposureSection");
    expect(page).not.toContain("<ScenarioStressSection");
  });

  it("does not render the full legacy engine stack in the primary flow", () => {
    const primary = page.slice(
      page.indexOf('data-testid="analysis-primary"'),
      page.indexOf("<AnalysisExploreNav"),
    );
    expect(primary).not.toContain("PortfolioPerformanceSection");
    expect(primary).not.toContain("TopPerformersByCategorySection");
    expect(primary).not.toContain("PortfolioExposureSection");
    expect(primary).not.toContain("BondsRatesSection");
    expect(primary).not.toContain("PortfolioXRaySection");
    expect(primary).not.toContain("CryptoIntelligenceSection");
    expect(primary).not.toContain("DividendIntelligenceSection");
    expect(primary).not.toContain("CashIntelligenceSection");
    expect(primary).not.toContain("AnalysisOnTrackGateway");
    expect(primary).not.toContain("ScenarioStressSection");
    expect(primary).not.toContain("MarketConsensusSection");
    expect(primary).not.toContain("AuthenticatedFourQuestionsNav");
    expect(primary).not.toContain("What happened?");
  });

  it("does not repeat Four Questions navigation in the primary flow", () => {
    expect(page).not.toContain("AuthenticatedFourQuestionsNav");
    expect(page).not.toContain("AnalysisFourQuestionsNav");
    expect(page).not.toContain("item={Q1}");
    expect(page).not.toContain("<AnalysisQuestionSection");
  });

  it("keeps Four Questions hub routes reachable through Explore", () => {
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.whatHappened");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.whatMatters");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.onTrack");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.whatsAhead");
    expect(ANALYSIS_EXPLORE_DESTINATIONS.whatHappened).toBe(
      WHAT_HAPPENED_HUB_PATH,
    );
    expect(WHAT_HAPPENED_HUB_PATH).toBe("/what-happened");
    expect(WHAT_MATTERS_HUB_PATH).toBe("/what-matters");
    expect(ON_TRACK_HUB_PATH).toBe("/on-track");
    expect(WHATS_AHEAD_HUB_PATH).toBe("/whats-ahead");
  });

  it("keeps existing Analysis engines reachable via hash-target detail", () => {
    expect(detail).toContain("PortfolioPerformanceSection");
    expect(detail).toContain("TopPerformersByCategorySection");
    expect(detail).toContain("PortfolioExposureSection");
    expect(detail).toContain("BondsRatesSection");
    expect(detail).toContain("PortfolioXRaySection");
    expect(detail).toContain("CryptoIntelligenceSection");
    expect(detail).toContain("PortfolioAllocationSection");
    expect(detail).toContain("DividendIntelligenceSection");
    expect(detail).toContain("CashIntelligenceSection");
    expect(detail).toContain("AnalysisOnTrackGateway");
    expect(detail).toContain("ScenarioStressSection");
    expect(detail).toContain("MarketConsensusSection");
    expect(detail).toContain('id={SECTION_IDS.whatHappened}');
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.allocation");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.scenarios");
    expect(SECTION_IDS.portfolioPerformance).toBe("portfolio-performance");
    expect(DASHBOARD_DEEP_LINKS.whatHappened).toBe("/analysis#what-happened");
  });

  it("reuses canonical stance, coverage, and scenario helpers", () => {
    expect(glance).toContain("buildPortfolioStance");
    expect(glance).toContain("resolvePortfolioValuationCoverage");
    expect(glance).toContain("selectRelevantPortfolioScenarios");
    expect(glance).toContain("buildResilienceProfile");
    expect(glance).not.toMatch(/Math\.random|fakeScore|inventedStance/i);
    expect(stanceBlock).toContain("AnalysisStanceScale");
    expect(attention).toContain(".slice(0, 3)");
    expect(outlookBlock).toContain("view.comparisons");
  });

  it("shows incomplete coverage once at the top rather than in every card", () => {
    expect(page).toContain("<AnalysisCoverageBanner");
    expect(glance).toContain("ANALYSIS_INCOMPLETE_COVERAGE_COPY");
    expect(ANALYSIS_INCOMPLETE_COVERAGE_COPY).toMatch(/incomplete while prices/i);
    expect(stanceBlock).not.toContain(ANALYSIS_INCOMPLETE_COVERAGE_COPY);
    expect(attentionBlock).not.toContain(ANALYSIS_INCOMPLETE_COVERAGE_COPY);
    expect(outlookBlock).not.toContain(ANALYSIS_INCOMPLETE_COVERAGE_COPY);
  });

  it("does not restyle the approved Dashboard glance architecture", () => {
    expect(dashboard).toContain("DashboardSummary");
    expect(dashboard).toContain("HoldingsToday");
    expect(dashboard).toContain("DashboardPersonalIntelligence");
    expect(dashboard).toContain("DashboardSecondaryNav");
    expect(dashboard).not.toContain("AnalysisStanceBlock");
    expect(dashboard).not.toContain("AnalysisExploreNav");
    expect(dashboard).not.toContain("AnalysisDetailView");
  });
});
