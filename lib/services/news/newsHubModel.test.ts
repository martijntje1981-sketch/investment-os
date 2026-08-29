import { describe, expect, it } from "vitest";

import {
  filterMarketNewsByCategory,
  mergePortfolioSectionItems,
  remainingPortfolioItems,
  selectAboveFoldPortfolioItems,
} from "@/lib/services/news/newsHubModel";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Sample",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: null,
    summary: overrides.title,
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

describe("newsHubModel", () => {
  it("filters market news by premium category", () => {
    const items = [
      item({ id: "1", title: "Macro", marketCategory: "macro" }),
      item({ id: "2", title: "Crypto", marketCategory: "crypto" }),
    ];

    expect(filterMarketNewsByCategory(items, "crypto")).toHaveLength(1);
    expect(filterMarketNewsByCategory(items, "all")).toHaveLength(2);
  });

  it("merges portfolio, dividend, and analyst stories without duplicates", () => {
    const merged = mergePortfolioSectionItems({
      portfolioNews: [item({ id: "a", title: "A", relevanceScore: 10 })],
      dividendNews: [item({ id: "a", title: "A duplicate", relevanceScore: 5 })],
      analystNews: [item({ id: "b", title: "B", relevanceScore: 20 })],
    });

    expect(merged.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("selects above-the-fold portfolio headlines for mobile", () => {
    const aboveFold = selectAboveFoldPortfolioItems(
      [
        item({ id: "1", title: "One", relevanceScore: 30 }),
        item({ id: "2", title: "Two", relevanceScore: 20 }),
        item({ id: "3", title: "Three", relevanceScore: 10 }),
      ],
      2,
    );

    expect(aboveFold.map((entry) => entry.id)).toEqual(["1", "2"]);
  });

  it("returns remaining portfolio items after above-the-fold selection", () => {
    const all = [
      item({ id: "1", title: "One" }),
      item({ id: "2", title: "Two" }),
      item({ id: "3", title: "Three" }),
    ];
    const aboveFold = selectAboveFoldPortfolioItems(all, 2);

    expect(remainingPortfolioItems(all, aboveFold).map((entry) => entry.id)).toEqual([
      "3",
    ]);
  });
});
