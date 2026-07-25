import { describe, expect, it } from "vitest";

import { getNewsMediaFallbackStyle } from "@/components/news/newsMediaFallback";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import { bulletFromNewsItem } from "@/lib/services/news/intelligenceBullets";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import {
  buildNewsBriefingLayout,
} from "@/lib/services/news/newsBriefingLayout";
import { buildMarketsTodayRegions } from "@/lib/services/news/newsMarketsToday";
import {
  buildMarketsTodayStoryPresentation,
  buildNewsMediaPresentation,
  getNewsMediaCtaLabel,
  resolveNewsMediaType,
  resolveNewsMediaTypeFromItem,
} from "@/lib/services/news/newsMediaType";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Bloomberg Television",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Verified market coverage.",
    summary: "Verified market coverage.",
    interpretation: "Context only.",
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
      activeSourceNames: ["Bloomberg Television"],
      unavailableSourceCount: 0,
    },
    ...overrides,
  };
}

describe("resolveNewsMediaType", () => {
  it("treats canonical Video content type as video without source-name heuristics", () => {
    expect(
      resolveNewsMediaType({
        sourceType: "news",
        contentTypeLabel: "Video",
      }),
    ).toBe("video");
  });

  it("treats YouTube source type as video", () => {
    expect(
      resolveNewsMediaType({
        sourceType: "youtube",
        contentTypeLabel: "News",
      }),
    ).toBe("video");
  });

  it("does not infer video status from Bloomberg Television source name alone", () => {
    expect(
      resolveNewsMediaTypeFromItem(
        item({
          id: "bloomberg-article",
          title: "Rates outlook shifts",
          sourceName: "Bloomberg Television",
          sourceType: "news",
          contentTypeLabel: "News",
        }),
      ),
    ).toBe("article");
  });
});

describe("buildNewsMediaPresentation", () => {
  it("renders macro video without a thumbnail as Macro with red video fallback and Watch video", () => {
    const macroVideo = item({
      id: "fed-video",
      title: "Don't think the Fed should be hiking here",
      sourceType: "youtube",
      contentTypeLabel: "Video",
      marketCategory: "macro",
      category: "macro",
      thumbnailUrl: null,
    });

    const presentation = buildNewsMediaPresentation(macroVideo);

    expect(presentation.subjectLabel).toBe("Macro");
    expect(presentation.mediaType).toBe("video");
    expect(presentation.ctaLabel).toBe("Watch video");
    expect(presentation.showPlayIndicator).toBe(true);
    expect(presentation.thumbnailFallbackCategory).toBe("video");
    expect(getNewsMediaFallbackStyle(presentation.thumbnailFallbackCategory).tone).toBe(
      "video",
    );
    expect(getNewsMediaFallbackStyle(presentation.subjectFallbackCategory).tone).toBe(
      "macro",
    );
  });

  it("renders macro video with a trusted thumbnail using play indicator and Watch video", () => {
    const macroVideo = item({
      id: "fed-video-thumb",
      title: "Don't think the Fed should be hiking here",
      sourceType: "youtube",
      contentTypeLabel: "Video",
      marketCategory: "macro",
      category: "macro",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    });

    const presentation = buildNewsMediaPresentation(macroVideo);

    expect(presentation.subjectLabel).toBe("Macro");
    expect(presentation.mediaType).toBe("video");
    expect(presentation.ctaLabel).toBe("Watch video");
    expect(presentation.showPlayIndicator).toBe(true);
    expect(presentation.thumbnailFallbackCategory).toBe("video");
  });

  it("renders macro article with blue category fallback and Read article", () => {
    const macroArticle = item({
      id: "fed-article",
      title: "Fed officials signal patience on rates",
      sourceType: "news",
      contentTypeLabel: "News",
      marketCategory: "macro",
      category: "macro",
    });

    const presentation = buildNewsMediaPresentation(macroArticle);

    expect(presentation.mediaType).toBe("article");
    expect(presentation.ctaLabel).toBe("Read article");
    expect(presentation.showPlayIndicator).toBe(false);
    expect(presentation.thumbnailFallbackCategory).toBe("macro");
    expect(getNewsMediaFallbackStyle(presentation.thumbnailFallbackCategory).tone).toBe(
      "macro",
    );
  });
});

describe("news media type propagation", () => {
  it("propagates video media type through Markets Today stories", () => {
    const regions = buildMarketsTodayRegions({
      items: [
        item({
          id: "macro-video",
          title: "Don't think the Fed should be hiking here",
          sourceType: "youtube",
          contentTypeLabel: "Video",
          description: "Fed commentary from Bloomberg Television.",
        }),
      ],
    });

    const story = regions.flatMap((region) => region.stories)[0];
    expect(story?.mediaType).toBe("video");
    expect(story?.sourceType).toBe("youtube");
    expect(story?.marketCategory).toBe("macro");

    const presentation = buildMarketsTodayStoryPresentation({
      mediaType: story!.mediaType,
      marketCategory: story!.marketCategory,
      regionFallbackCategory: "regional",
    });

    expect(presentation.subjectLabel).toBe("Macro");
    expect(presentation.ctaLabel).toBe("Watch video");
    expect(presentation.thumbnailFallbackCategory).toBe("video");
    expect(presentation.showPlayIndicator).toBe(true);
  });

  it("keeps video presentation after ranking and dedup routes it into Markets Today", () => {
    const macroVideo = item({
      id: "fed-video",
      title: "Don't think the Fed should be hiking here",
      sourceType: "youtube",
      contentTypeLabel: "Video",
      relevanceScore: 12,
      canonicalUrl: "https://www.youtube.com/watch?v=fed-video",
    });

    const layout = buildNewsBriefingLayout(
      payload({
        macroNews: [macroVideo],
        marketVideos: [macroVideo],
      }),
    );

    const story = layout.marketsToday
      .flatMap((region) => region.stories)
      .find((entry) => entry.id === "fed-video");

    expect(story).toBeDefined();
    expect(story?.mediaType).toBe("video");
    expect(story?.canonicalUrl).toBe("https://www.youtube.com/watch?v=fed-video");

    const presentation = buildMarketsTodayStoryPresentation({
      mediaType: story!.mediaType,
      marketCategory: story!.marketCategory,
      regionFallbackCategory: "regional",
    });

    expect(presentation.subjectLabel).toBe("Macro");
    expect(presentation.ctaLabel).toBe("Watch video");
    expect(presentation.thumbnailFallbackCategory).toBe("video");
  });

  it("propagates media type into intelligence bullets and must-watch recommendations", () => {
    const macroVideo = item({
      id: "fed-video",
      title: "Don't think the Fed should be hiking here",
      sourceType: "youtube",
      contentTypeLabel: "Video",
      category: "macro",
      marketCategory: "macro",
      impactLevel: "High Impact",
    });

    const bullet = bulletFromNewsItem(macroVideo);
    expect(bullet.mediaType).toBe("video");
    expect(getNewsMediaCtaLabel(bullet.mediaType!)).toBe("Watch video");

    const intelligence = buildInvestmentIntelligence(
      payload({
        macroNews: [macroVideo],
        marketVideos: [macroVideo],
      }),
    );

    expect(intelligence.todayMatters.some((entry) => entry.mediaType === "video")).toBe(
      true,
    );
    expect(intelligence.mustWatch?.type).toBe("video");
    expect(intelligence.mustWatch?.canonicalUrl).toBe(macroVideo.canonicalUrl);
  });
});
