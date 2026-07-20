import { describe, expect, it } from "vitest";

import {
  dedupeDividendNews,
  detectDividendEventLabel,
  filterPortfolioDividendNews,
  isDividendRelatedNews,
} from "@/lib/services/news/dividendNews";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(title: string, id = crypto.randomUUID()): NewsContentItem {
  return {
    id,
    title,
    sourceName: "Test Source",
    sourceType: "news",
    canonicalUrl: "https://example.com",
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: title,
    aiSummary: title,
    whyThisMatters: "Test",
    impactLevel: "Medium Impact",
    matchedHoldingIds: ["1"],
    matchedSymbols: ["VWCE"],
    relevanceLabel: null,
    category: "equities",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 10,
  };
}

describe("dividendNews", () => {
  it("detects dividend event labels", () => {
    expect(detectDividendEventLabel("Company announces dividend increase")).toBe(
      "Dividend increase",
    );
    expect(detectDividendEventLabel("Board declares special dividend")).toBe(
      "Special dividend",
    );
  });

  it("filters and deduplicates dividend stories", () => {
    const filtered = filterPortfolioDividendNews([
      item("VWCE goes ex-dividend next week"),
      item("VWCE goes ex-dividend next week"),
      item("Macro inflation report published"),
    ]);

    expect(filtered).toHaveLength(1);
    expect(isDividendRelatedNews(filtered[0]!)).toBe(true);
  });

  it("dedupes by title and source", () => {
    const deduped = dedupeDividendNews([
      item("Same headline", "a"),
      item("Same headline", "b"),
      item("Different headline", "c"),
    ]);

    expect(deduped).toHaveLength(2);
  });
});
