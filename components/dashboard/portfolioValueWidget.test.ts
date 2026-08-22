import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatPortfolioMovePeriodContextLine,
  resolvePortfolioMovePeriod,
} from "@/lib/client/performancePeriod";
import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
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

describe("dashboard portfolio value widget", () => {
  it("keeps PortfolioValueCard as the summary heart with movers and refresh wiring", () => {
    const summarySource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
      "utf8",
    );
    const valueSource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );
    const dashboardSource = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );

    expect(summarySource).toContain("PortfolioValueCard");
    expect(summarySource).not.toContain("TodayCard");
    expect(summarySource).not.toContain("DashboardHeroMovers");
    expect(summarySource).not.toContain("welcome ?");
    expect(valueSource).toContain("Latest move");
    expect(valueSource).toContain("dailyMoveContextLine");
    expect(valueSource).toContain("Biggest mover");
    expect(valueSource).toContain("Weakest mover");
    expect(valueSource).not.toContain("Lowest mover");
    expect(valueSource).toContain("DailyPortfolioBriefing");
    expect(valueSource).toContain("RefreshPricesButton");
    expect(valueSource).toContain("formatEur");
    expect(dashboardSource).toContain("DashboardSummary");
    expect(dashboardSource).not.toContain("PageHero");
    expect(dashboardSource).not.toContain("DashboardMoverCard");
  });

  it("exposes composition-aware period context lines", () => {
    expect(
      formatPortfolioMovePeriodContextLine(
        resolvePortfolioMovePeriod([
          holding({
            symbol: "VWCE",
            marketPriceUpdatedAt: "2026-07-24",
          }),
          holding({ symbol: "BTC", assetType: "crypto" }),
        ]),
      ),
    ).toBe("Previous close for listed holdings · Crypto: 24h");

    expect(
      formatPortfolioMovePeriodContextLine(
        resolvePortfolioMovePeriod([
          holding({ symbol: "BTC", assetType: "crypto" }),
        ]),
      ),
    ).toBe("Based on the last 24 hours");

    expect(
      formatPortfolioMovePeriodContextLine(
        resolvePortfolioMovePeriod([
          holding({
            symbol: "VWCE",
            marketPriceUpdatedAt: "2026-07-24",
          }),
        ]),
      ),
    ).toBe("Based on Friday's market close");

    expect(
      formatPortfolioMovePeriodContextLine(
        resolvePortfolioMovePeriod([
          holding({ symbol: "EUR", assetType: "cash" }),
        ]),
      ),
    ).toBe("Movement period unavailable");
  });

  it("builds dashboard summary context for mixed and zero-move states", () => {
    const mixed = buildDashboardSummary(
      [
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
          change24hPercent: 2,
          changePercent: 2,
        }),
      ],
      null,
      false,
    );
    expect(mixed.dailyMoveContextLine).toBe(
      "Previous close for listed holdings · Crypto: 24h",
    );
    expect(mixed.dailyMoveHeroLabel).toBe("Latest portfolio move");

    const flat = buildDashboardSummary(
      [
        holding({
          symbol: "VWCE",
          currentPrice: 100,
          previousClose: 100,
          changePercent: 0,
          marketPriceUpdatedAt: "2026-07-24",
        }),
      ],
      null,
      false,
    );
    expect(flat.hasDailyData).toBe(true);
    expect(flat.todayChange).toBe(0);
    expect(flat.dailyMoveContextLine).toMatch(/market close|Previous close/i);
  });

  it("uses matched KPI typography for portfolio value and latest move", () => {
    const valueSource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );
    expect(valueSource).toContain("appHeroMatchedKpiClass");
    expect(valueSource).toContain("appDashboardHeroMetricLabelClass");
    expect(valueSource).toContain("appHeroPaddingCompactClass");
    expect(valueSource).toContain("appDisplayClass");
    expect(valueSource).toContain("tabular-nums");
    expect(valueSource).toContain("grid-cols-2");
    expect(valueSource).toContain('variant="icon"');
    expect(valueSource).not.toContain("text-[2.625rem]");
    expect(valueSource).not.toContain("lg:text-[4.25rem]");
  });
});
