import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  MARKETS_TODAY_REGION_VISUALS,
  MARKETS_TODAY_SENTIMENT_STYLES,
} from "@/components/news/marketsTodayVisuals";
import { MARKETS_TODAY_REGION_ORDER } from "@/lib/services/news/marketsTodayRegionalClassification";
import { buildMarketsTodayRegions } from "@/lib/services/news/newsMarketsToday";
import {
  isTrustedNewsThumbnailUrl,
  selectTrustedNewsThumbnail,
} from "@/lib/services/news/newsThumbnail";
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
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

describe("Markets Today Phase 2C visuals", () => {
  it("assigns distinct region tokens and icons to each region", () => {
    expect(Object.keys(MARKETS_TODAY_REGION_VISUALS).sort()).toEqual(
      [...MARKETS_TODAY_REGION_ORDER].sort(),
    );
    expect(MARKETS_TODAY_REGION_VISUALS.global.iconSurfaceClass).toContain(
      "violet",
    );
    expect(MARKETS_TODAY_REGION_VISUALS.europe.iconSurfaceClass).toContain(
      "blue",
    );
    expect(MARKETS_TODAY_REGION_VISUALS.us.iconSurfaceClass).toContain(
      "emerald",
    );
    expect(MARKETS_TODAY_REGION_VISUALS.asia.iconSurfaceClass).toContain(
      "amber",
    );
    expect(MARKETS_TODAY_REGION_VISUALS.crypto.iconSurfaceClass).toContain(
      "yellow",
    );
  });

  it("keeps sentiment styling separate from region identity", () => {
    expect(MARKETS_TODAY_SENTIMENT_STYLES.Positive.textClass).toContain(
      "emerald",
    );
    expect(MARKETS_TODAY_SENTIMENT_STYLES.Negative.textClass).toContain("red");
    expect(MARKETS_TODAY_REGION_VISUALS.us.accentBorderClass).toContain(
      "emerald",
    );
    expect(MARKETS_TODAY_SENTIMENT_STYLES.unavailable.label).toBe(
      "Sentiment unavailable",
    );
  });

  it("preserves all five Markets Today cards in the correct order", () => {
    const regions = buildMarketsTodayRegions({ items: [] });
    expect(regions.map((region) => region.id)).toEqual(MARKETS_TODAY_REGION_ORDER);
  });

  it("propagates trusted thumbnails and media type into Markets Today stories", () => {
    const regions = buildMarketsTodayRegions({
      items: [
        item({
          id: "video-story",
          title: "Global markets video recap",
          description: "World markets mixed overnight.",
          sourceType: "youtube",
          contentTypeLabel: "Video",
          thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        }),
      ],
    });

    const stories = regions.flatMap((region) => region.stories);
    expect(stories.some((story) => story.thumbnailUrl?.includes("i.ytimg.com"))).toBe(
      true,
    );
    expect(stories.some((story) => story.mediaType === "video")).toBe(true);
  });

  it("uses a balanced desktop grid without Show more controls", () => {
    const sectionSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMarketsTodaySection.tsx"),
      "utf8",
    );
    const visualSource = readFileSync(
      path.resolve(process.cwd(), "components/news/marketsTodayVisuals.ts"),
      "utf8",
    );
    expect(sectionSource).toContain("xl:grid-cols-6");
    expect(sectionSource).toContain("marketsTodayRegionGridClass");
    expect(visualSource).toContain("xl:col-span-2");
    expect(visualSource).toContain("xl:col-span-3");
    expect(sectionSource).not.toContain("Show more");
    expect(sectionSource).toContain("MARKETS_TODAY_REGION_VISUALS");
    expect(sectionSource).toContain("MARKETS_TODAY_SENTIMENT_STYLES");
  });
});

describe("News media rendering contracts", () => {
  it("selects trusted YouTube thumbnails from existing metadata", () => {
    expect(
      selectTrustedNewsThumbnail({
        thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        sourceType: "youtube",
      }),
    ).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
  });

  it("returns null when image metadata is missing", () => {
    expect(
      selectTrustedNewsThumbnail({
        thumbnailUrl: null,
        sourceType: "news",
      }),
    ).toBeNull();
  });

  it("rejects unsafe or non-HTTPS image URLs", () => {
    expect(isTrustedNewsThumbnailUrl("javascript:alert(1)")).toBe(false);
    expect(
      isTrustedNewsThumbnailUrl("http://i.ytimg.com/vi/abc123/hqdefault.jpg"),
    ).toBe(false);
    expect(
      isTrustedNewsThumbnailUrl("https://example.com/image.jpg"),
    ).toBe(false);
  });

  it("wires image error fallback in the media component", () => {
    const mediaSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMediaThumbnail.tsx"),
      "utf8",
    );
    expect(mediaSource).toContain("onError");
    expect(mediaSource).toContain("getNewsMediaFallbackIcon");
    expect(mediaSource).toContain("getNewsMediaFallbackStyle");
    expect(mediaSource).not.toContain("fetch(");
  });

  it("uses shared category fallback tokens in the media component", () => {
    const mediaSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMediaThumbnail.tsx"),
      "utf8",
    );
    const fallbackSource = readFileSync(
      path.resolve(process.cwd(), "components/news/newsMediaFallback.ts"),
      "utf8",
    );

    expect(mediaSource).toContain("fallbackStyle.surfaceClass");
    expect(mediaSource).toContain("fallbackStyle.borderClass");
    expect(mediaSource).toContain("fallbackStyle.iconClass");
    expect(fallbackSource).toContain("NEWS_MEDIA_FALLBACK_TONE_STYLES");
    expect(fallbackSource).toContain("NEWS_MEDIA_FALLBACK_CATEGORY_TONES");
  });

  it("uses compact media in supporting and portfolio sections", () => {
    const articleRow = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsCompactArticleRow.tsx"),
      "utf8",
    );
    const portfolioSection = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsForPortfolioSection.tsx"),
      "utf8",
    );
    const marketBrief = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMarketBriefSection.tsx"),
      "utf8",
    );

    expect(articleRow).toContain("NewsMediaThumbnail");
    expect(portfolioSection).toContain('size="compact"');
    expect(marketBrief).toContain("NewsMediaThumbnail");
  });

  it("uses editorial Top Story and compact supporting coverage layouts", () => {
    const intelligenceSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsBriefingIntelligence.tsx"),
      "utf8",
    );

    expect(intelligenceSource).toContain('size="editorial"');
    expect(intelligenceSource).toContain("NewsCompactArticleRow");
    expect(intelligenceSource).toContain("Top story");
  });

  it("uses verified YouTube thumbnails with a play indicator in video rows", () => {
    const videoRow = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsCompactVideoRow.tsx"),
      "utf8",
    );

    expect(videoRow).toContain("NewsMediaThumbnail");
    expect(videoRow).toContain("showPlayIndicator");
  });

  it("preserves Show more and Show less accessibility", () => {
    const sectionSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsBriefingSection.tsx"),
      "utf8",
    );

    expect(sectionSource).toContain("Show more");
    expect(sectionSource).toContain("Show less");
    expect(sectionSource).toContain("aria-expanded");
    expect(sectionSource).toContain("aria-controls");
  });

  it("uses decorative alt text for adjacent headline thumbnails", () => {
    const mediaSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsMediaThumbnail.tsx"),
      "utf8",
    );
    expect(mediaSource).toContain("alt={alt}");
  });
});
