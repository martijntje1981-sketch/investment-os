import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Four Questions product architecture Phase 1 wiring", () => {
  const compact = read(
    "components/fourQuestions/FourQuestionsCompactNav.tsx",
  );
  const hub = read("components/fourQuestions/QuestionHubPage.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
  const happened = read("app/what-happened/page.tsx");
  const matters = read("app/what-matters/page.tsx");
  const onTrack = read("app/on-track/page.tsx");
  const ahead = read("app/whats-ahead/page.tsx");

  it("exposes four hub routes", () => {
    expect(happened).toContain("WhatHappenedHubPage");
    expect(matters).toContain("WhatMattersHubPage");
    expect(onTrack).toContain("OnTrackHubPage");
    expect(ahead).toContain("WhatsAheadHubPage");
    expect(read("components/fourQuestions/hubs/WhatHappenedHubPage.tsx")).toContain(
      'questionId="what_happened"',
    );
    expect(read("components/fourQuestions/hubs/WhatMattersHubPage.tsx")).toContain(
      'questionId="what_matters_now"',
    );
    expect(read("components/fourQuestions/hubs/OnTrackHubPage.tsx")).toContain(
      'questionId="am_i_on_track"',
    );
    expect(read("components/fourQuestions/hubs/WhatsAheadHubPage.tsx")).toContain(
      'questionId="whats_ahead"',
    );
  });

  it("shared compact nav uses aria-current and hub links", () => {
    expect(compact).toContain('data-testid="four-questions-compact-nav"');
    expect(compact).toContain('aria-current={isActive ? "page" : undefined}');
    expect(compact).toContain("item.hubPath");
    expect(compact).toContain("shortNavLabel");
    expect(compact).toContain("grid-cols-4");
  });

  it("hub orchestrates existing Four Questions engines", () => {
    expect(hub).toContain("buildFourQuestions");
    expect(hub).toContain("question-hub-conclusion");
    expect(hub).toContain("Deep dive");
    expect(hub).toContain('rel="noopener noreferrer"');
    expect(hub).toContain("resolveIntelligenceScope");
    expect(hub).toContain("QuestionHubBrandBar");
    expect(hub).toContain("hubHero");
  });

  it("Dashboard Explore destinations point at hubs via secondary navigation", () => {
    expect(dashboard).toContain("DashboardSecondaryNav");
    expect(dashboard).not.toContain("FourQuestionsSection");
    expect(read("components/dashboard/DashboardSecondaryNav.tsx")).toContain(
      "WHAT_HAPPENED_HUB_PATH",
    );
    const q1 = read("lib/services/fourQuestions/buildWhatHappened.ts");
    const q2 = read("lib/services/fourQuestions/buildWhatMattersNow.ts");
    const q3 = read("lib/services/fourQuestions/buildAmIOnTrack.ts");
    const q4 = read("lib/services/fourQuestions/buildWhatsAhead.ts");
    expect(q1).toContain('fourQuestionHubPath("what_happened")');
    expect(q2).toContain('fourQuestionHubPath("what_matters_now")');
    expect(q3).toContain('fourQuestionHubPath("am_i_on_track")');
    expect(q4).toContain('fourQuestionHubPath("whats_ahead")');
  });

  it("Analysis keeps section map and adds compact nav without rewrite", () => {
    expect(analysis).toContain("AuthenticatedFourQuestionsNav");
    expect(analysis).toContain("AnalysisFourQuestionsNav");
    expect(analysis).toContain("item={Q1}");
    expect(analysis).toContain("PortfolioPerformanceSection");
    expect(analysis).toContain("ScenarioStressSection");
  });

  it("wires compact nav on major authenticated product pages", () => {
    const pages = [
      "app/news/page.tsx",
      "app/goals/page.tsx",
      "app/portfolio/page.tsx",
      "components/portfolioHistory/PortfolioHistoryPage.tsx",
      "components/companion/CompanionReviewPage.tsx",
      "components/portfolioHealth/PortfolioHealthPage.tsx",
      "components/marketPulse/MarketPulsePage.tsx",
      "components/perspectives/PerspectivesPage.tsx",
      "components/events/EventsPage.tsx",
    ];
    for (const file of pages) {
      expect(read(file), file).toContain("AuthenticatedFourQuestionsNav");
    }
  });
});
