import { describe, expect, it } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  MARKETS_TODAY_REGION_ORDER,
} from "@/lib/services/news/newsMarketsToday";
import {
  createPageDedupState,
  isPageDuplicate,
  markPageItemUsed,
  normalizeNewsPageUrl,
  takeUniquePageItems,
} from "@/lib/services/news/newsPageDedup";
import {
  buildNewsBriefingLayout,
  findSupportingBriefingItems,
} from "@/lib/services/news/newsBriefingLayout";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

const NOW = Date.parse("2026-07-20T12:00:00.000Z");

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Reuters",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Coverage",
    summary: "Coverage",
    interpretation: "Context",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "macro",
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
      activeSourceNames: ["Reuters"],
      unavailableSourceCount: 0,
    },
    ...overrides,
  };
}

describe("newsPageDedup", () => {
  it("removes exact duplicate URLs across sections", () => {
    const state = createPageDedupState();
    const original = item({
      id: "a",
      title: "Fed signals slower rate cuts",
      canonicalUrl: "https://reuters.com/fed-story",
    });

    markPageItemUsed(original, state);

    expect(
      isPageDuplicate(
        item({
          id: "b",
          title: "Different headline",
          canonicalUrl: "https://reuters.com/fed-story",
        }),
        state,
      ),
    ).toBe(true);
  });

  it("deduplicates recognised tracking-parameter URL variants", () => {
    const state = createPageDedupState();
    markPageItemUsed(
      item({
        id: "a",
        title: "ECB preview",
        canonicalUrl: "https://reuters.com/ecb?utm_source=twitter",
      }),
      state,
    );

    expect(
      isPageDuplicate(
        item({
          id: "b",
          title: "ECB preview copy",
          canonicalUrl: "https://reuters.com/ecb?utm_medium=email",
        }),
        state,
      ),
    ).toBe(true);
  });

  it("preserves the original selected destination URL on the kept item", () => {
    const selected = takeUniquePageItems(
      [
        item({
          id: "original",
          title: "ECB preview",
          canonicalUrl: "https://reuters.com/ecb?token=abc&utm_source=x",
        }),
      ],
      createPageDedupState(),
      1,
    );

    expect(selected[0]?.canonicalUrl).toBe(
      "https://reuters.com/ecb?token=abc&utm_source=x",
    );
  });

  it("does not strip legitimate non-tracking query parameters", () => {
    const normalized = normalizeNewsPageUrl(
      "https://reuters.com/article?id=12345&section=markets",
    );
    expect(normalized).toContain("id=12345");
    expect(normalized).toContain("section=markets");
  });

  it("removes obvious duplicate titles conservatively", () => {
    const state = createPageDedupState();
    markPageItemUsed(
      item({
        id: "a",
        title: "Fed signals slower rate cuts ahead",
        canonicalUrl: "https://reuters.com/a",
      }),
      state,
    );

    expect(
      isPageDuplicate(
        item({
          id: "b",
          title: "Fed signals slower rate cuts ahead",
          canonicalUrl: "https://other.com/b",
        }),
        state,
      ),
    ).toBe(true);
  });

  it("keeps different reporting on the same broad event", () => {
    const state = createPageDedupState();
    markPageItemUsed(
      item({
        id: "a",
        title: "Fed signals slower rate cuts ahead",
        canonicalUrl: "https://reuters.com/a",
      }),
      state,
    );

    expect(
      isPageDuplicate(
        item({
          id: "b",
          title: "Analysts split on Fed timing after latest signals",
          canonicalUrl: "https://reuters.com/b",
        }),
        state,
      ),
    ).toBe(false);
  });

  it("does not deduplicate articles and videos solely by topic", () => {
    const state = createPageDedupState();
    markPageItemUsed(
      item({
        id: "article",
        title: "Bitcoin breaks key level",
        canonicalUrl: "https://reuters.com/btc",
      }),
      state,
    );

    expect(
      isPageDuplicate(
        item({
          id: "video",
          title: "Bitcoin breaks key level",
          sourceType: "youtube",
          canonicalUrl: "https://youtube.com/watch?v=abc",
        }),
        state,
      ),
    ).toBe(false);
  });

  it("prefers stronger candidates when selecting unique items", () => {
    const selected = takeUniquePageItems(
      [
        item({
          id: "low",
          title: "ECB preview",
          sourceName: "Blog Mirror",
          relevanceScore: 1,
        }),
        item({
          id: "high",
          title: "ECB preview",
          sourceName: "Reuters",
          relevanceScore: 1,
        }),
      ],
      createPageDedupState(),
      1,
      NOW,
    );

    expect(selected[0]?.sourceName).toBe("Reuters");
  });
});

describe("buildNewsBriefingLayout page-wide dedup", () => {
  it("does not repeat Top Story in supporting coverage selection", () => {
    const mustWatch = item({
      id: "top",
      title: "VWCE flows update",
      matchedSymbols: ["VWCE"],
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "All-World ETF",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });

    const supporting = findSupportingBriefingItems({
      items: [mustWatch],
      decisionText: "Monitor VWCE flows update",
      mustWatchId: "top",
      relatedSymbols: ["VWCE"],
      now: NOW,
    });

    expect(supporting.some((entry) => entry.id === "top")).toBe(false);
  });

  it("does not repeat the same article across portfolio and macro sections", () => {
    const duplicate = item({
      id: "dup",
      title: "Fed signals slower rate cuts",
      category: "macro",
      marketCategory: "macro",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "All-World ETF",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });
    const macroOnly = item({
      id: "macro-only",
      title: "ECB holds rates steady",
      category: "macro",
      marketCategory: "macro",
    });

    const layout = buildNewsBriefingLayout(
      payload({
        portfolioNews: [duplicate],
        macroNews: [duplicate, macroOnly],
      }),
      { now: NOW },
    );

    const portfolioUrls = new Set(
      layout.portfolioCards.map((card) => card.item.canonicalUrl),
    );
    const macroUrls = layout.macroGroups.flatMap((group) =>
      group.items.map((entry) => entry.canonicalUrl),
    );

    for (const url of macroUrls) {
      expect(portfolioUrls.has(url)).toBe(false);
    }
  });

  it("seeds intelligence items before lower-priority sections", () => {
    const story = item({
      id: "seed",
      title: "VWCE flows update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 4,
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "All-World ETF",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });
    const macro = item({
      id: "macro",
      title: "Global macro backdrop",
      category: "macro",
      marketCategory: "macro",
    });

    const withoutSeed = buildNewsBriefingLayout(
      payload({ portfolioNews: [story], macroNews: [macro] }),
      { now: NOW },
    );
    const withSeed = buildNewsBriefingLayout(
      payload({ portfolioNews: [story], macroNews: [macro] }),
      { now: NOW, pageDedupSeed: [story] },
    );

    expect(withoutSeed.portfolioCards.some((card) => card.item.id === "seed")).toBe(
      true,
    );
    expect(withSeed.portfolioCards.some((card) => card.item.id === "seed")).toBe(
      false,
    );
  });

  it("keeps Markets Today one-card-per-story guarantee", () => {
    const shared = item({
      id: "shared",
      title: "Bitcoin breaks key resistance level",
      category: "crypto",
      marketCategory: "crypto",
      description: "Crypto markets rally as bitcoin breaks resistance.",
    });

    const layout = buildNewsBriefingLayout(
      payload({
        macroNews: [shared],
        portfolioNews: [
          item({
            id: "other",
            title: "Unrelated portfolio headline",
            relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
            matchedSymbols: ["VWCE"],
            matchedHoldings: [
              {
                id: "h1",
                symbol: "VWCE",
                name: "All-World ETF",
                providerSymbol: "VWCE.XETRA",
              },
            ],
          }),
          shared,
        ],
      }),
      { now: NOW },
    );

    const cryptoStories = layout.marketsToday.find((region) => region.id === "crypto")
      ?.stories;
    const urls = cryptoStories?.map((story) => story.canonicalUrl) ?? [];
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("preserves five Markets Today cards in Global → Europe → US → Asia → Crypto order", () => {
    const layout = buildNewsBriefingLayout(payload(), { now: NOW });
    expect(layout.marketsToday.map((region) => region.id)).toEqual(
      MARKETS_TODAY_REGION_ORDER,
    );
  });
});

describe("Top 5 / expansion layout behavior", () => {
  it("returns full ranked lists for expandable sections", () => {
    const portfolioNews = Array.from({ length: 8 }, (_, index) =>
      item({
        id: `p${index}`,
        title: `Portfolio story ${index}`,
        matchedSymbols: ["VWCE"],
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + index,
        matchedHoldings: [
          {
            id: "h1",
            symbol: "VWCE",
            name: "All-World ETF",
            providerSymbol: "VWCE.XETRA",
          },
        ],
      }),
    );

    const layout = buildNewsBriefingLayout(payload({ portfolioNews }), { now: NOW });

    expect(layout.portfolioCards.length).toBe(8);
    expect(layout.portfolioNews.hasMore).toBe(true);
    expect(layout.portfolioNews.items).toHaveLength(5);
  });

  it("deduplicates before section limits are applied", () => {
    const duplicate = item({
      id: "dup",
      title: "Fed signals slower rate cuts",
      category: "macro",
      marketCategory: "macro",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "All-World ETF",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });
    const extras = Array.from({ length: 6 }, (_, index) =>
      item({
        id: `macro-${index}`,
        title: `Macro story ${index}`,
        category: "macro",
        marketCategory: "macro",
      }),
    );

    const layout = buildNewsBriefingLayout(
      payload({
        portfolioNews: [duplicate],
        macroNews: [duplicate, ...extras],
      }),
      { now: NOW },
    );

    const macroCount = layout.macroGroups.reduce(
      (total, group) => total + group.items.length,
      0,
    );
    expect(macroCount).toBe(6);
  });
});

describe("newsBriefingDedup tracking URLs", () => {
  it("treats tracking-parameter variants as duplicates in briefing dedup", async () => {
    const { createBriefingDedupState, isBriefingDuplicate, markBriefingStoryUsed } =
      await import("@/lib/services/news/newsBriefingDedup");

    const state = createBriefingDedupState();
    markBriefingStoryUsed(
      item({
        id: "a",
        title: "ECB preview",
        canonicalUrl: "https://reuters.com/ecb?utm_source=x",
      }),
      state,
    );

    expect(
      isBriefingDuplicate(
        item({
          id: "b",
          title: "Different title",
          canonicalUrl: "https://reuters.com/ecb?fbclid=abc",
        }),
        state,
      ),
    ).toBe(true);
  });
});
