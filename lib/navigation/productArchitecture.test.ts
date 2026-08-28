import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  APP_ARCHITECTURE_GROUPS,
  flattenArchitectureLinks,
  PAGE_PURPOSE,
} from "@/lib/navigation/productArchitecture";
import {
  DISCOVER_DESTINATIONS,
  NEWS_MARKETS_TODAY_HREF,
} from "@/lib/navigation/discoverDestinations";
import {
  GOALS_PATH,
  PORTFOLIO_HEALTH_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("product architecture cohesion", () => {
  it("groups More destinations into a clear mental model without duplicate hrefs", () => {
    const titles = APP_ARCHITECTURE_GROUPS.map((group) => group.title);
    expect(titles).toEqual([
      "Today",
      "My portfolio",
      "Understand",
      "Markets",
      "Resources",
    ]);

    const hrefs = flattenArchitectureLinks().map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain(REVIEW_PATH);
    expect(hrefs).toContain(GOALS_PATH);
    expect(hrefs).toContain(PORTFOLIO_HEALTH_PATH);
    expect(hrefs).toContain(NEWS_MARKETS_TODAY_HREF);

    const scorecard = flattenArchitectureLinks().find(
      (link) => link.href === PORTFOLIO_HEALTH_PATH,
    );
    expect(scorecard?.label).toBe("Portfolio Scorecard");
  });

  it("keeps page purpose one-liners stable for Related strips", () => {
    expect(PAGE_PURPOSE.dashboard).toMatch(/today/i);
    expect(PAGE_PURPOSE.analysis).toMatch(/four questions/i);
    expect(PAGE_PURPOSE.review).toMatch(/week|month|today/i);
  });

  it("wires More menu and profile menu to the architecture groups", () => {
    const bottom = read("components/home/BottomNav.tsx");
    const menu = read("components/auth/UserMenu.tsx");

    expect(bottom).toContain("APP_ARCHITECTURE_GROUPS");
    expect(bottom).toContain("Find the right place in Tobailey");
    expect(bottom).not.toContain("moreWorkspaceLinks");
    expect(menu).toContain('title="Today"');
    expect(menu).toContain('title="My portfolio"');
    expect(menu).toContain('title="Understand"');
    expect(menu).toContain('title="Markets"');
    expect(menu).toContain('title="Resources"');
    expect(menu).toContain("Explore");
  });

  it("adds Related connections on key pages without Dashboard duplication", () => {
    expect(read("components/layout/PageRelatedLinks.tsx")).toContain(
      "page-related-links",
    );
    expect(read("app/dashboard/page.tsx")).not.toContain("PageRelatedLinks");
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      "PageRelatedLinks",
    );
    expect(read("components/portfolioHistory/PortfolioHistoryPage.tsx")).toContain(
      "PageRelatedLinks",
    );
    expect(read("app/goals/page.tsx")).toContain("PageRelatedLinks");
    expect(read("components/perspectives/PerspectivesPage.tsx")).toContain(
      "Open News",
    );
  });

  it("standardises Scorecard and Ideas terminology on primary surfaces", () => {
    const explore = read("components/dashboard/DashboardExploreTools.tsx");
    const portfolio = read("app/portfolio/page.tsx");
    const destinations = DISCOVER_DESTINATIONS.map((item) => item.label);

    expect(explore).toContain("Portfolio Scorecard");
    expect(explore).not.toContain("Portfolio Health");
    expect(explore).toContain("Understand your portfolio");
    expect(portfolio).toContain("Scorecard");
    expect(destinations).toContain("Ideas");
    expect(destinations).not.toContain("Discover");
  });

  it("keeps Dashboard history preview chart behind expand", () => {
    const historyCard = read(
      "components/portfolioHistory/PortfolioHistoryNavCard.tsx",
    );
    expect(historyCard).toContain("expandedContent=");
    expect(historyCard).toContain(
      "Full charts and timeline live on Portfolio History",
    );
    const expandedAt = historyCard.indexOf("expandedContent=");
    const chartInExpanded = historyCard.indexOf(
      "<PortfolioPerformanceChart",
      expandedAt,
    );
    expect(chartInExpanded).toBeGreaterThan(expandedAt);
  });
});
