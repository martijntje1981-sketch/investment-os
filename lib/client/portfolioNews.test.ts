import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isNewsCacheFresh,
  readNewsCache,
  tryRefreshPortfolioNews,
  writeNewsCache,
} from "@/lib/client/portfolioNews";
import { newsCacheKey } from "@/lib/client/portfolioStorageKeys";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const storage = new Map<string, string>();

vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
});

const holding: StoredPortfolioHolding = {
  id: "1",
  symbol: "AAPL",
  name: "Apple",
  quantity: 10,
  purchasePrice: 100,
  currentPrice: 120,
  currency: "EUR",
  assetType: "investment",
  providerSymbol: "AAPL.US",
};

function response(): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      sourceCount: 1,
      activeSourceNames: ["EODHD News"],
    },
    sourceErrors: [],
    fetchedAt: "2026-07-20T08:00:00.000Z",
  };
}

describe("portfolioNews cache", () => {
  beforeEach(() => {
    storage.clear();
    vi.restoreAllMocks();
  });

  it("reads and writes news cache per user", () => {
    writeNewsCache("user-1", response());
    const cache = readNewsCache("user-1");

    expect(cache?.response.success).toBe(true);
    expect(cache?.cachedAt).toBeTruthy();
  });

  it("treats fresh cache as valid", () => {
    expect(isNewsCacheFresh(new Date().toISOString())).toBe(true);
  });

  it("returns stale cache when refresh fails", async () => {
    storage.set(
      newsCacheKey("user-1"),
      JSON.stringify({
        response: response(),
        cachedAt: "2020-01-01T00:00:00.000Z",
      }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down")),
    );

    const result = await tryRefreshPortfolioNews("user-1", [holding]);

    expect(result.fromCache).toBe(true);
    expect(result.isStale).toBe(true);
    expect(result.response.success).toBe(true);
  });

  it("refreshes and writes cache on successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => response(),
      }),
    );

    const result = await tryRefreshPortfolioNews("user-1", [holding]);

    expect(result.fromCache).toBe(false);
    expect(result.isStale).toBe(false);
    expect(readNewsCache("user-1")?.response.success).toBe(true);
  });

  it("returns a renderable degraded payload when the API responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: "News could not be loaded.",
          marketBrief: createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
          portfolioNews: [],
          macroNews: [],
          marketVideos: [],
          upcomingEvents: [],
          dataStatus: {
            feedsState: "unavailable",
            eventsState: "provider_unavailable",
            eodhdNewsAvailable: false,
            sourceCount: 0,
            activeSourceNames: [],
          },
          sourceErrors: [
            {
              sourceId: "eodhd-news",
              sourceName: "EODHD News",
              error: "EODHD news unavailable — API key not configured.",
            },
          ],
          fetchedAt: "2026-07-20T08:00:00.000Z",
        }),
      }),
    );

    const result = await tryRefreshPortfolioNews("user-1", [holding]);

    expect(result.response.success).toBe(true);
    expect(result.response.dataStatus.feedsState).toBe("unavailable");
    expect(result.response.sourceErrors[0]?.sourceName).toBe("EODHD News");
  });

  it("keeps partial provider content when one source fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...response(),
          dataStatus: {
            feedsState: "partial",
            eventsState: "provider_unavailable",
            eodhdNewsAvailable: true,
            sourceCount: 1,
            activeSourceNames: ["CNBC Television"],
          },
          sourceErrors: [
            {
              sourceId: "eodhd-news",
              sourceName: "EODHD News",
              error: "Some EODHD news requests failed.",
            },
          ],
        }),
      }),
    );

    const result = await tryRefreshPortfolioNews("user-1", [holding]);

    expect(result.response.dataStatus.feedsState).toBe("partial");
    expect(result.response.sourceErrors).toHaveLength(1);
  });

  it("returns degraded content for unauthenticated users instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down")),
    );

    const result = await tryRefreshPortfolioNews(null, []);

    expect(result.response.success).toBe(true);
    expect(result.response.dataStatus.feedsState).toBe("unavailable");
  });

  it("supports successful retry after an initial provider failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: "News could not be loaded.",
          marketBrief: createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
          portfolioNews: [],
          macroNews: [],
          marketVideos: [],
          upcomingEvents: [],
          dataStatus: {
            feedsState: "unavailable",
            eventsState: "provider_unavailable",
            eodhdNewsAvailable: false,
            sourceCount: 0,
            activeSourceNames: [],
          },
          sourceErrors: [],
          fetchedAt: "2026-07-20T08:00:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => response(),
      });

    vi.stubGlobal("fetch", fetchMock);

    const first = await tryRefreshPortfolioNews("user-1", [holding]);
    expect(first.response.dataStatus.feedsState).toBe("unavailable");

    storage.clear();

    const second = await tryRefreshPortfolioNews("user-1", [holding]);
    expect(second.response.dataStatus.feedsState).toBe("live");
  });
});
