import { describe, expect, it } from "vitest";

import {
  deduplicateCrossSourceNews,
  excludeNewsItemIds,
} from "@/lib/services/news/deduplicateNews";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Sample",
    sourceType: "youtube",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: null,
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "Video",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

describe("deduplicateCrossSourceNews", () => {
  it("keeps one story when wire and video share a title cluster", () => {
    const deduped = deduplicateCrossSourceNews([
      item({
        id: "video",
        title: "ECB interest rate decision preview",
        sourceType: "youtube",
        relevanceScore: 0,
      }),
      item({
        id: "wire",
        title: "ECB interest rate decision preview",
        sourceType: "news",
        sourceName: "EODHD News",
        relevanceScore: 0,
      }),
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.sourceType).toBe("news");
  });

  it("keeps distinct stories with different title clusters", () => {
    const deduped = deduplicateCrossSourceNews([
      item({ id: "a", title: "Fed outlook and inflation update" }),
      item({ id: "b", title: "Bitcoin ETF flows accelerate" }),
    ]);

    expect(deduped).toHaveLength(2);
  });
});

describe("excludeNewsItemIds", () => {
  it("removes intelligence duplicates from portfolio section", () => {
    const filtered = excludeNewsItemIds(
      [
        item({ id: "keep", title: "General portfolio headline" }),
        item({ id: "drop", title: "Analyst upgrade headline" }),
      ],
      new Set(["drop"]),
    );

    expect(filtered.map((entry) => entry.id)).toEqual(["keep"]);
  });
});
