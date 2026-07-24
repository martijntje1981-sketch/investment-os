import { describe, expect, it } from "vitest";

import { calculatePortfolioPerformance } from "@/lib/client/performance/calculatePortfolioPerformance";
import { mapDbHoldingToStored } from "@/lib/services/portfolio/mappers";
import type { DbHoldingRow } from "@/lib/services/portfolio/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function makeHolding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "id" | "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 110,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    previousClose:
      "previousClose" in overrides ? overrides.previousClose : 105,
    marketPriceUpdatedAt:
      overrides.marketPriceUpdatedAt ?? "2026-07-24T14:00:00.000Z",
  };
}

describe("calculatePortfolioPerformance", () => {
  const asOf = new Date("2026-07-24T16:00:00.000Z");

  it("computes 1D contribution-adjusted return without counting deposits", () => {
    const holdings = [
      makeHolding({ id: "1", symbol: "AAPL", quantity: 10, currentPrice: 110, previousClose: 100 }),
    ];

    const result = calculatePortfolioPerformance(holdings, {
      period: "1D",
      asOf,
    });

    expect(result.calculationMethod).toBe("contribution_adjusted_simple_return");
    expect(result.startingPortfolioValue).toBeCloseTo(1000, 5);
    expect(result.endingPortfolioValue).toBe(1100);
    expect(result.netContributions).toBe(0);
    expect(result.investmentReturn).toBeCloseTo(100, 5);
    expect(result.investmentReturnPercent).toBeCloseTo(10);
    expect(result.chartHasSeries).toBe(true);
    expect(result.chartPoints).toHaveLength(2);
  });

  it("does not fabricate multi-week history when prices are missing", () => {
    const holdings = [makeHolding({ id: "1", symbol: "AAPL" })];

    const result = calculatePortfolioPerformance(holdings, {
      period: "1M",
      asOf,
    });

    expect(result.calculationMethod).toBe("unavailable");
    expect(result.investmentReturn).toBeNull();
    expect(result.chartPoints).toHaveLength(0);
    expect(result.chartHasSeries).toBe(false);
    expect(result.availabilityMessage).toContain(
      "History will build automatically",
    );
  });

  it("uses purchase cost for all-time summary without treating it as a deposit", () => {
    const holdings = [
      makeHolding({
        id: "1",
        symbol: "AAPL",
        quantity: 10,
        purchasePrice: 100,
        currentPrice: 120,
      }),
    ];

    const result = calculatePortfolioPerformance(holdings, {
      period: "ALL",
      asOf,
    });

    expect(result.startingPortfolioValue).toBe(1000);
    expect(result.endingPortfolioValue).toBe(1200);
    expect(result.netContributions).toBeNull();
    expect(result.investmentReturn).toBe(200);
    expect(result.chartHasSeries).toBe(false);
    expect(result.dataAvailability).toBe("summary_only");
  });

  it("excludes partial 1D coverage from full status", () => {
    const holdings = [
      makeHolding({ id: "1", symbol: "AAPL", previousClose: 100 }),
      makeHolding({
        id: "2",
        symbol: "MSFT",
        previousClose: null,
        currentPrice: 50,
        purchasePrice: 40,
      }),
    ];

    const result = calculatePortfolioPerformance(holdings, {
      period: "1D",
      asOf,
    });

    expect(result.dataAvailability).toBe("partial");
    expect(result.availabilityMessage).toBe(
      "Daily performance requires previous-close data.",
    );
    expect(result.chartHasSeries).toBe(false);
  });

  it("does not block 1D chart for purchase-cost-only holdings without previous close", () => {
    const holdings = [
      makeHolding({
        id: "1",
        symbol: "AAPL",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      makeHolding({
        id: "2",
        symbol: "UNPRICED",
        currentPrice: 0,
        previousClose: null,
        purchasePrice: 40,
        quantity: 5,
      }),
    ];

    const result = calculatePortfolioPerformance(holdings, {
      period: "1D",
      asOf,
    });

    expect(result.chartHasSeries).toBe(true);
    expect(result.startingPortfolioValue).toBeCloseTo(1000, 5);
    expect(result.endingPortfolioValue).toBe(1100);
    expect(result.currentPortfolioValue).toBe(1300);
    expect(result.dataAvailability).toBe("full");
  });

  it("renders 1D chart from cloud-hydrated holdings with persisted previousClose and no client cache", () => {
    const cloudRows: DbHoldingRow[] = [
      {
        id: "1",
        portfolio_id: "portfolio-1",
        user_id: "user-1",
        asset_type: "investment",
        symbol: "VWCE",
        name: "VWCE",
        quantity: 10,
        average_cost: 100,
        currency: "EUR",
        sort_order: 0,
        created_at: "2026-07-24T08:00:00.000Z",
        updated_at: "2026-07-24T08:00:00.000Z",
        deleted_at: null,
        last_market_price: 110,
        last_market_price_at: "2026-07-24T14:00:00.000Z",
        previous_close: 100,
      },
      {
        id: "2",
        portfolio_id: "portfolio-1",
        user_id: "user-1",
        asset_type: "cash",
        symbol: "EUR",
        name: "Cash EUR",
        quantity: 1000,
        average_cost: 1,
        currency: "EUR",
        sort_order: 1,
        created_at: "2026-07-24T08:00:00.000Z",
        updated_at: "2026-07-24T08:00:00.000Z",
        deleted_at: null,
        last_market_price: 1,
        last_market_price_at: "2026-07-24T14:00:00.000Z",
        previous_close: null,
      },
    ];

    const holdings = cloudRows.map((row) => mapDbHoldingToStored(row));
    const result = calculatePortfolioPerformance(holdings, {
      period: "1D",
      asOf,
    });

    expect(result.chartHasSeries).toBe(true);
    expect(result.startingPortfolioValue).toBeCloseTo(2000, 5);
    expect(result.endingPortfolioValue).toBe(2100);
    expect(result.dataAvailability).toBe("full");
  });
});
