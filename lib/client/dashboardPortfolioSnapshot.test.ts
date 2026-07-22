import { describe, expect, it } from "vitest";

import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  formatHoldingTodayChange,
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: "investment",
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt ?? "2026-07-20T08:00:00.000Z",
    ...overrides,
    symbol: overrides.symbol,
  };
}

const savedGoal = {
  targetValue: 1_000_000,
  targetYear: 2040,
  monthlyContribution: 500,
  expectedAnnualReturn: 7,
};

describe("buildDashboardPortfolioSnapshot", () => {
  it("shares portfolio totals with the dashboard summary", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({ symbol: "VWCE", currentPrice: 110, previousClose: 100, quantity: 10 }),
        holding({
          symbol: "CASH",
          assetType: "cash",
          currentPrice: 1,
          quantity: 4000,
          purchasePrice: 1,
        }),
      ],
      savedGoal,
      true,
    );

    expect(snapshot.portfolioValue).toBe(5100);
    expect(snapshot.cashValue).toBe(4000);
    expect(snapshot.investedAssetsValue).toBe(1100);
    expect(snapshot.hasSavedGoal).toBe(true);
    expect(snapshot.goalTarget).toBe(1_000_000);
    expect(snapshot.goalTargetYear).toBe(2040);
  });

  it("calculates today totals from previous close, not purchase price", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({
          symbol: "VWCE",
          currentPrice: 110,
          previousClose: 100,
          purchasePrice: 50,
          quantity: 10,
        }),
      ],
      null,
      false,
    );

    expect(snapshot.todayChange).toBeCloseTo(100, 1);
    expect(snapshot.todayPercent).toBeCloseTo(10, 1);
  });

  it("sorts market holdings by current value descending", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({
          symbol: "SMALL",
          currentPrice: 10,
          previousClose: 10,
          quantity: 1,
        }),
        holding({
          symbol: "LARGE",
          currentPrice: 200,
          previousClose: 190,
          quantity: 5,
        }),
      ],
      null,
      false,
    );

    expect(snapshot.marketHoldings.map((row) => row.symbol)).toEqual([
      "LARGE",
      "SMALL",
    ]);
  });

  it("excludes cash from market holdings", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({
          symbol: "VWCE",
          currentPrice: 100,
          previousClose: 99,
          quantity: 1,
        }),
        holding({
          symbol: "EUR",
          assetType: "cash",
          currentPrice: 1,
          quantity: 2500,
          purchasePrice: 1,
        }),
      ],
      null,
      false,
    );

    expect(snapshot.marketHoldings).toHaveLength(1);
    expect(snapshot.marketHoldings[0]?.symbol).toBe("VWCE");
  });

  it("marks change unavailable when previous close is missing", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [holding({ symbol: "VWCE", currentPrice: 110, quantity: 2 })],
      null,
      false,
    );

    expect(snapshot.marketHoldings[0]?.priceStatus).toBe("available");
    expect(snapshot.marketHoldings[0]?.changeStatus).toBe("unavailable");
    expect(snapshot.marketHoldings[0]?.dailyChangeAmount).toBeNull();
  });

  it("marks price unavailable when no usable latest price exists", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({
          symbol: "VWCE",
          currentPrice: 0,
          purchasePrice: 0,
          quantity: 2,
        }),
      ],
      null,
      false,
    );

    expect(snapshot.marketHoldings[0]?.priceStatus).toBe("unavailable");
    expect(snapshot.marketHoldings[0]?.currentValue).toBeNull();
  });

  it("handles crypto using normalized previous-close daily change", () => {
    const snapshot = buildDashboardPortfolioSnapshot(
      [
        holding({
          symbol: "IB1T",
          name: "Bitcoin ETP",
          currentPrice: 100,
          previousClose: 97.6,
          quantity: 100,
        }),
      ],
      null,
      false,
    );

    const row = snapshot.marketHoldings[0];
    expect(row?.dailyChangePercent).toBeCloseTo(2.459, 2);
    expect(row?.dailyChangeAmount).toBeCloseTo(240, 0);
  });

  it("reports missing goal state without inventing defaults", () => {
    const snapshot = buildDashboardPortfolioSnapshot([], null, false);

    expect(snapshot.hasSavedGoal).toBe(false);
    expect(snapshot.goalTarget).toBeNull();
    expect(snapshot.goalTargetYear).toBeNull();
    expect(snapshot.goalProgress).toBe(0);
  });

  it("does not perform provider calls during preparation", () => {
    expect(typeof buildDashboardPortfolioSnapshot).toBe("function");
    expect(buildDashboardPortfolioSnapshot([], null, false).marketHoldings).toEqual([]);
  });
});

describe("portfolioMovementFormat", () => {
  it("formats positive, negative and neutral signed values", () => {
    expect(formatSignedPortfolioCurrency(148)).toBe("+€148");
    expect(formatSignedPortfolioCurrency(-92)).toBe("−€92");
    expect(formatSignedPortfolioPercent(2.4)).toBe("+2.4%");
    expect(formatSignedPortfolioPercent(-1.1)).toBe("−1.1%");
    expect(formatHoldingTodayChange(0, 0)).toBe("€0 · 0.0%");
  });

  it("returns change unavailable when movement data is missing", () => {
    expect(formatHoldingTodayChange(null, null)).toBe("Change unavailable");
  });
});
