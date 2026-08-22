import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  coerceNewsApiResponse,
  createDegradedNewsResponse,
} from "@/lib/services/news/newsResponseFactory";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";

describe("newsResponseFactory", () => {
  it("creates a renderable degraded payload with unavailable feeds", () => {
    const payload = createDegradedNewsResponse({
      recoveryMessage: "EODHD news unavailable — API key not configured.",
    });

    expect(payload.success).toBe(true);
    expect(payload.dataStatus.feedsState).toBe("unavailable");
    expect(payload.marketBrief.hasVerifiedContent).toBe(false);
    expect(payload.sourceErrors[0]?.sourceName).toBe("News hub");
  });

  it("coerces legacy error payloads into renderable responses", () => {
    const payload = coerceNewsApiResponse({
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
        eodhdLastUpdated: null,
        sourceCount: 0,
        activeSourceNames: [],
        unavailableSourceCount: 0,
      },
      sourceErrors: [],
      fetchedAt: "2026-07-20T08:00:00.000Z",
    });

    expect(payload.success).toBe(true);
    expect(payload.marketBrief.title).toBe("Today's Market Brief");
  });
});

describe("safeBuildNewsResponse", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns degraded content instead of throwing when profile resolution fails", async () => {
    vi.doMock("@/lib/services/news/fetchNewsFeed", () => ({
      fetchSharedRawNewsItems: vi.fn().mockResolvedValue({
        items: [],
        sourceErrors: [],
        fetchedAt: "2026-07-20T08:00:00.000Z",
        eodhdAvailable: false,
        eodhdLastUpdated: null,
        eodhdServedFromCache: false,
      }),
    }));
    vi.doMock("@/lib/services/news/upcomingEvents", () => ({
      fetchUpcomingMarketEvents: vi.fn().mockResolvedValue({
        events: [],
        state: "provider_unavailable",
        source: null,
      }),
    }));
    vi.doMock("@/lib/services/news/portfolioNewsMatching", () => ({
      resolveNewsHoldingProfiles: vi
        .fn()
        .mockRejectedValue(new Error("EODHD_API_KEY is missing")),
      providerSymbolsFromProfiles: vi.fn(() => []),
      rankPortfolioNews: vi.fn((items: NewsApiResponse["portfolioNews"]) => items),
      scoreNewsItemWithProfiles: vi.fn((item: unknown) => item),
    }));
    vi.doMock("@/lib/services/news/analystNews", () => ({
      filterPortfolioAnalystNews: vi.fn(() => []),
    }));
    vi.doMock("@/lib/services/news/dividendNews", () => ({
      filterPortfolioDividendNews: vi.fn(() => []),
    }));

    const { safeBuildNewsResponse } = await import("@/lib/services/news/newsService");
    const payload = await safeBuildNewsResponse([
      {
        id: "1",
        symbol: "AAPL",
        name: "Apple",
        quantity: 1,
        purchasePrice: 100,
        currentPrice: 100,
        currency: "EUR",
        assetType: "investment",
        isin: "US0378331005",
      },
    ]);

    expect(payload.success).toBe(true);
    expect(payload.dataStatus.feedsState).toBe("unavailable");
    expect(payload.sourceErrors[0]?.error).toContain("News matching");
  });
});
