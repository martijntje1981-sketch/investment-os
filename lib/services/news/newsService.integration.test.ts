import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const mockFetchSharedRawNewsItems = vi.fn();
const mockFetchUpcomingMarketEvents = vi.fn();
const mockResolveNewsHoldingProfiles = vi.fn();

vi.mock("@/lib/services/news/fetchNewsFeed", () => ({
  fetchSharedRawNewsItems: (...args: unknown[]) => mockFetchSharedRawNewsItems(...args),
}));

vi.mock("@/lib/services/news/upcomingEvents", () => ({
  fetchUpcomingMarketEvents: (...args: unknown[]) =>
    mockFetchUpcomingMarketEvents(...args),
}));

vi.mock("@/lib/services/news/portfolioNewsMatching", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/news/portfolioNewsMatching")
  >("@/lib/services/news/portfolioNewsMatching");

  return {
    ...actual,
    resolveNewsHoldingProfiles: (...args: unknown[]) =>
      mockResolveNewsHoldingProfiles(...args),
  };
});

function article(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "EODHD News",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Verified article body.",
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

const holding: StoredPortfolioHolding = {
  id: "aapl-id",
  symbol: "AAPL",
  name: "Apple",
  quantity: 10,
  purchasePrice: 100,
  currentPrice: 120,
  currency: "EUR",
  assetType: "investment",
  providerSymbol: "AAPL.US",
};

describe("buildNewsResponse integration", () => {
  beforeEach(() => {
    mockResolveNewsHoldingProfiles.mockResolvedValue([
      {
        id: "aapl-id",
        symbol: "AAPL",
        name: "Apple",
        providerSymbol: "AAPL.US",
        isin: null,
        strongKeywords: ["apple"],
      },
    ]);
    mockFetchUpcomingMarketEvents.mockResolvedValue({
      events: [],
      state: "provider_unavailable",
      source: null,
    });
  });

  it("returns honest empty portfolio news with no holdings", async () => {
    mockFetchSharedRawNewsItems.mockResolvedValue({
      items: [
        article({
          id: "macro-1",
          title: "Fed outlook and inflation update",
          category: "macro",
          marketCategory: "macro",
        }),
      ],
      sourceErrors: [],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      eodhdAvailable: false,
      eodhdLastUpdated: null,
      eodhdServedFromCache: false,
    });

    const { buildNewsResponse } = await import("@/lib/services/news/newsService");
    const payload = await buildNewsResponse([]);

    expect(payload.portfolioNews).toEqual([]);
    expect(payload.macroNews.length).toBeGreaterThan(0);
    expect(payload.dataStatus.eodhdNewsAvailable).toBe(false);
    expect(payload.dataStatus.eventsState).toBe("provider_unavailable");
  });

  it("matches portfolio headlines using provider symbols", async () => {
    mockFetchSharedRawNewsItems.mockResolvedValue({
      items: [
        article({
          id: "aapl-story",
          title: "Apple supply chain update",
          articleSymbols: ["AAPL.US"],
        }),
        article({
          id: "duplicate-story",
          title: "Apple supply chain update",
          sourceType: "youtube",
          sourceName: "CNBC Television",
          canonicalUrl: "https://www.youtube.com/watch?v=dup",
          contentTypeLabel: "Video",
        }),
      ],
      sourceErrors: [],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      eodhdAvailable: true,
      eodhdLastUpdated: "2026-07-20T08:00:00.000Z",
      eodhdServedFromCache: false,
    });

    const { buildNewsResponse } = await import("@/lib/services/news/newsService");
    const payload = await buildNewsResponse([holding]);

    expect(mockResolveNewsHoldingProfiles).toHaveBeenCalled();
    expect(payload.portfolioNews.length).toBeGreaterThan(0);
    expect(payload.portfolioNews.some((item) => item.matchedSymbols.includes("AAPL"))).toBe(
      true,
    );
    expect(payload.dataStatus.feedsState).toBe("live");
    expect(payload.dataStatus.eodhdNewsAvailable).toBe(true);
  });

  it("surfaces partial state when some providers fail", async () => {
    mockFetchSharedRawNewsItems.mockResolvedValue({
      items: [
        article({
          id: "macro-1",
          title: "Global markets weekly wrap",
        }),
      ],
      sourceErrors: [
        {
          sourceId: "bloomberg-tv",
          sourceName: "Bloomberg Television",
          error: "Feed unavailable (503)",
        },
      ],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      eodhdAvailable: true,
      eodhdLastUpdated: "2026-07-20T08:00:00.000Z",
      eodhdServedFromCache: false,
    });

    const { buildNewsResponse } = await import("@/lib/services/news/newsService");
    const payload = await buildNewsResponse([holding]);

    expect(payload.dataStatus.feedsState).toBe("partial");
    expect(payload.dataStatus.unavailableSourceCount).toBe(1);
    expect(payload.sourceErrors).toEqual([]);
  });
});
