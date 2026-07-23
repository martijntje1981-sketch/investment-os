import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetNewsRefreshStateForTests,
  tryRefreshPortfolioNews,
  writeNewsCache,
} from "@/lib/client/portfolioNews";
import {
  resetDividendRefreshStateForTests,
  tryRefreshPortfolioDividends,
  writeDividendCache,
} from "@/lib/client/portfolioDividends";
import {
  resetAnalystRefreshStateForTests,
  tryRefreshPortfolioAnalyst,
  writeAnalystCache,
} from "@/lib/client/portfolioAnalyst";
import {
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import { newsCacheKey } from "@/lib/client/portfolioStorageKeys";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  EODHD_API_PROVIDER_ID,
  recordEodhdApiCalls,
  resetEodhdDailyQuotaForTests,
} from "@/lib/services/marketData/eodhdDailyQuota";
import { EODHD_NEWS_PROVIDER_ID } from "@/lib/services/instruments/eodhdNewsGuard";
import { isEodhdNewsFetchBlocked } from "@/lib/services/instruments/eodhdNewsGuard";
import {
  isProviderCircuitOpen,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { buildAnalystActionsFromNews } from "@/lib/services/news/analystNews";
import {
  buildEodhdNewsCacheKey,
  resetEodhdNewsCacheForTests,
} from "@/lib/services/news/cache/eodhdNewsCache";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const storage = new Map<string, string>();
const USER = "budget-user";

function stubWindowLocalStorage(): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
  });
}

stubWindowLocalStorage();

function holding(symbol: string, providerSymbol: string): StoredPortfolioHolding {
  return {
    id: symbol,
    symbol,
    name: symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol,
  };
}

const HOLDINGS = [
  holding("IB1T", "IB1T.XETRA"),
  holding("STRC", "STRC.AS"),
  holding("NUKL", "NUKL.XETRA"),
  holding("VWCE", "VWCE.XETRA"),
  holding("AIFS", "AIFS.XETRA"),
];

function newsResponse(): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-07-23T08:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: "2026-07-23T08:00:00.000Z",
      sourceCount: 1,
      activeSourceNames: ["EODHD News"],
      unavailableSourceCount: 0,
    },
    sourceErrors: [],
    fetchedAt: "2026-07-23T08:00:00.000Z",
  };
}

describe("automatic EODHD budget controls", () => {
  beforeEach(() => {
    storage.clear();
    globalThis.localStorage?.clear?.();
    stubWindowLocalStorage();
    resetNewsRefreshStateForTests();
    resetDividendRefreshStateForTests();
    resetAnalystRefreshStateForTests();
    resetLivePriceRefreshStateForTests();
    resetEodhdDailyQuotaForTests();
    resetProviderCircuitForTests();
    resetEodhdNewsCacheForTests();
    vi.restoreAllMocks();
  });

  it("uses cached news and skips POST /api/news when the client cache is fresh", async () => {
    writeNewsCache(USER, newsResponse());

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await tryRefreshPortfolioNews(USER, HOLDINGS);

    expect(result.fromCache).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("performs one POST /api/news when the client cache is expired", async () => {
    storage.set(
      newsCacheKey(USER),
      JSON.stringify({
        response: newsResponse(),
        cachedAt: "2020-01-01T00:00:00.000Z",
      }),
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => newsResponse(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await tryRefreshPortfolioNews(USER, HOLDINGS);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/news");
  });

  it("deduplicates concurrent news refresh requests", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = tryRefreshPortfolioNews(USER, HOLDINGS);
    const second = tryRefreshPortfolioNews(USER, HOLDINGS);

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledOnce();

    resolveFetch?.({
      ok: true,
      json: async () => newsResponse(),
    } as Response);

    await Promise.all([first, second]);
  });

  it("uses cached dividends and skips POST /api/dividends when cache is fresh", async () => {
    writeDividendCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        paysDividends: true,
        dividendYield: 1.5,
        forwardAnnualDividendRate: 1,
        estimatedAnnualDividendEur: 10,
        estimatedNextPaymentEur: 2,
        nextExDate: null,
        nextPaymentDate: null,
        frequency: "quarterly",
        currency: "EUR",
        updatedAt: new Date().toISOString(),
      },
    ]);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await tryRefreshPortfolioDividends(USER, HOLDINGS);

    expect(result.updated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses cached analyst data and skips POST /api/analyst when cache is fresh", async () => {
    writeAnalystCache(
      USER,
      [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          coverageState: "live",
          coverageKind: "equity",
          dataConfidence: "partial",
          consensusRating: "Hold",
          ratingCounts: {
            strongBuy: 0,
            buy: 0,
            hold: 1,
            sell: 0,
            strongSell: 0,
          },
          analystCount: 1,
          averagePriceTarget: 100,
          medianPriceTarget: null,
          highPriceTarget: null,
          lowPriceTarget: null,
          targetCurrency: "EUR",
          source: "EODHD Fundamentals",
          updatedAt: new Date().toISOString(),
        },
      ],
      [],
      true,
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await tryRefreshPortfolioAnalyst(USER, HOLDINGS);

    expect(result.updated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not repeat provider calls when navigating across cached pages", async () => {
    writeNewsCache(USER, newsResponse());
    writeDividendCache(USER, []);
    writeAnalystCache(USER, [], [], true);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await tryRefreshPortfolioNews(USER, HOLDINGS);
    await tryRefreshPortfolioNews(USER, HOLDINGS);
    await tryRefreshPortfolioDividends(USER, HOLDINGS);
    await tryRefreshPortfolioAnalyst(USER, HOLDINGS);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one persistent daily budget across intelligence and price endpoints", async () => {
    await recordEodhdApiCalls(16);

    expect(isProviderCircuitOpen(EODHD_API_PROVIDER_ID)).toBe(true);
    expect(isEodhdNewsFetchBlocked()).toBe(true);
  });

  it("preserves manual live price refresh behavior", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 112,
              currentPrice: 112,
              updatedAt: new Date().toISOString(),
            },
          ],
          requested: 1,
          received: 1,
        }),
      }),
    );

    const result = await refreshLivePortfolioPrices(USER, [holding("VWCE", "VWCE.XETRA")]);

    expect(result.updated).toBe(true);
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.forceRefresh).toBe(true);
  });
});

describe("buildAnalystActionsFromNews provider usage", () => {
  beforeEach(() => {
    resetEodhdNewsCacheForTests();
    vi.restoreAllMocks();
  });

  it("does not perform a duplicate EODHD news fetch when server news cache is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const actions = await buildAnalystActionsFromNews(
      HOLDINGS.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        providerSymbol: item.providerSymbol,
        assetType: "investment" as const,
      })),
    );

    expect(actions).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reuses cached server news headlines for analyst actions", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const symbols = HOLDINGS.map((item) => item.providerSymbol!).filter(Boolean);
    const cacheKey = buildEodhdNewsCacheKey(symbols);

    const { writeEodhdNewsCache } = await import(
      "@/lib/services/news/cache/eodhdNewsCache"
    );
    writeEodhdNewsCache(
      cacheKey,
      [
        {
          id: "eodhd:https://example.com/upgrade:0",
          title: "Goldman upgrades VWCE to Buy from Hold",
          sourceName: "EODHD News",
          sourceType: "news",
          canonicalUrl: "https://example.com/upgrade",
          thumbnailUrl: null,
          publishedAt: "2026-07-23T08:00:00.000Z",
          description: "Upgrade headline",
          summary: "",
          interpretation: "",
          impactLevel: "Medium Impact",
          matchedHoldingIds: [],
          matchedSymbols: ["VWCE"],
          matchedHoldings: [],
          relevanceLabel: null,
          category: "markets",
          marketCategory: "equities",
          contentTypeLabel: "News",
          fetchedAt: "2026-07-23T08:00:00.000Z",
          relevanceScore: 0,
          articleSymbols: ["VWCE.XETRA"],
        },
      ],
      "2026-07-23T08:00:00.000Z",
    );

    const actions = await buildAnalystActionsFromNews(
      HOLDINGS.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        providerSymbol: item.providerSymbol,
        assetType: "investment" as const,
      })),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(actions.length).toBeGreaterThan(0);
  });
});
