import { beforeEach, describe, expect, it } from "vitest";

import { applyRemoteSnapshotToLocalCache } from "@/lib/client/portfolioSyncState";
import {
  buildPortfolioPerformance,
  isValidMarketPrice,
  mergeRemoteMarketPrice,
} from "@/lib/client/portfolioPerformance";
import {
  mapDbHoldingToStored,
  resolveStoredMarketPrice,
} from "@/lib/services/portfolio/mappers";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { DbHoldingRow } from "@/lib/services/portfolio/types";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "holding-1",
    symbol: "TESTSYNC",
    name: "Staging Sync Test",
    quantity: 7,
    purchasePrice: 100,
    currentPrice: 120,
    currency: "EUR",
    assetType: "investment",
    marketPriceUpdatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function dbRow(
  overrides: Partial<DbHoldingRow> = {},
): DbHoldingRow {
  return {
    id: "holding-1",
    portfolio_id: "portfolio-1",
    user_id: USER_ID,
    asset_type: "investment",
    symbol: "TESTSYNC",
    name: "Staging Sync Test",
    quantity: 7,
    average_cost: 100,
    currency: "EUR",
    sort_order: 0,
    created_at: "2026-07-20T09:00:00.000Z",
    updated_at: "2026-07-20T09:00:00.000Z",
    deleted_at: null,
    last_market_price: 120,
    last_market_price_at: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("portfolio market price helpers", () => {
  it("treats zero and missing prices as invalid", () => {
    expect(isValidMarketPrice(0)).toBe(false);
    expect(isValidMarketPrice(-1)).toBe(false);
    expect(isValidMarketPrice(Number.NaN)).toBe(false);
    expect(isValidMarketPrice(120)).toBe(true);
  });

  it("loads persisted last market price from Supabase rows", () => {
    expect(resolveStoredMarketPrice(dbRow())).toBe(120);
    expect(
      resolveStoredMarketPrice(
        dbRow({ last_market_price: null, asset_type: "investment" }),
      ),
    ).toBe(0);
    expect(
      mapDbHoldingToStored(dbRow()).currentPrice,
    ).toBe(120);
    expect(mapDbHoldingToStored(dbRow()).marketPriceUpdatedAt).toBe(
      "2026-07-20T10:00:00.000Z",
    );
  });

  it("prefers remote cached price over stale local zero", () => {
    const merged = mergeRemoteMarketPrice(
      holding({ currentPrice: 120 }),
      0,
    );
    expect(merged).toBe(120);
  });

  it("falls back to local cached price when remote price is missing", () => {
    const merged = mergeRemoteMarketPrice(
      holding({ currentPrice: 0 }),
      125,
    );
    expect(merged).toBe(125);
  });

  it("does not show false -100% loss when no usable price exists", () => {
    const performance = buildPortfolioPerformance([
      holding({ currentPrice: 0, purchasePrice: 0 }),
    ]);

    expect(performance.totalValue).toBe(0);
    expect(performance.investedCapital).toBe(0);
    expect(performance.totalReturn).toBe(0);
    expect(performance.canShowPerformance).toBe(false);
    expect(performance.hasUnvaluedInvestments).toBe(true);
  });

  it("uses estimated purchase price in performance totals when live price is missing", () => {
    const performance = buildPortfolioPerformance([
      holding({ currentPrice: 0, purchasePrice: 100 }),
    ]);

    expect(performance.totalValue).toBe(700);
    expect(performance.investedCapital).toBe(700);
    expect(performance.totalReturn).toBe(0);
    expect(performance.canShowPerformance).toBe(true);
  });

  it("shows correct gain when last known price is restored after sync", () => {
    const performance = buildPortfolioPerformance([holding()]);

    expect(performance.totalValue).toBe(840);
    expect(performance.investedCapital).toBe(700);
    expect(performance.totalReturn).toBe(140);
    expect(performance.totalReturnPercent).toBeCloseTo(20, 5);
    expect(performance.canShowPerformance).toBe(true);
  });

  it("excludes holdings without any usable price from performance totals", () => {
    const performance = buildPortfolioPerformance([
      holding({ symbol: "VWCE", currentPrice: 110, quantity: 10 }),
      holding({
        symbol: "MISSING",
        currentPrice: 0,
        purchasePrice: 0,
        quantity: 5,
      }),
    ]);

    expect(performance.totalValue).toBe(1100);
    expect(performance.investedCapital).toBe(1000);
    expect(performance.canShowPerformance).toBe(false);
    expect(performance.hasUnvaluedInvestments).toBe(true);
  });
});

describe("remote snapshot price merge", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps remote cached price when browser B loads synced portfolio", () => {
    const merged = applyRemoteSnapshotToLocalCache(
      USER_ID,
      {
        holdings: [holding({ currentPrice: 120 })],
        goal: null,
        importMappings: [],
        migrationCompletedAt: null,
        remoteUpdatedAt: "2026-07-20T10:00:00.000Z",
        portfolioId: "portfolio-1",
        holdingCount: 1,
      },
      {
        preserveLocalPrices: [holding({ currentPrice: 0 })],
      },
    );

    expect(merged[0]?.currentPrice).toBe(120);
    expect(
      JSON.parse(localStorage.getItem(portfolioStorageKey(USER_ID)) ?? "[]")[0]
        ?.currentPrice,
    ).toBe(120);
  });
});
