import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  pickTopAndLowestMovers,
  summarizeDailyPerformance,
} from "@/lib/client/dailyPerformance";
import {
  formatMoverPeriodLabel,
  formatMoverSessionDateLabel,
} from "@/lib/client/performancePeriod";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

describe("dashboard phase 1 revamp", () => {
  const dashboardSource = readFileSync(
    path.resolve(process.cwd(), "app/dashboard/page.tsx"),
    "utf8",
  );
  const summarySource = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
    "utf8",
  );
  const valueSource = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );
  const skeletonSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/dashboard/DashboardSummarySkeleton.tsx",
    ),
    "utf8",
  );

  it("no longer renders a separate Dashboard Welcome/PageHero", () => {
    expect(dashboardSource).not.toContain("PageHero");
    expect(dashboardSource).not.toContain("welcome=");
    expect(dashboardSource).not.toContain("Welcome back, ${firstName}");
    expect(summarySource).not.toContain("welcome ?");
    expect(summarySource).not.toContain("PageHero");
  });

  it("places Welcome back inside the Portfolio Value widget", () => {
    expect(valueSource).toContain("Welcome back");
    expect(valueSource).toContain("welcomeFirstName");
    expect(valueSource).toContain("Welcome back, ${welcomeFirstName.trim()}");
    expect(summarySource).toContain("welcomeFirstName");
    expect(dashboardSource).toContain("welcomeFirstName={firstName}");
  });

  it("uses an existing first name prop only when already available", () => {
    expect(dashboardSource).toContain("useAuthenticatedFirstName");
    expect(dashboardSource).not.toMatch(
      /welcomeFirstName[\s\S]{0,80}supabase|from\("profiles"\)/,
    );
    expect(valueSource).not.toContain("supabase");
  });

  it("labels crypto movers with 24h", () => {
    expect(
      formatMoverPeriodLabel(holding({ symbol: "BTC", assetType: "crypto" })),
    ).toBe("24h");
  });

  it("labels exchange-traded movers with known session date", () => {
    expect(formatMoverSessionDateLabel("2026-07-24")).toBe("Fri 24 Jul");
    expect(
      formatMoverPeriodLabel(
        holding({
          symbol: "VWCE",
          marketPriceUpdatedAt: "2026-07-24",
        }),
      ),
    ).toBe("Last session · Fri 24 Jul");
  });

  it("labels exchange-traded movers without a date as Last session", () => {
    expect(formatMoverPeriodLabel(holding({ symbol: "AAPL" }))).toBe(
      "Last session",
    );
  });

  it("never invents a date when metadata is missing", () => {
    expect(formatMoverSessionDateLabel(undefined)).toBeNull();
    expect(formatMoverSessionDateLabel("")).toBeNull();
    expect(formatMoverPeriodLabel(holding({ symbol: "AAPL" }))).not.toMatch(
      /\d{1,2}/,
    );
  });

  it("unmounts the lower duplicate Biggest Winner/Loser section", () => {
    expect(dashboardSource).not.toContain("DashboardMoverCard");
    expect(dashboardSource).not.toContain("Biggest winner");
    expect(dashboardSource).not.toContain("Biggest loser");
  });

  it("keeps portfolio hero movers rendered", () => {
    expect(valueSource).toContain("heroTopMover");
    expect(valueSource).toContain("Top mover");
    expect(valueSource).toContain("Weakest mover");
    expect(valueSource).toContain("changePeriodLabel");

    const movers = pickTopAndLowestMovers(
      summarizeDailyPerformance([
        holding({
          symbol: "VWCE",
          currentPrice: 110,
          previousClose: 100,
          changePercent: 10,
          marketPriceUpdatedAt: "2026-07-24",
        }),
        holding({
          symbol: "BTC",
          assetType: "crypto",
          changePercent: -2,
          change24hPercent: -2,
        }),
      ]),
    );
    expect(movers.topMover?.holding.symbol).toBe("VWCE");
    expect(movers.topMover?.changePeriodLabel).toBe(
      "Last session · Fri 24 Jul",
    );
    expect(movers.lowestMover?.changePeriodLabel).toBe("24h");
  });

  it("keeps Goal Performance, Market Briefing, AI insight and Trading Hours", () => {
    expect(summarySource).toContain("GoalProgressCard");
    expect(dashboardSource).toContain("DashboardIntelligencePreview");
    expect(dashboardSource).toContain("DashboardInsightCard");
    expect(dashboardSource).toContain("DashboardMarketStatus");
    expect(dashboardSource).toContain("HoldingsToday");
    expect(dashboardSource).toContain("DashboardGoalProgressCard");
    expect(dashboardSource).toContain("DashboardDividendCard");
  });

  it("updates the summary skeleton to a compact navy hero without welcome/movers placeholders", () => {
    expect(skeletonSource).toContain("min-h-[220px]");
    expect(skeletonSource).toContain("bg-navy-hero");
    expect(skeletonSource).toContain('data-skeleton="decision-briefing"');
    expect(skeletonSource).toContain('data-skeleton="health-story"');
    expect(skeletonSource).not.toContain("min-h-[96px]");
    expect(skeletonSource).not.toContain("Biggest winner");
  });
});
