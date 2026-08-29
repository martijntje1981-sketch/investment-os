import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  BRIEFING_SECTION_LIMIT,
  buildNewsBriefingLayout,
} from "@/lib/services/news/newsBriefingLayout";
import { buildMarketsTodayRegions } from "@/lib/services/news/newsMarketsToday";
import { buildNewsMediaPresentation } from "@/lib/services/news/newsMediaType";
import { MARKETS_TODAY_REGION_ORDER } from "@/lib/services/news/marketsTodayRegionalClassification";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

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

function readNewsSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("News responsive card layout", () => {
  it("keeps article action label and source metadata in compact rows", () => {
    const article = item({
      id: "article-1",
      title: "Fed officials signal patience on interest rates",
      sourceName: "Financial Times",
    });
    const presentation = buildNewsMediaPresentation(article);

    expect(presentation.ctaLabel).toBe("Read article");

    const articleRow = readNewsSource("components/news/NewsCompactArticleRow.tsx");
    expect(articleRow).toContain("presentation.ctaLabel");
    expect(articleRow).toContain("item.sourceName");
    expect(articleRow).toContain("NewsCompactCardLayout");
  });

  it("keeps Watch video action label in video rows", () => {
    const video = item({
      id: "video-1",
      title: "Market open recap",
      sourceType: "youtube",
      contentTypeLabel: "Video",
    });
    const presentation = buildNewsMediaPresentation(video);

    expect(presentation.ctaLabel).toBe("Watch video");

    const videoRow = readNewsSource("components/news/NewsCompactVideoRow.tsx");
    expect(videoRow).toContain("presentation.ctaLabel");
    expect(videoRow).toContain("NewsCompactCardLayout");
  });

  it("uses stacked media and text on narrow screens with horizontal layout from 480px", () => {
    const layoutSource = readNewsSource("components/news/newsCardStyles.ts");
    const cardLayout = readNewsSource("components/news/NewsCompactCardLayout.tsx");

    expect(layoutSource).toContain("min-[480px]:flex-row");
    expect(layoutSource).toContain("w-full");
    expect(layoutSource).toContain("min-[480px]:w-auto");
    expect(cardLayout).toContain("newsCompactCardLayoutClass");
  });

  it("allows long headlines and source names to wrap without fixed widths", () => {
    const layoutSource = readNewsSource("components/news/newsCardStyles.ts");
    const articleRow = readNewsSource("components/news/NewsCompactArticleRow.tsx");

    expect(layoutSource).toContain("break-words");
    expect(articleRow).toContain("newsCompactHeadlineClass");
  });

  it("keeps missing thumbnail fallback visible via NewsMediaThumbnail", () => {
    const mediaSource = readNewsSource("components/news/NewsMediaThumbnail.tsx");
    expect(mediaSource).toContain("getNewsMediaFallbackIcon");
    expect(mediaSource).toContain("getNewsMediaFallbackStyle");
    expect(mediaSource).not.toContain("fetch(");
  });

  it("keeps broken thumbnail error fallback functional", () => {
    const mediaSource = readNewsSource("components/news/NewsMediaThumbnail.tsx");
    expect(mediaSource).toContain("onError");
    expect(mediaSource).toContain("setFailed(true)");
  });

  it("preserves Show more and Show less accessibility controls", () => {
    const sectionSource = readNewsSource("components/news/NewsBriefingSection.tsx");
    expect(sectionSource).toContain("Show more");
    expect(sectionSource).toContain("Show less");
    expect(sectionSource).toContain("aria-expanded");
    expect(sectionSource).toContain("aria-controls");
    expect(sectionSource).toContain("newsShowMoreButtonClass");
  });

  it("preserves all five Markets Today regions", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(regions.map((region) => region.id)).toEqual(MARKETS_TODAY_REGION_ORDER);
  });

  it("does not change briefing ranking or deduplication output shape", () => {
    const portfolioNews = Array.from({ length: 6 }, (_, index) =>
      item({
        id: `p${index}`,
        title: `Portfolio story ${index}`,
        matchedSymbols: ["VWCE"],
        relevanceScore: 10 + index,
      }),
    );

    const layout = buildNewsBriefingLayout(payload({ portfolioNews }));

    expect(layout.portfolioNews.items).toHaveLength(BRIEFING_SECTION_LIMIT);
    expect(layout.portfolioNews.hasMore).toBe(true);
    expect(layout.portfolioNews.items[0]?.id).toBe("p5");
  });
});

describe("News responsive Top Story", () => {
  it("stacks editorial media above text on mobile and keeps desktop side-by-side layout", () => {
    const intelligenceSource = readNewsSource(
      "components/news/NewsBriefingIntelligence.tsx",
    );
    expect(intelligenceSource).toContain("flex-col");
    expect(intelligenceSource).toContain("sm:flex-row");
    expect(intelligenceSource).toContain('size="editorial"');
  });
});
