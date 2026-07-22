import { describe, expect, it } from "vitest";

import {
  createBriefingDedupState,
  isBriefingDuplicate,
  markBriefingStoryUsed,
  takeUniqueBriefingItems,
} from "@/lib/services/news/newsBriefingDedup";
import type { NewsContentItem } from "@/lib/types/newsContent";

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

describe("newsBriefingDedup", () => {
  it("prevents the same story appearing in multiple briefing sections", () => {
    const state = createBriefingDedupState();
    const story = item({
      id: "a",
      title: "Fed signals slower rate cuts ahead",
      sourceName: "Reuters",
    });

    markBriefingStoryUsed(story, state);

    expect(isBriefingDuplicate(story, state)).toBe(true);
    expect(
      isBriefingDuplicate(
        item({
          id: "b",
          title: "Fed signals slower rate cuts ahead",
          canonicalUrl: "https://other.com/b",
        }),
        state,
      ),
    ).toBe(true);
  });

  it("keeps the highest-quality version when selecting unique items", () => {
    const selected = takeUniqueBriefingItems(
      [
        item({ id: "low", title: "ECB preview", sourceName: "Blog Mirror", relevanceScore: 1 }),
        item({ id: "high", title: "ECB preview", sourceName: "Reuters", relevanceScore: 1 }),
      ],
      createBriefingDedupState(),
      1,
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]?.sourceName).toBe("Reuters");
  });
});
