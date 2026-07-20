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
});
