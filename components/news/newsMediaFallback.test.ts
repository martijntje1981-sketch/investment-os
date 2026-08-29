import { describe, expect, it } from "vitest";

import {
  NEWS_MEDIA_FALLBACK_CATEGORY_TONES,
  NEWS_MEDIA_FALLBACK_TONE_STYLES,
  NEWS_MEDIA_FALLBACK_TONE_STYLES_ON_DARK,
  getNewsMediaFallbackStyle,
  getNewsMediaFallbackTone,
  resolveNewsMediaFallbackCategory,
} from "@/components/news/newsMediaFallback";
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
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

describe("newsMediaFallback styles", () => {
  it("maps macro and portfolio categories to visibly different tones", () => {
    const macroStyle = getNewsMediaFallbackStyle("macro");
    const portfolioStyle = getNewsMediaFallbackStyle("portfolio");

    expect(macroStyle.tone).toBe("macro");
    expect(portfolioStyle.tone).toBe("portfolio");
    expect(macroStyle.surfaceClass).toContain("blue");
    expect(portfolioStyle.surfaceClass).toContain("brand");
    expect(macroStyle.iconClass).not.toBe(portfolioStyle.iconClass);
  });

  it("maps each premium tone to restrained surface, border and icon classes", () => {
    expect(getNewsMediaFallbackStyle("macro").surfaceClass).toContain("bg-blue-50");
    expect(getNewsMediaFallbackStyle("portfolio").surfaceClass).toContain("bg-brand-soft");
    expect(getNewsMediaFallbackStyle("equities").surfaceClass).toContain("bg-emerald-50");
    expect(getNewsMediaFallbackStyle("crypto").surfaceClass).toContain("bg-amber-50");
    expect(getNewsMediaFallbackStyle("commodities").surfaceClass).toContain("bg-orange-50");
    expect(getNewsMediaFallbackStyle("video").surfaceClass).toContain("bg-red-50");
    expect(getNewsMediaFallbackStyle("general").surfaceClass).toContain("bg-slate-100");
  });

  it("uses designed on-dark fallback tiles instead of blank media", () => {
    const dark = getNewsMediaFallbackStyle("portfolio", "onDark");
    expect(dark.surfaceClass).toContain("bg-sky-500/15");
    expect(dark.borderClass).toContain("border");
    expect(dark.iconClass).toContain("sky");
    expect(NEWS_MEDIA_FALLBACK_TONE_STYLES_ON_DARK.macro.surfaceClass).toContain(
      "violet",
    );
    expect(NEWS_MEDIA_FALLBACK_TONE_STYLES_ON_DARK.crypto.surfaceClass).toContain(
      "amber",
    );
  });

  it("covers every fallback category with a shared tone mapping", () => {
    for (const tone of Object.values(NEWS_MEDIA_FALLBACK_CATEGORY_TONES)) {
      expect(NEWS_MEDIA_FALLBACK_TONE_STYLES[tone]).toBeDefined();
    }
  });

  it("resolves portfolio holdings to the portfolio tone", () => {
    expect(
      getNewsMediaFallbackTone(
        resolveNewsMediaFallbackCategory(
          item({
            id: "p1",
            title: "VWCE flows update",
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
        ),
      ),
    ).toBe("portfolio");
  });

  it("resolves macro stories to the macro tone", () => {
    expect(
      getNewsMediaFallbackTone(
        resolveNewsMediaFallbackCategory(
          item({
            id: "m1",
            title: "Fed signals slower rate cuts",
            category: "macro",
            marketCategory: "macro",
          }),
        ),
      ),
    ).toBe("macro");
  });

  it("uses video tone for macro videos while keeping macro subject fallback separate", () => {
    const macroVideo = item({
      id: "v1",
      title: "Don't think the Fed should be hiking here",
      category: "macro",
      marketCategory: "macro",
      sourceType: "youtube",
      contentTypeLabel: "Video",
    });

    expect(getNewsMediaFallbackTone(resolveNewsMediaFallbackCategory(macroVideo))).toBe(
      "video",
    );
  });
});
