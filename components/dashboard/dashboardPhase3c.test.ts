import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 3C Smart Dashboard Intelligence wiring", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const briefingUi = read("components/dashboard/DailyPortfolioBriefing.tsx");
  const marketBriefing = read(
    "components/dashboard/DashboardTodaysMarketBriefing.tsx",
  );
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const explore = read("components/dashboard/DashboardExploreTools.tsx");
  const smart = read("lib/client/smartDashboardIntelligence.ts");

  it("keeps conclusion-first Dashboard section order without remounting Goal Progress card", () => {
    const order = [
      "<DashboardSummary",
      "<FourQuestionsSection",
      "<HoldingsToday",
      "<DashboardMarketPulseCard",
      "<DashboardPerspectivesWidget",
      "<DashboardCashIntelligenceCard",
      "<DashboardPortfolioHistorySection",
      "<DashboardPortfolioExposureCard",
      "<DashboardContributionsCard",
      "<DashboardExploreTools",
      "<DashboardMarketStatus",
    ].map((token) => dashboard.indexOf(token));

    for (let i = 0; i < order.length; i += 1) {
      expect(order[i], `missing section token at ${i}`).toBeGreaterThan(-1);
      if (i > 0) {
        expect(order[i]).toBeGreaterThan(order[i - 1]!);
      }
    }

    expect(dashboard).not.toContain("DashboardGoalProgressCard");
    expect(dashboard).not.toContain("DashboardTodaysDecision");
    expect(dashboard).not.toContain("DashboardDividendCard");
    expect(dashboard).not.toContain("<DailyPortfolioBriefing");
  });

  it("builds Smart Hero once on the page and reuses it in the hero", () => {
    expect(dashboard).toContain("buildSmartDashboardIntelligence");
    expect(dashboard).toContain("smart={smartDashboard}");
    expect(hero).toContain("smart.briefing");
    expect(hero).toContain("smart.todaysFocus");
    expect(hero).toContain("todaysFocus={null}");
    expect(hero).not.toContain("buildDailyPortfolioBriefing");
    expect(hero).not.toContain("deriveBriefingMarketTopic");
  });

  it("wires Today's Focus into the hero without a new section", () => {
    expect(briefingUi).toContain('data-testid="todays-focus"');
    expect(briefingUi).toContain("Today’s focus");
    expect(smart).toContain("resolveTodaysFocus");
    expect(dashboard).not.toContain("Today’s Focus");
  });

  it("keeps Market Briefing market-context and dedupes hero wording", () => {
    expect(marketBriefing).toContain("heroBriefingText");
    expect(marketBriefing).toContain("heroAndMarketShareDuplicateSentence");
    expect(marketBriefing).not.toContain(
      "The most important broader market development",
    );
    expect(marketBriefing).toContain("Markets today");
  });

  it("applies emphasis without reordering sections", () => {
    expect(dashboard).toContain("emphasisNote={smartDashboard.emphasis.historyNote}");
    expect(dashboard).toContain(
      "emphasizeGoals={smartDashboard.emphasis.exploreGoalsHighlight}",
    );
    expect(explore).toContain("emphasizeGoals");
    expect(hero).toContain("data-hero-emphasis");
  });

  it("keeps holdings mobile-friendly without denser information", () => {
    expect(holdings).toContain("min-h-[44px]");
    expect(holdings).toContain("useCollapsedListLimit");
    expect(holdings).not.toContain("min-w-[720px]");
    expect(holdings).not.toMatch(/overflow-x-(auto|scroll)/);
  });

  it("does not add paid APIs or duplicate timeline builders on the page", () => {
    expect(dashboard).not.toContain("buildPortfolioTimeline");
    expect(dashboard).toContain("usePortfolioPerformanceHistory");
    expect(dashboard).toContain("useGoalProgress");
    expect(smart).not.toMatch(/\bfetch\(/);
  });
});
