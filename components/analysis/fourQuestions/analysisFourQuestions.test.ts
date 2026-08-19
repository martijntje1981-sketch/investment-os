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
  const nav = read(
    "components/analysis/fourQuestions/AnalysisFourQuestionsNav.tsx",
  );
  const section = read(
    "components/analysis/fourQuestions/AnalysisQuestionSection.tsx",
  );
  const gateway = read(
    "components/analysis/fourQuestions/AnalysisOnTrackGateway.tsx",
  );

  it("renders the four Analysis question headings in order", () => {
    expect(ANALYSIS_FOUR_QUESTION_NAV.map((item) => item.question)).toEqual([
      "What happened?",
      "What matters now?",
      "Am I on track?",
      "What’s ahead?",
    ]);
    const q1 = page.indexOf("item={Q1}");
    const q2 = page.indexOf("item={Q2}");
    const q3 = page.indexOf("item={Q3}");
    const q4 = page.indexOf("item={Q4}");
    expect(q1).toBeGreaterThan(-1);
    expect(q2).toBeGreaterThan(q1);
    expect(q3).toBeGreaterThan(q2);
    expect(q4).toBeGreaterThan(q3);
  });

  it("top navigation links to correct section anchors", () => {
    expect(nav).toContain('data-testid="analysis-four-questions-nav"');
    expect(nav).toContain("href={`#${item.sectionId}`}");
    expect(nav).toContain("ANALYSIS_FOUR_QUESTION_NAV");
    expect(section).toContain("id={item.sectionId}");
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_happened).toBe(
      "what-happened",
    );
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_matters_now).toBe(
      "what-matters",
    );
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.am_i_on_track).toBe("on-track");
    expect(ANALYSIS_FOUR_QUESTION_SECTION_IDS.whats_ahead).toBe("whats-ahead");
  });

  it("keeps Performance under Q1 and existing performance deep link", () => {
    const q1Block = page.slice(
      page.indexOf("item={Q1}"),
      page.indexOf("item={Q2}"),
    );
    expect(q1Block).toContain("<PortfolioPerformanceSection");
    expect(q1Block).toContain("<TopPerformersByCategorySection");
    expect(q1Block).toContain("PORTFOLIO_HISTORY_PATH");
    expect(DASHBOARD_DEEP_LINKS.portfolioPerformance).toBe(
      "/analysis#portfolio-performance",
    );
  });

  it("keeps Exposure / X-Ray / Crypto under Q2", () => {
    const q2Block = page.slice(
      page.indexOf("item={Q2}"),
      page.indexOf("item={Q3}"),
    );
    expect(q2Block).toContain("<PortfolioExposureSection");
    expect(q2Block).toContain("<BondsRatesSection");
    expect(q2Block).toContain("<PortfolioXRaySection");
    expect(q2Block).toContain("<CryptoIntelligenceSection");
    expect(q2Block).toContain('id="portfolio-allocation"');
    expect(q2Block).toContain("<DividendIntelligenceSection");
    expect(q2Block).toContain("<CashIntelligenceSection");
  });

  it("places Goal gateway under Q3 without cloning Goals", () => {
    const q3Block = page.slice(
      page.indexOf("item={Q3}"),
      page.indexOf("item={Q4}"),
    );
    expect(q3Block).toContain("<AnalysisOnTrackGateway");
    expect(q3Block).not.toContain("<ScenarioStressSection");
    expect(gateway).toContain("analysis-on-track-gateway");
    expect(gateway).toContain("GOAL_REALITY_HREF");
    expect(gateway).toContain("goal-reality-check");
    expect(gateway).toContain("Open full goal view");
    expect(gateway).toContain("What-if explorer");
    expect(gateway).not.toContain("persistGoal");
  });

  it("places Scenarios / Resilience / Consensus under Q4", () => {
    const q4Block = page.slice(page.indexOf("item={Q4}"));
    expect(q4Block).toContain("<ScenarioStressSection");
    expect(q4Block).toContain("<MarketConsensusSection");
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
    expect(page).toContain("PortfolioPerformanceSection");
    expect(page).toContain("PortfolioExposureSection");
    expect(page).toContain("BondsRatesSection");
    expect(page).toContain("PortfolioXRaySection");
    expect(page).toContain("CryptoIntelligenceSection");
    expect(page).toContain("ScenarioStressSection");
    expect(page).toContain("MarketConsensusSection");
    expect(page).toContain("DividendIntelligenceSection");
    expect(page).toContain("CashIntelligenceSection");
    expect(SECTION_IDS.portfolioPerformance).toBe("portfolio-performance");
    expect(SECTION_IDS.whatHappened).toBe("what-happened");
    expect(DASHBOARD_DEEP_LINKS.whatHappened).toBe("/analysis#what-happened");
  });

  it("keeps IntelligenceScope foundation without pricing/gating", () => {
    expect(page).toContain("resolveIntelligenceScope");
    expect(page).toContain("data-intelligence-scope");
    expect(page).not.toMatch(/stripe|checkout|subscriptionTier|entitlement/i);
  });

  it("uses mobile-safe stacked nav and section structure", () => {
    expect(nav).toContain("sm:grid-cols-2");
    expect(nav).toContain("lg:grid-cols-4");
    expect(nav).not.toContain("overflow-x-scroll");
    expect(section).toContain("scroll-mt-24");
    expect(section).toContain("space-y-4");
  });
});
