import { describe, expect, it, vi } from "vitest";

import {
  NEWS_SEARCH_EMPTY_MESSAGE,
  collectSearchableNewsItems,
  filterNewsItems,
  isNewsSearchActive,
  matchesNewsSearchQuery,
  matchesNewsScopeFilter,
  normalizeNewsSearchQuery,
} from "@/lib/services/news/newsSearchFilter";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Bloomberg Television",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Sample description",
    summary: "Sample summary",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

describe("newsSearchFilter", () => {
  it("matches headlines case-insensitively with partial text", () => {
    const story = item({ id: "1", title: "NUKL uranium outlook improves" });

    expect(matchesNewsSearchQuery(story, "nukl")).toBe(true);
    expect(matchesNewsSearchQuery(story, "URANIUM")).toBe(true);
    expect(matchesNewsSearchQuery(story, " outlook ")).toBe(true);
  });

  it("matches summary and description content", () => {
    const story = item({
      id: "2",
      title: "Market wrap",
      description: "VWCE ETF flows remain strong in Europe.",
      summary: "European ETF demand continues.",
    });

    expect(matchesNewsSearchQuery(story, "vwce")).toBe(true);
    expect(matchesNewsSearchQuery(story, "etf demand")).toBe(true);
  });

  it("matches tickers, provider symbols, and holding names", () => {
    const story = item({
      id: "3",
      title: "Portfolio headline",
      matchedSymbols: ["IB1T"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "4COP",
          name: "Amundi MSCI World",
          providerSymbol: "4COP.XETRA",
        },
      ],
      relevanceLabel: "Relevant to 4COP",
      relevanceScore: 20,
    });

    expect(matchesNewsSearchQuery(story, "ib1t")).toBe(true);
    expect(matchesNewsSearchQuery(story, "4cop")).toBe(true);
    expect(matchesNewsSearchQuery(story, "xetra")).toBe(true);
    expect(matchesNewsSearchQuery(story, "amundi")).toBe(true);
    expect(matchesNewsSearchQuery(story, "relevant to 4cop")).toBe(true);
  });

  it("applies scope filters for portfolio, macro, and crypto", () => {
    const portfolioStory = item({
      id: "p1",
      title: "Portfolio",
      relevanceScore: 20,
      matchedSymbols: ["VWCE"],
    });
    const macroStory = item({
      id: "m1",
      title: "Macro",
      category: "macro",
      marketCategory: "macro",
    });
    const cryptoStory = item({
      id: "c1",
      title: "Crypto",
      category: "crypto",
      marketCategory: "crypto",
    });

    expect(matchesNewsScopeFilter(portfolioStory, "portfolio")).toBe(true);
    expect(matchesNewsScopeFilter(macroStory, "macro")).toBe(true);
    expect(matchesNewsScopeFilter(cryptoStory, "crypto")).toBe(true);
    expect(matchesNewsScopeFilter(macroStory, "portfolio")).toBe(false);
  });

  it("preserves item order while filtering", () => {
    const items = [
      item({ id: "1", title: "First VWCE mention", relevanceScore: 30 }),
      item({ id: "2", title: "Second VWCE mention", relevanceScore: 20 }),
      item({ id: "3", title: "Unrelated headline" }),
    ];

    expect(filterNewsItems(items, "vwce", "all").map((entry) => entry.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("detects active search state and supports clear/reset", () => {
    expect(isNewsSearchActive("", "all")).toBe(false);
    expect(isNewsSearchActive("  vwce  ", "all")).toBe(true);
    expect(isNewsSearchActive("", "macro")).toBe(true);
    expect(normalizeNewsSearchQuery("  ")).toBe("");
  });

  it("returns zero results without throwing", () => {
    const items = [item({ id: "1", title: "Macro update" })];

    expect(filterNewsItems(items, "missing-topic", "all")).toEqual([]);
    expect(NEWS_SEARCH_EMPTY_MESSAGE).toContain("No verified news matches");
  });

  it("collects searchable items from the loaded news payload", () => {
    const merged = collectSearchableNewsItems({
      portfolioNews: [item({ id: "1", title: "Portfolio" })],
      dividendNews: [item({ id: "1", title: "Duplicate" })],
      analystNews: [item({ id: "2", title: "Analyst" })],
      macroNews: [item({ id: "3", title: "Macro" })],
      marketVideos: [item({ id: "4", title: "Video", sourceType: "youtube" })],
    });

    expect(merged.map((entry) => entry.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("does not import or call any provider/API modules", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    filterNewsItems([item({ id: "1", title: "NUKL update" })], "nukl", "all");

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
