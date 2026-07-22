import { describe, expect, it } from "vitest";

import {
  buildDashboardInsight,
  buildDashboardInsightSections,
} from "@/lib/client/dashboardInsight";
import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
import {
  DAILY_PERFORMANCE_AFTER_CLOSE,
  formatTodayMoveDetail,
  formatTodayMoveValue,
  RANKING_AFTER_CLOSE,
} from "@/lib/client/investorOverviewCopy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  const { symbol, name, ...rest } = overrides;
  return {
    id: `${symbol}-id`,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    changePercent: 2,
    previousClose: 107.8,
    updatedAt: "2026-07-20T08:00:00.000Z",
    ...rest,
    symbol,
    name,
  };
}

describe("dashboardSummary", () => {
  it("builds portfolio performance metrics from saved holdings", () => {
    const summary = buildDashboardSummary(
      [
        holding({ symbol: "VWCE", name: "Vanguard FTSE All-World", currentPrice: 110 }),
        holding({
          symbol: "IB1T",
          name: "Bitcoin",
          currentPrice: 90,
          previousClose: 92.8,
          changePercent: -3,
        }),
      ],
      {
        targetValue: 100_000,
        targetYear: 2036,
        monthlyContribution: 500,
        expectedAnnualReturn: 8,
      },
      true,
    );

    expect(summary.portfolioValue).toBeGreaterThan(0);
    expect(summary.hasDailyData).toBe(true);
    expect(summary.hasSavedGoal).toBe(true);
    expect(summary.goalTarget).toBe(100_000);
  });
});

describe("dashboardInsight", () => {
  it("stays within 80 words and avoids empty-portfolio hallucination", () => {
    const emptyInsight = buildDashboardInsight(
      buildDashboardSummary([], null, false),
    );
    expect(emptyInsight.toLowerCase()).toContain("upload");
    expect(emptyInsight.split(/\s+/).length).toBeLessThanOrEqual(80);

    const liveInsight = buildDashboardInsight(
      buildDashboardSummary(
        [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })],
        null,
        false,
      ),
    );
    expect(liveInsight.split(/\s+/).length).toBeLessThanOrEqual(80);
    expect(liveInsight.toLowerCase()).toContain("conclusion");
  });

  it("returns concise insight sections for the dashboard card", () => {
    const sections = buildDashboardInsightSections(
      buildDashboardSummary(
        [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })],
        null,
        false,
      ),
    );

    expect(sections.mainRisk.length).toBeGreaterThan(0);
    expect(sections.mainOpportunity.length).toBeGreaterThan(0);
    expect(sections.recommendation.length).toBeGreaterThan(0);
  });
});

describe("investor overview copy", () => {
  it("uses friendly after-close messaging instead of technical labels", () => {
    expect(
      formatTodayMoveValue({
        hasDailyData: false,
        performanceCoverageComplete: false,
        formatValue: () => "+€100",
      }),
    ).toBe("—");
    expect(
      formatTodayMoveDetail({
        hasDailyData: false,
        performanceCoverageComplete: false,
        formatPercent: () => "+1.2%",
      }),
    ).toBe(DAILY_PERFORMANCE_AFTER_CLOSE);
    expect(RANKING_AFTER_CLOSE).toContain("ranking");
    expect(RANKING_AFTER_CLOSE).toContain("after market close");
  });
});

describe("home and dashboard hierarchy", () => {
  it("leads the dashboard with portfolio summary before intelligence", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const dashboard = readFileSync(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const summary = readFileSync(
      resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
      "utf8",
    );
    const holdingsToday = readFileSync(
      resolve(process.cwd(), "components/dashboard/HoldingsToday.tsx"),
      "utf8",
    );

    expect(dashboard.indexOf("<DashboardSummary")).toBeLessThan(
      dashboard.indexOf("<DashboardIntelligenceSummary"),
    );
    expect(dashboard.indexOf("<HoldingsToday")).toBeLessThan(
      dashboard.indexOf("<DashboardIntelligenceSummary"),
    );
    expect(dashboard).not.toContain("DashboardQuickActions");
    expect(dashboard).not.toContain("PortfolioIntelligencePanel");
    expect(dashboard).not.toContain("DashboardPortfolioOverview");
    expect(dashboard).not.toContain("BottomNavigation");
    expect(dashboard).toContain("buildDashboardInsightSections");
    expect(summary).toContain("PortfolioValueCard");
    expect(summary).toContain("TodayCard");
    expect(summary).toContain("GoalProgressCard");
    expect(holdingsToday).toContain("Your holdings today");
    expect(holdingsToday).toContain("md:hidden");
    expect(holdingsToday).toContain("hidden md:block");
  });

  it("presents home as a daily portfolio overview without duplicate navigation", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const home = readFileSync(
      resolve(process.cwd(), "components/home/AuthenticatedHomePage.tsx"),
      "utf8",
    );
    const snapshot = readFileSync(
      resolve(process.cwd(), "components/home/PortfolioSnapshot.tsx"),
      "utf8",
    );
    const intelligence = readFileSync(
      resolve(process.cwd(), "components/dashboard/DashboardIntelligenceSummary.tsx"),
      "utf8",
    );

    expect(home).toContain("Your portfolio today");
    expect(home).not.toContain("Latest News");
    expect(home).not.toContain("BottomNavigation");
    expect(home).toContain("readNewsCache");
    expect(home).toContain("HomeIntelligenceSummary");
    expect(home).toContain("TodaysDecisionBlock");
    expect(snapshot).toContain("Total portfolio value");
    expect(snapshot).toContain("Today&apos;s %");
    expect(snapshot).not.toContain("Awaiting data");
    expect(snapshot).toContain("RANKING_AFTER_CLOSE");
    expect(intelligence).toContain("slice(0, 3)");
    expect(intelligence).toContain("TodaysDecisionBlock");
    expect(intelligence).not.toContain("Portfolio impact");
    expect(intelligence).not.toContain("Must watch");
  });

  it("uses concise AI insight blocks on the dashboard", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const insightCard = readFileSync(
      resolve(process.cwd(), "components/dashboard/DashboardInsightCard.tsx"),
      "utf8",
    );

    expect(insightCard).toContain("Main risk");
    expect(insightCard).toContain("Main opportunity");
    expect(insightCard).toContain("Current conclusion");
  });
});
