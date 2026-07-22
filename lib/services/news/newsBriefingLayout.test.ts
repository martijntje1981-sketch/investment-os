import { describe, expect, it } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  BRIEFING_SECTION_LIMIT,
  buildNewsBriefingLayout,
} from "@/lib/services/news/newsBriefingLayout";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Bloomberg Television",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Verified market coverage.",
    summary: "Verified market coverage.",
    interpretation: "Context only.",
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

function payload(overrides: Partial<NewsApiResponse> = {}): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    sourceErrors: [],
    fetchedAt: "2026-07-20T08:00:00.000Z",
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: "2026-07-20T08:00:00.000Z",
      sourceCount: 1,
      activeSourceNames: ["Bloomberg Television"],
      unavailableSourceCount: 0,
    },
    ...overrides,
  };
}

describe("buildNewsBriefingLayout", () => {
  it("limits visible sections to top-ranked items", () => {
    const portfolioNews = Array.from({ length: 8 }, (_, index) =>
      item({
        id: `p${index}`,
        title: `Portfolio story ${index}`,
        matchedSymbols: ["VWCE"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + index,
      }),
    );

    const layout = buildNewsBriefingLayout(payload({ portfolioNews }));

    expect(layout.portfolioNews.items).toHaveLength(BRIEFING_SECTION_LIMIT);
    expect(layout.portfolioNews.hasMore).toBe(true);
    expect(layout.allPortfolioItems).toHaveLength(8);
  });

  it("groups portfolio coverage by holding", () => {
    const layout = buildNewsBriefingLayout(
      payload({
        portfolioNews: [
          item({
            id: "p1",
            title: "AIFS infrastructure update",
            matchedSymbols: ["AIFS"],
            matchedHoldings: [
              {
                id: "h1",
                symbol: "AIFS",
                name: "iShares AI Infrastructure UCITS ETF",
                providerSymbol: "AIFS.XETRA",
              },
            ],
            relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 3,
          }),
        ],
        analystNews: [
          item({
            id: "a1",
            title: "Analyst note on AIFS",
            matchedSymbols: ["AIFS"],
            relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 1,
          }),
        ],
      }),
    );

    expect(layout.holdingGroups).toHaveLength(1);
    expect(layout.holdingGroups[0]?.symbol).toBe("AIFS");
    expect(layout.holdingGroups[0]?.articles).toHaveLength(1);
    expect(layout.holdingGroups[0]?.analystUpdates).toHaveLength(1);
  });
});
