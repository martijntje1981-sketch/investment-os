/**
 * Performance batch 2: share cache-first /api/prices and period history.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  __countCacheFirstPricePostsForTests,
  __countCacheFirstPriceReusesForTests,
  __resetCacheFirstPriceQuotesForTests,
  fetchCacheFirstPriceQuotes,
} from "@/lib/client/cacheFirstPriceQuotes";
import {
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  resetMarketSnapshotSyncForTests,
  syncPortfolioPricesFromSnapshot,
} from "@/lib/client/marketSnapshotSync";
import {
  __countPerformanceHistoryPostsForTests,
  __countPerformanceHistoryReusesForTests,
  __resetPortfolioPerformanceHistoryRequestsForTests,
  requestPortfolioPerformanceHistory,
} from "@/lib/client/portfolioPerformanceHistoryRequest";
import {
  loadUserPortfolioHoldings,
  writePortfolioToStorage,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { AUTO_IMPORT_THRESHOLD } from "@/lib/services/import/confidencePolicy";
import { buildGoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";

const USER_A = "user-a-perf2";
const USER_B = "user-b-perf2";

function holding(): StoredPortfolioHolding {
  return {
    id: "vwce",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 2,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
    priceDataStatus: "stale",
  };
}

function historyOk(period: string) {
  return {
    success: true,
    period,
    investmentReturnPercent: 1.2,
    startingValue: 100,
    endingValue: 101.2,
    chartPoints: [],
    dataAvailability: "full",
    coveredHoldingCount: 1,
    skippedHoldingCount: 0,
  };
}

describe("pre-launch performance batch 2", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetCacheFirstPriceQuotesForTests();
    __resetPortfolioPerformanceHistoryRequestsForTests();
    resetLivePriceRefreshStateForTests();
    resetMarketSnapshotSyncForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("A/B. cache-first app entry and snapshot sync share one /api/prices POST", async () => {
    writePortfolioToStorage(USER_A, [holding()]);
    let releasePrices: (() => void) | undefined;
    const pricesGate = new Promise<void>((resolve) => {
      releasePrices = resolve;
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/market-snapshot")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            lastRefreshedAt: "2026-08-01T07:30:00.000Z",
            status: "completed",
            symbolsReceived: 1,
          }),
        };
      }
      if (String(url).includes("/api/prices")) {
        await pricesGate;
        return {
          ok: true,
          json: async () => ({
            success: true,
            quoteSource: "cache",
            prices: [
              {
                symbol: "VWCE",
                providerSymbol: "VWCE.XETRA",
                priceEur: 121,
                currentPrice: 121,
                dataStatus: "delayed",
                updatedAt: "2026-08-20T10:00:00.000Z",
              },
            ],
            requested: 1,
            received: 1,
          }),
        };
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const holdings = loadUserPortfolioHoldings(USER_A);
    const cacheFirst = refreshLivePortfolioPrices(USER_A, holdings, {
      cacheFirst: true,
    });
    const snapshot = syncPortfolioPricesFromSnapshot(USER_A, holdings);
    releasePrices?.();
    const [cacheResult, snapshotResult] = await Promise.all([
      cacheFirst,
      snapshot,
    ]);

    const pricePosts = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/prices"),
    );
    expect(pricePosts).toHaveLength(1);
    expect(__countCacheFirstPricePostsForTests()).toBe(1);
    expect(__countCacheFirstPriceReusesForTests()).toBe(1);
    expect(JSON.parse(String(pricePosts[0]?.[1]?.body)).forceRefresh).toBe(
      false,
    );
    expect(cacheResult.holdings[0]?.currentPrice).toBe(121);
    expect(snapshotResult.holdings[0]?.currentPrice).toBe(121);
    expect(cacheResult.holdings[0]?.priceDataStatus).toBe("delayed");
  });

  it("C. snapshot still reads market-snapshot metadata", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/market-snapshot")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            lastRefreshedAt: "2026-08-01T07:30:00.000Z",
            status: "completed",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ success: true, prices: [], requested: 0, received: 0 }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await syncPortfolioPricesFromSnapshot(USER_A, [holding()]);
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/api/market-snapshot"),
      ),
    ).toBe(true);
  });

  it("D. manual live refresh still uses estimate + forceRefresh", async () => {
    writePortfolioToStorage(USER_A, [holding()]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        canAffordRefresh: true,
        quoteSource: "provider",
        prices: [
          {
            symbol: "VWCE",
            providerSymbol: "VWCE.XETRA",
            priceEur: 130,
            currentPrice: 130,
            dataStatus: "live",
            updatedAt: new Date().toISOString(),
          },
        ],
        requested: 1,
        received: 1,
        refreshSummary: { providerCallsMade: 1, totalCallsRequired: 1 },
        eodhdBudget: { spendableRemaining: 10 },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await refreshLivePortfolioPrices(USER_A, loadUserPortfolioHoldings(USER_A));

    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit | undefined)?.body)),
    );
    expect(bodies.some((body) => body.estimateOnly === true)).toBe(true);
    expect(
      bodies.some(
        (body) => body.forceRefresh === true && body.estimateOnly === false,
      ),
    ).toBe(true);
    expect(__countCacheFirstPricePostsForTests()).toBe(0);
  });

  it("F. failed shared refresh keeps last-known-good prices", async () => {
    writePortfolioToStorage(USER_A, [holding()]);
    writePriceCache(USER_A, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        dataStatus: "stale",
        updatedAt: new Date().toISOString(),
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/market-snapshot")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              lastRefreshedAt: "2026-08-01T07:30:00.000Z",
              status: "completed",
            }),
          };
        }
        throw new Error("network down");
      }),
    );

    const result = await refreshLivePortfolioPrices(
      USER_A,
      loadUserPortfolioHoldings(USER_A),
      { cacheFirst: true },
    );
    expect(result.updated).toBe(false);
    expect(result.holdings[0]?.currentPrice).toBe(110);
    expect(result.holdings[0]?.priceDataStatus).toBe("stale");
    expect(result.message).toMatch(/last available prices remain visible/i);
  });

  it("G. account switch does not reuse another user's in-flight price request", async () => {
    let releasePrices: (() => void) | undefined;
    const pricesGate = new Promise<void>((resolve) => {
      releasePrices = resolve;
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/prices")) {
        await pricesGate;
        return {
          ok: true,
          json: async () => ({
            success: true,
            prices: [],
            requested: 1,
            received: 0,
          }),
        };
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = [
      {
        id: "vwce",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        assetType: "investment" as const,
        providerSymbol: "VWCE.XETRA",
      },
    ];
    const a = fetchCacheFirstPriceQuotes(USER_A, payload);
    const b = fetchCacheFirstPriceQuotes(USER_B, payload);
    releasePrices?.();
    await Promise.all([a, b]);

    expect(__countCacheFirstPricePostsForTests()).toBe(2);
    expect(__countCacheFirstPriceReusesForTests()).toBe(0);
  });

  it("H/I. Dashboard 1W/1M share with a second 1W/1M consumer", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => historyOk("1W"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = requestPortfolioPerformanceHistory({
      userSub: USER_A,
      period: "1W",
      holdings: [holding()],
    });
    const second = requestPortfolioPerformanceHistory({
      userSub: USER_A,
      period: "1W",
      holdings: [holding()],
    });
    const [a, b] = await Promise.all([first, second]);

    expect(a.ok && b.ok).toBe(true);
    expect(__countPerformanceHistoryPostsForTests()).toBe(1);
    expect(__countPerformanceHistoryReusesForTests()).toBe(1);
    if (a.ok && b.ok) {
      expect(a.data).toEqual(b.data);
    }
  });

  it("J. Goal Reality extra periods 1Y and ALL still fetch", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return { ok: true, json: async () => historyOk(body.period) };
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1W",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1M",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1Y",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "ALL",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1W",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1M",
        holdings: [holding()],
      }),
    ]);

    expect(__countPerformanceHistoryPostsForTests()).toBe(4);
    expect(__countPerformanceHistoryReusesForTests()).toBe(2);
  });

  it("K. history requests are user scoped", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => historyOk("1Y"),
      })),
    );

    await Promise.all([
      requestPortfolioPerformanceHistory({
        userSub: USER_A,
        period: "1Y",
        holdings: [holding()],
      }),
      requestPortfolioPerformanceHistory({
        userSub: USER_B,
        period: "1Y",
        holdings: [holding()],
      }),
    ]);

    expect(__countPerformanceHistoryPostsForTests()).toBe(2);
  });

  it("L. failed history request can retry later", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => historyOk("1W"),
      });
    vi.stubGlobal("fetch", fetchMock);

    const failed = await requestPortfolioPerformanceHistory({
      userSub: USER_A,
      period: "1W",
      holdings: [holding()],
    });
    expect(failed.ok).toBe(false);

    const retried = await requestPortfolioPerformanceHistory({
      userSub: USER_A,
      period: "1W",
      holdings: [holding()],
    });
    expect(retried.ok).toBe(true);
    expect(__countPerformanceHistoryPostsForTests()).toBe(2);
  });

  it("M. goal outputs remain unchanged for identical history input", () => {
    const check = buildGoalRealityCheck({
      expectedAnnualReturnPercent: 7,
      candidates: [
        {
          periodId: "1Y",
          periodReturnDecimal: 0.08,
          yearsRepresented: 1,
          sourcePeriodLabel: "the last 12 months",
          dataAvailability: "full",
          historicalFxApproximate: false,
          coveredHoldingCount: 3,
          skippedHoldingCount: 0,
          constantHoldingsReconstructed: true,
        },
      ],
    });
    expect(check.available).toBe(true);
    if (check.available) {
      expect(check.periodId).toBe("1Y");
    }
  });

  it("E. visibility refresh remains cache-first", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "lib/client/useLivePortfolioPriceRefresh.ts"),
      "utf8",
    );
    expect(source).toContain("refreshPrices({ cacheFirst: true })");
  });

  it("O. no new API/provider/DB/cron/polling path", () => {
    expect(AUTO_IMPORT_THRESHOLD).toBe(0.94);
    const live = readFileSync(
      path.resolve(process.cwd(), "lib/client/livePortfolioPriceRefresh.ts"),
      "utf8",
    );
    const snapshot = readFileSync(
      path.resolve(process.cwd(), "lib/client/marketSnapshotSync.ts"),
      "utf8",
    );
    const history = readFileSync(
      path.resolve(
        process.cwd(),
        "lib/client/portfolioPerformanceHistoryRequest.ts",
      ),
      "utf8",
    );
    expect(live).toContain("fetchCacheFirstPriceQuotes");
    expect(snapshot).toContain("fetchCacheFirstPriceQuotes");
    expect(snapshot).toContain("writePriceCache");
    expect(snapshot).toContain("/api/market-snapshot");
    expect(history).toContain('fetch("/api/portfolio/performance"');
    expect(live).not.toMatch(/openai|redis|setInterval/i);
  });
});
