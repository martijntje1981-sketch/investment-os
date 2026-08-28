import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Calm Core UX — Dashboard and Portfolio", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const holdings = read("components/dashboard/HoldingsToday.tsx");
  const holdingsRow = read("components/dashboard/HoldingsTodayRow.tsx");
  const context = read("lib/client/holdingsTodayContext.ts");
  const portfolio = read("app/portfolio/page.tsx");

  it("keeps hero then Your Holdings Today then at most one intelligence block", () => {
    const order = [
      "<DashboardSummary",
      "<HoldingsToday",
      "<DashboardPersonalIntelligence",
      "<DashboardSecondaryNav",
    ].map((token) => dashboard.indexOf(token));

    for (let i = 0; i < order.length; i += 1) {
      expect(order[i], `missing token ${i}`).toBeGreaterThan(-1);
      if (i > 0) expect(order[i]).toBeGreaterThan(order[i - 1]!);
    }

    expect(dashboard).not.toContain("<FourQuestionsSection");
    expect(dashboard).not.toContain("<NewAndNotableSection");
    expect(dashboard).not.toContain("<LookingAheadSection");
    expect(dashboard).not.toContain("<DashboardPortfolioEvolutionCard");
    expect(dashboard).not.toContain("<DashboardMarketPulseCard");
    expect(dashboard).not.toContain("<DashboardCashIntelligenceCard");
    expect(dashboard).not.toContain("<DashboardExploreTools");
    expect(dashboard).not.toContain("<AuthenticatedFourQuestionsNav");
    expect(holdings).toContain("Your holdings today");
  });

  it("pairs holdings today from canonical snapshot prices and existing news matching", () => {
    expect(context).toContain("buildHoldingIntelligenceCandidates");
    expect(context).toContain("buildNewsHubHoldingRow");
    expect(context).toContain("HOLDINGS_TODAY_NO_NEWS");
    expect(context).not.toContain("NEWS_HUB_HOLDING_LIMIT");
    expect(holdings).toContain("buildHoldingsTodayNewsById");
    expect(holdingsRow).toContain("holdings-today-news-link");
    expect(holdingsRow).toContain('target="_blank"');
    expect(holdingsRow).toContain("news.href");
    expect(context).toContain("canonicalUrl");
    expect(holdingsRow).toContain("holdingDetailPath");
    expect(holdings).toContain("HOLDINGS_TODAY_COLLAPSE_AFTER");
    expect(holdings).not.toContain("useCollapsedListLimit");
  });

  it("keeps Dashboard Explore destinations as compact tappable tiles", () => {
    const nav = read("components/dashboard/DashboardSecondaryNav.tsx");
    expect(nav).toContain("Explore Tobailey");
    expect(nav).toContain("Analysis");
    expect(nav).toContain("News");
    expect(nav).toContain("Goals");
    expect(nav).toContain("Reports");
    expect(nav).toContain("WHAT_HAPPENED_HUB_PATH");
    expect(nav).toContain("REVIEW_PATH");
    expect(nav).toContain("DASHBOARD_DEEP_LINKS.scorecard");
  });

  it("structures Portfolio as glance, holdings, then activity", () => {
    expect(portfolio).toContain('data-testid="portfolio-at-a-glance"');
    expect(portfolio).toContain('data-testid="portfolio-activity"');
    expect(portfolio).toContain("PortfolioHistoryNavCard");
    expect(portfolio).toContain("PortfolioFundingSection");
    expect(portfolio).toContain("PortfolioHeroAddMenu");
    expect(portfolio).toContain("openAdd");
    expect(portfolio).toContain("Find listing");

    const glanceIdx = portfolio.indexOf('data-testid="portfolio-at-a-glance"');
    const holdingsIdx = portfolio.indexOf(">Holdings</h2>");
    const activityIdx = portfolio.indexOf('data-testid="portfolio-activity"');
    const relatedIdx = portfolio.indexOf("<PageRelatedLinks");
    const fundingIdx = portfolio.indexOf("<PortfolioFundingSection");

    expect(glanceIdx).toBeGreaterThan(-1);
    expect(holdingsIdx).toBeGreaterThan(glanceIdx);
    expect(activityIdx).toBeGreaterThan(holdingsIdx);
    expect(relatedIdx).toBeGreaterThan(activityIdx);
    expect(fundingIdx).toBeGreaterThan(relatedIdx);
    expect(portfolio).not.toContain("Largest position");
    expect(portfolio).not.toContain("is your largest position");
    expect(portfolio).not.toContain("<PortfolioAllocationNavCard");
  });

  it("does not add a portfolio write path on Dashboard or Portfolio view", () => {
    expect(dashboard).not.toContain("saveHoldings(");
    expect(dashboard).toContain("useLivePortfolioPriceRefresh");
    expect(portfolio).toContain("saveHoldings((current) =>");
    expect(portfolio).toContain("current.filter((item) => item.id !== holding.id)");
  });
});
