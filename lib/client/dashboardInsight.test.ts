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
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol" | "name">,
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
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          currentPrice: 110,
        }),
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
    expect(emptyInsight.toLowerCase()).toMatch(/manual|import|spreadsheet/);
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
    expect(RANKING_AFTER_CLOSE).toContain("movers");
    expect(RANKING_AFTER_CLOSE.toLowerCase()).toContain("available");
  });
});

describe("home and dashboard hierarchy", () => {
  it("leads the dashboard with summary, decision, intelligence preview, then holdings", async () => {
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
    const preview = readFileSync(
      resolve(
        process.cwd(),
        "components/dashboard/DashboardTodaysMarketBriefing.tsx",
      ),
      "utf8",
    );

    expect(dashboard.indexOf("<DashboardSummary")).toBeLessThan(
      dashboard.indexOf("<DashboardPortfolioPulseCard"),
    );
    expect(dashboard.indexOf("<DashboardPortfolioPulseCard")).toBeLessThan(
      dashboard.indexOf("<HoldingsToday"),
    );
    expect(dashboard.indexOf("<HoldingsToday")).toBeLessThan(
      dashboard.indexOf("<DashboardTodaysMarketBriefing"),
    );
    expect(dashboard).not.toContain("DashboardQuickActions");
    expect(dashboard).not.toContain("PortfolioIntelligencePanel");
    expect(dashboard).not.toContain("DashboardPortfolioOverview");
    expect(dashboard).not.toContain("BottomNavigation");
    expect(dashboard).toContain("buildPortfolioPulse");
    expect(dashboard).not.toContain("DashboardInsightCard");
    expect(dashboard).toContain("DashboardPortfolioPulseCard");
    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(summary).toContain("PortfolioValueCard");
    expect(summary).not.toContain("GoalProgressCard");
    expect(summary).not.toContain("TodayCard");
    expect(holdingsToday).toContain("Your holdings");
    expect(holdingsToday).not.toContain("Your holdings today");
    expect(holdingsToday).toContain("md:hidden");
    expect(holdingsToday).toContain("hidden md:block");
    expect(preview).not.toContain("Also worth noting");
    expect(preview).toContain("Today’s market briefing");
  });

  it("redirects authenticated users away from the marketing home route", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const homePage = readFileSync(
      resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );

    expect(homePage).toContain('redirect("/dashboard")');
    expect(homePage).not.toContain("AuthenticatedHomePage");
  });

  it("keeps evidence-based portfolio insight available for future use", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const insightCard = readFileSync(
      resolve(process.cwd(), "components/dashboard/DashboardInsightCard.tsx"),
      "utf8",
    );

    expect(insightCard).toContain("insight.headline");
    expect(insightCard).toContain("insight.scoreLines");
    expect(insightCard).toContain("Open Portfolio Health");
  });
});
