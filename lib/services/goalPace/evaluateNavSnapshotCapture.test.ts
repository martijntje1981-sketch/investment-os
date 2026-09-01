import { describe, expect, it } from "vitest";

import {
  evaluateNavSnapshotWrite,
  isBetterOrEqualCoverage,
  isFresherOrEqualValuedAt,
  navSnapshotUsability,
  resolveCanonicalNavValuation,
} from "@/lib/services/goalPace/evaluateNavSnapshotCapture";
import type {
  CanonicalNavValuation,
  PortfolioNavSnapshot,
} from "@/lib/services/goalPace/types";
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
    priceDataStatus: overrides.priceDataStatus,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
    updatedAt: overrides.updatedAt,
  };
}

function valuation(
  overrides: Partial<CanonicalNavValuation> &
    Pick<CanonicalNavValuation, "navEur" | "portfolioValueAvailable">,
): CanonicalNavValuation {
  return {
    isPartial: false,
    holdingCount: 1,
    valuedHoldingCount: 1,
    excludedHoldingCount: 0,
    valuedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<PortfolioNavSnapshot> = {},
): PortfolioNavSnapshot {
  return {
    id: "snap-1",
    userId: "user-a",
    portfolioId: "port-a",
    snapshotDateIso: "2026-09-01",
    capturedAt: "2026-09-01T08:00:00.000Z",
    navEur: 1000,
    usability: "usable",
    holdingCount: 1,
    valuedHoldingCount: 1,
    excludedHoldingCount: 0,
    valuedAt: "2026-09-01T08:00:00.000Z",
    goalId: "goal-1",
    goalTargetValue: 50000,
    goalTargetYear: 2035,
    goalTargetDateIso: "2035-12-31",
    goalMonthlyContribution: 200,
    goalExpectedAnnualReturn: 7,
    goalUpdatedAt: "2026-08-01T00:00:00.000Z",
    goalPlanCapturedAt: "2026-09-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("resolveCanonicalNavValuation", () => {
  it("uses persisted live prices, not reconstructed EOD history", () => {
    const result = resolveCanonicalNavValuation([
      holding({
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 100,
        marketPriceUpdatedAt: "2026-09-01T10:00:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      navEur: 1000,
      portfolioValueAvailable: true,
      isPartial: false,
      holdingCount: 1,
      valuedHoldingCount: 1,
      excludedHoldingCount: 0,
      valuedAt: "2026-09-01T10:00:00.000Z",
    });
  });

  it("does not treat an unavailable-price zero as a genuine NAV", () => {
    const result = resolveCanonicalNavValuation([
      holding({
        symbol: "UNPRICED",
        quantity: 10,
        currentPrice: 0,
        purchasePrice: 90,
        priceDataStatus: "unavailable",
        marketPriceUpdatedAt: undefined,
      }),
    ]);

    expect(result.portfolioValueAvailable).toBe(false);
    expect(result.navEur).toBe(0);
    expect(result.valuedHoldingCount).toBe(0);
    expect(result.excludedHoldingCount).toBe(1);
    expect(navSnapshotUsability(result)).toBeNull();
    expect(evaluateNavSnapshotWrite({ valuation: result, existing: null })).toEqual({
      action: "skip_unavailable",
    });
  });

  it("allows a cash-only portfolio when canonical cash is available", () => {
    const result = resolveCanonicalNavValuation([
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 2500,
        currentPrice: 1,
        purchasePrice: 1,
        marketPriceUpdatedAt: "2026-09-01T10:00:00.000Z",
      }),
    ]);

    expect(result.portfolioValueAvailable).toBe(true);
    expect(result.isPartial).toBe(false);
    expect(result.navEur).toBe(2500);
    expect(result.excludedHoldingCount).toBe(0);
    expect(navSnapshotUsability(result)).toBe("usable");
  });

  it("marks partial coverage instead of silently treating it as a full NAV", () => {
    const result = resolveCanonicalNavValuation([
      holding({ symbol: "VWCE", quantity: 10, currentPrice: 100 }),
      holding({
        symbol: "UNPRICED",
        id: "unpriced",
        quantity: 5,
        currentPrice: 0,
        purchasePrice: 80,
        priceDataStatus: "unavailable",
      }),
    ]);

    expect(result.portfolioValueAvailable).toBe(true);
    expect(result.isPartial).toBe(true);
    expect(result.navEur).toBe(1000);
    expect(result.valuedHoldingCount).toBe(1);
    expect(result.excludedHoldingCount).toBe(1);
    expect(navSnapshotUsability(result)).toBe("partial");
  });

  it("does not treat estimated purchase-price fallback as NAV", () => {
    const result = resolveCanonicalNavValuation([
      holding({
        symbol: "UNPRICED",
        quantity: 10,
        currentPrice: 0,
        purchasePrice: 100,
        priceDataStatus: "unavailable",
      }),
    ]);
    expect(result.portfolioValueAvailable).toBe(false);
    expect(result.navEur).toBe(0);
    expect(evaluateNavSnapshotWrite({ valuation: result, existing: null })).toEqual({
      action: "skip_unavailable",
    });
  });

  it("stores canonical EUR totals only", () => {
    const result = resolveCanonicalNavValuation([
      holding({ symbol: "VWCE", currency: "EUR", currentPrice: 42.5 }),
    ]);
    expect(result.navEur).toBe(425);
  });
});

describe("evaluateNavSnapshotWrite", () => {
  it("never writes when portfolio value is unavailable", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 0,
          portfolioValueAvailable: false,
          valuedHoldingCount: 0,
          excludedHoldingCount: 1,
        }),
        existing: null,
      }),
    ).toEqual({ action: "skip_unavailable" });
  });

  it("creates the first trustworthy capture of the day", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({ navEur: 1000, portfolioValueAvailable: true }),
        existing: null,
      }),
    ).toEqual({ action: "create", usability: "usable", navEur: 1000 });
  });

  it("keeps an existing snapshot when later coverage is worse", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 800,
          portfolioValueAvailable: true,
          isPartial: true,
          valuedHoldingCount: 1,
          excludedHoldingCount: 1,
          holdingCount: 2,
        }),
        existing: snapshot({
          usability: "usable",
          valuedHoldingCount: 2,
          excludedHoldingCount: 0,
          navEur: 1200,
        }),
      }),
    ).toEqual({ action: "keep" });
  });

  it("improves same-day valuation when coverage is better", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 1200,
          portfolioValueAvailable: true,
          isPartial: false,
          valuedHoldingCount: 2,
          excludedHoldingCount: 0,
          holdingCount: 2,
          valuedAt: "2026-09-01T16:00:00.000Z",
        }),
        existing: snapshot({
          usability: "partial",
          valuedHoldingCount: 1,
          excludedHoldingCount: 1,
          holdingCount: 2,
          navEur: 1000,
        }),
      }),
    ).toEqual({ action: "improve", usability: "usable", navEur: 1200 });
  });

  it("may refresh NAV when coverage is equal and freshness is not older", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 1010,
          portfolioValueAvailable: true,
          valuedAt: "2026-09-01T12:00:00.000Z",
        }),
        existing: snapshot({
          navEur: 1000,
          valuedAt: "2026-09-01T08:00:00.000Z",
        }),
      }),
    ).toEqual({ action: "improve", usability: "usable", navEur: 1010 });
  });

  it("does not replace a fresher equal-coverage snapshot with staler evidence", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 990,
          portfolioValueAvailable: true,
          valuedAt: "2026-09-01T07:00:00.000Z",
        }),
        existing: snapshot({
          navEur: 1000,
          valuedAt: "2026-09-01T08:00:00.000Z",
        }),
      }),
    ).toEqual({ action: "keep" });
  });

  it("keeps the row when NAV, coverage, and freshness are unchanged", () => {
    expect(
      evaluateNavSnapshotWrite({
        valuation: valuation({
          navEur: 1000,
          portfolioValueAvailable: true,
          valuedAt: "2026-09-01T08:00:00.000Z",
        }),
        existing: snapshot({
          navEur: 1000,
          valuedAt: "2026-09-01T08:00:00.000Z",
        }),
      }),
    ).toEqual({ action: "keep" });
  });
});

describe("coverage ranking", () => {
  it("treats usable coverage as better than partial", () => {
    expect(
      isBetterOrEqualCoverage(
        {
          usability: "usable",
          valuedHoldingCount: 1,
          excludedHoldingCount: 0,
        },
        {
          usability: "partial",
          valuedHoldingCount: 2,
          excludedHoldingCount: 1,
        },
      ),
    ).toBe(true);
  });

  it("compares valued_at without inventing timestamps", () => {
    expect(isFresherOrEqualValuedAt(null, "2026-09-01T08:00:00.000Z")).toBe(
      false,
    );
    expect(isFresherOrEqualValuedAt("2026-09-01T09:00:00.000Z", null)).toBe(
      true,
    );
  });
});
