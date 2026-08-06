import { describe, expect, it } from "vitest";

import { buildMacroTopicGroups, classifyMacroTopic } from "@/lib/services/news/newsMacroGroups";
import type { NewsContentItem } from "@/lib/types/newsContent";

function item(title: string, overrides: Partial<NewsContentItem> = {}): NewsContentItem {
  return {
    id: title,
    title,
    sourceName: "Reuters",
    sourceType: "news",
    canonicalUrl: "https://example.com",
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: title,
    summary: title,
    interpretation: "",
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

describe("newsMacroGroups", () => {
  it("classifies inflation and central bank topics", () => {
    expect(classifyMacroTopic(item("US CPI inflation rises"))).toBe("inflation");
    expect(classifyMacroTopic(item("Fed holds rates steady"))).toBe("central_banks");
  });

  it("groups macro headlines by topic", () => {
    const groups = buildMacroTopicGroups([
      item("US CPI inflation rises"),
      item("ECB keeps rates unchanged"),
      item("Oil prices climb on supply concerns", { marketCategory: "commodities" }),
    ]);

    expect(groups.some((group) => group.id === "inflation")).toBe(true);
    expect(groups.some((group) => group.id === "central_banks")).toBe(true);
    expect(groups.some((group) => group.id === "commodities")).toBe(true);
  });
});
