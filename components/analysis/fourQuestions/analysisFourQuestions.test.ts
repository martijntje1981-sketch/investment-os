import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_FOUR_QUESTION_NAV,
  ANALYSIS_FOUR_QUESTION_SECTION_IDS,
} from "@/lib/services/fourQuestions/analysisSections";
import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Analysis under the Four Questions", () => {
  const page = read("components/analysis/PortfolioAnalysisPage.tsx");
  const detail = read("components/analysis/glance/AnalysisDetailView.tsx");
  const allocation = read("components/analysis/PortfolioAllocationSection.tsx");
  const nav = read(
    "components/analysis/fourQuestions/AnalysisFourQuestionsNav.tsx",
  );
  const section = read(
    "components/analysis/fourQuestions/AnalysisQuestionSection.tsx",
  );
  const gateway = read(
    "components/analysis/fourQuestions/AnalysisOnTrackGateway.tsx",
  );
  const explore = read("components/analysis/glance/AnalysisExploreNav.tsx");

  it("keeps the Four Questions catalog without rendering it as primary Analysis chrome", () => {
    expect(ANALYSIS_FOUR_QUESTION_NAV.map((item) => item.question)).toEqual([
      "What happened?",
      "What matters now?",
      "Am I on track?",
      "What’s ahead?",
    ]);
    expect(page).not.toContain("AnalysisFourQuestionsNav");
    expect(page).not.toContain("item={Q1}");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.whatHappened");
  });

  it("keeps Analysis section anchors for existing deep links", () => {
    expect(nav).toContain('data-testid="analysis-four-questions-nav"');
    expect(section).toContain("id={item.sectionId}");
    expect(detail).toContain("id={SECTION_IDS.whatHappened}");
    expect(detail).toContain("id={SECTION_IDS.whatMatters}");
    expect(detail).toContain("id={SECTION_IDS.onTrack}");
    expect(detail).toContain("id={SECTION_IDS.whatsAhead}");
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_happened).toBe(
      "what-happened",
    );
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_matters_now).toBe(
      "what-matters",
    );
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.am_i_on_track).toBe("on-track");
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.whats_ahead).toBe("whats-ahead");
  });

  it("keeps Performance and existing performance deep link", () => {
    expect(detail).toContain("<PortfolioPerformanceSection");
    expect(detail).toContain("<TopPerformersByCategorySection");
    expect(detail).toContain("PORTFOLIO_HISTORY_PATH");
    expect(DASHBOARD_DEEP_LINKS.portfolioPerformance).toBe(
      "/analysis#portfolio-performance",
    );
  });

  it("keeps Exposure / X-Ray / Crypto reachable", () => {
    expect(detail).toContain("<PortfolioExposureSection");
    expect(detail).toContain("<BondsRatesSection");
    expect(detail).toContain("<PortfolioXRaySection");
    expect(detail).toContain("<CryptoIntelligenceSection");
    expect(allocation).toContain('id="portfolio-allocation"');
    expect(detail).toContain("<DividendIntelligenceSection");
    expect(detail).toContain("<CashIntelligenceSection");
  });

  it("places Goal gateway without cloning Goals", () => {
    expect(detail).toContain("<AnalysisOnTrackGateway");
    expect(gateway).toContain("analysis-on-track-gateway");
    expect(gateway).toContain("GOAL_REALITY_HREF");
    expect(gateway).toContain("goal-reality-check");
    expect(gateway).toContain("Open full goal view");
    expect(gateway).toContain("What-if explorer");
    expect(gateway).not.toContain("persistGoal");
  });

  it("keeps Scenarios / Resilience / Consensus reachable", () => {
    expect(detail).toContain("<ScenarioStressSection");
    expect(detail).toContain("<MarketConsensusSection");
    expect(DASHBOARD_DEEP_LINKS.scenarioStress).toBe(
      "/analysis#scenario-stress",
    );
    expect(DASHBOARD_DEEP_LINKS.resilienceSleep).toBe(
      "/analysis#resilience-sleep",
    );
    expect(DASHBOARD_DEEP_LINKS.marketConsensus).toBe(
      "/analysis#market-consensus",
    );
  });

  it("preserves existing tool deep-link ids and does not remove engines", () => {
    expect(detail).toContain("PortfolioPerformanceSection");
    expect(detail).toContain("PortfolioExposureSection");
    expect(detail).toContain("BondsRatesSection");
    expect(detail).toContain("PortfolioXRaySection");
    expect(detail).toContain("CryptoIntelligenceSection");
    expect(detail).toContain("ScenarioStressSection");
    expect(detail).toContain("MarketConsensusSection");
    expect(detail).toContain("DividendIntelligenceSection");
    expect(detail).toContain("CashIntelligenceSection");
    expect(SECTION_IDS.portfolioPerformance).toBe("portfolio-performance");
    expect(SECTION_IDS.whatHappened).toBe("what-happened");
    expect(DASHBOARD_DEEP_LINKS.whatHappened).toBe("/analysis#what-happened");
  });

  it("keeps IntelligenceScope foundation without pricing/gating", () => {
    expect(page).toContain("resolveIntelligenceScope");
    expect(page).toContain("data-intelligence-scope");
    expect(page).not.toMatch(/stripe|checkout|subscriptionTier|entitlement/i);
  });

  it("keeps Four Questions nav/section components mobile-safe for other surfaces", () => {
    expect(nav).toContain("sm:grid-cols-2");
    expect(nav).toContain("lg:grid-cols-4");
    expect(nav).not.toContain("overflow-x-scroll");
    expect(section).toContain("scroll-mt-24");
    expect(section).toContain("space-y-4");
  });
});
