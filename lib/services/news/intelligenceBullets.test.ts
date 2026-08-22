import { describe, expect, it } from "vitest";

import {
  bulletFromNewsItem,
  bulletTextOnly,
  intelligenceBulletKey,
  isValidArticleUrl,
} from "@/lib/services/news/intelligenceBullets";
import type { NewsContentItem } from "@/lib/types/newsContent";

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Reuters",
    sourceType: "news",
    canonicalUrl: "https://example.com/article",
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Coverage",
    summary: "Coverage",
    interpretation: "Context",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: ["VWCE"],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 10,
    ...overrides,
  };
}

describe("intelligenceBullets", () => {
  it("accepts only real http(s) article URLs", () => {
    expect(isValidArticleUrl("https://example.com/article")).toBe(true);
    expect(isValidArticleUrl("http://example.com/article")).toBe(true);
    expect(isValidArticleUrl("#")).toBe(false);
    expect(isValidArticleUrl("")).toBe(false);
    expect(isValidArticleUrl(null)).toBe(false);
    expect(isValidArticleUrl("not-a-url")).toBe(false);
  });

  it("preserves canonical article metadata from news items", () => {
    const bullet = bulletFromNewsItem(newsItem({ id: "a1", title: "Fed outlook" }));

    expect(bullet.text).toBe("Fed outlook");
    expect(bullet.canonicalUrl).toBe("https://example.com/article");
    expect(bullet.sourceName).toBe("Reuters");
  });

  it("builds stable bullet keys", () => {
    expect(
      intelligenceBulletKey(
        bulletTextOnly("NUKL mentioned in verified coverage"),
      ),
    ).toBe("NUKL mentioned in verified coverage:");
  });
});
