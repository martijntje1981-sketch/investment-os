import { describe, expect, it } from "vitest";

import { buildDashboardInsight } from "@/lib/client/dashboardInsight";
import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
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
});
