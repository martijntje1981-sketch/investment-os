import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Priority 2 Dashboard progressive disclosure", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const hero = read("components/dashboard/PortfolioValueCard.tsx");
  const briefingUi = read("components/dashboard/DailyPortfolioBriefing.tsx");
  const marketBriefing = read(
    "components/dashboard/DashboardTodaysMarketBriefing.tsx",
  );
  const expandable = read(
    "components/dashboard/ExpandableDashboardSection.tsx",
  );
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const explore = read("components/dashboard/DashboardExploreTools.tsx");
  const limits = read("lib/client/useCollapsedListLimit.ts");
  const expandPref = read("lib/client/useDashboardSectionExpanded.ts");

  it("keeps conclusion-first Dashboard section order", () => {
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
  });

  it("integrates the Daily Portfolio Briefing inside the hero", () => {
    expect(hero).toContain("DailyPortfolioBriefing");
    expect(hero).toContain("smart.briefing");
    expect(dashboard).toContain("buildSmartDashboardIntelligence");
    expect(briefingUi).toContain('data-testid="daily-portfolio-briefing"');
    expect(dashboard).not.toContain("<DailyPortfolioBriefing");
    expect(dashboard).not.toContain("DashboardPortfolioPulseCard");
    expect(dashboard).not.toContain("DashboardMoverCard");
    expect(dashboard).not.toContain("DashboardTodaysDecision");
    expect(dashboard).not.toContain("DashboardDividendCard");
    expect(dashboard).not.toContain("DashboardAnalystCard");
    expect(dashboard).not.toContain("DashboardUpcomingEventsWidget");
  });

  it("keeps Market Briefing module available for Explore destinations", () => {
    expect(marketBriefing).toContain("mustWatch");
    expect(marketBriefing).toContain("leadTitle");
    expect(marketBriefing).not.toContain("Portfolio context");
    expect(marketBriefing).toContain("Markets today");
  });

  it("provides a shared expandable section pattern with accessibility", () => {
    expect(expandable).toContain("aria-expanded");
    expect(expandable).toContain("aria-controls");
    expect(expandable).toContain('type="button"');
    expect(expandable).toContain("Show more");
    expect(expandable).toContain("Show less");
    expect(expandable).toContain("deepLink");
  });

  it("defaults holdings to compact mobile/desktop preview limits", () => {
    expect(limits).toContain("HOLDINGS_COLLAPSE_MOBILE_LIMIT");
    expect(limits).toContain("HOLDINGS_COLLAPSE_DESKTOP_LIMIT");
    expect(limits).toContain("MOBILE_LIMIT = 2");
    expect(limits).toContain("DESKTOP_LIMIT = 3");
    expect(holdings).toContain("useCollapsedListLimit");
    expect(holdings).toContain("useExpandedListLimit");
    expect(holdings).toContain("View portfolio");
    expect(holdings).toContain("View all holdings");
    expect(holdings).toContain('aria-expanded={expanded}');
    expect(holdings).not.toContain("min-w-[720px]");
  });

  it("persists disclosure preference locally with a namespaced key", () => {
    expect(expandPref).toContain(
      "tobailey-dashboard-section-expanded:v1:",
    );
    expect(expandPref).toContain("localStorage");
    expect(expandPref).toContain("useEffect");
  });

  it("keeps Understand strip quiet with mobile rows and desktop cards", () => {
    expect(explore).toContain("Analysis");
    expect(explore).toContain("Goals");
    expect(explore).toContain("Portfolio Scorecard");
    expect(explore).toContain("explore-tools-mobile");
    expect(explore).toContain("explore-tools-desktop");
    expect(explore).toContain("ArrowUpRight");
    expect(explore).not.toContain("Explore Demo Portfolio");
    const toolCount = (explore.match(/title: "/g) ?? []).length;
    expect(toolCount).toBeLessThanOrEqual(3);
  });

  it("hides Trading Hours on mobile and removes duplicate Related navigation", () => {
    expect(dashboard).not.toContain("PageRelatedLinks");
    expect(dashboard).toContain("DashboardMarketStatus");
    const marketStatus = read("components/dashboard/DashboardMarketStatus.tsx");
    expect(marketStatus).toContain("hidden md:block");
    expect(marketStatus).toContain("resolveMarketUpdateDisplay");
  });

  it("preserves Priority 1 hero pulse wiring and app-entry refresh import surface", () => {
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).toContain("useLivePortfolioPriceRefresh");
    expect(hero).toContain("HeroPortfolioPulse");
    expect(hero).toContain("appHeroShellClass");
  });
});
