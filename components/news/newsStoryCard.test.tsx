import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { NewsStoryCard } from "@/components/news/NewsStoryCard";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  buildNewsBriefingLayout,
  type PortfolioNewsCard,
} from "@/lib/services/news/newsBriefingLayout";
import { buildNewsBriefHeadlinePresentation } from "@/lib/services/news/newsMediaType";
import {
  countHoldingsMentionedInPortfolioCards,
  PORTFOLIO_NEWS_SECTION_ID,
} from "@/lib/services/news/portfolioNewsNav";
import { selectTrustedNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import type { NewsApiResponse } from "@/lib/types/newsContent";

function presentation() {
  return buildNewsBriefHeadlinePresentation({
    affectedMarket: "Macro",
    marketCategory: "macro",
    mediaType: "article",
  });
}

describe("NewsStoryCard", () => {
  it("renders a whole-card external link when the story URL is valid", () => {
    const html = renderToStaticMarkup(
      <NewsStoryCard
        headline="Fed signals slower cuts"
        summary="Policy path shifts."
        canonicalUrl="https://example.com/fed"
        presentation={presentation()}
        meta={<span>Macro</span>}
      />,
    );

    expect(html).toContain('href="https://example.com/fed"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Read article");
    expect(html).not.toMatch(/<a[^>]*>[\s\S]*<a/);
  });

  it("renders a non-clickable state when the story URL is missing", () => {
    const html = renderToStaticMarkup(
      <NewsStoryCard
        headline="Interpretation only"
        summary="No source attached."
        canonicalUrl="#"
        presentation={presentation()}
        meta={<span>Portfolio</span>}
      />,
    );

    expect(html).not.toContain('href="https://');
    expect(html).toContain("Source link unavailable");
    expect(html).toContain('aria-disabled="true"');
  });
});

describe("NewsMediaThumbnail", () => {
  it("renders a trusted article image when available", () => {
    const html = renderToStaticMarkup(
      <NewsMediaThumbnail
        thumbnailUrl="https://i3.ytimg.com/vi/abc123/hqdefault.jpg"
        sourceType="youtube"
        fallbackCategory="video"
        size="editorial"
        alt="Video still"
      />,
    );

    expect(html).toContain("https://i3.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(html).toContain('alt="Video still"');
    expect(html).toContain("aspect-video");
  });

  it("uses a compact fallback area when editorial size has no image", () => {
    const html = renderToStaticMarkup(
      <NewsMediaThumbnail
        thumbnailUrl={null}
        sourceType="news"
        fallbackCategory="macro"
        size="editorial"
      />,
    );

    expect(html).not.toContain("aspect-video");
    expect(html).toContain("h-11");
  });
});

describe("portfolio news navigation", () => {
  it("counts holdings from the same portfolio card set used on the page", () => {
    const cards: PortfolioNewsCard[] = [
      {
        item: {
          id: "1",
          title: "VWCE flows",
          sourceName: "Wire",
          sourceType: "news",
          canonicalUrl: "https://example.com/vwce",
          thumbnailUrl: null,
          publishedAt: "2026-07-20T08:00:00.000Z",
          description: "",
          summary: "",
          interpretation: "",
          impactLevel: "Low Impact",
          matchedHoldingIds: [],
          matchedSymbols: ["VWCE"],
          matchedHoldings: [],
          relevanceLabel: null,
          category: "markets",
          marketCategory: "equities",
          contentTypeLabel: "News",
          fetchedAt: "2026-07-20T08:00:00.000Z",
          relevanceScore: 10,
        },
        affectedHoldings: ["VWCE", "AAPL"],
        marketImpact: "Neutral",
        confidence: null,
      },
    ];

    expect(countHoldingsMentionedInPortfolioCards(cards)).toBe(2);
    expect(PORTFOLIO_NEWS_SECTION_ID).toBe("portfolio-news");
  });
});

describe("market brief insight URLs", () => {
  it("preserves canonical URLs and thumbnails through insight headlines", () => {
    const payload: NewsApiResponse = {
      success: true,
      marketBrief: {
        ...createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
        keyInsights: [
          {
            id: "macro-fact-1",
            label: "Confirmed macro headline",
            text: "Reuters: Inflation cools",
            kind: "macro",
            insightType: "fact",
            sourceName: "Reuters",
            canonicalUrl: "https://example.com/macro",
            thumbnailUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
            sourceType: "youtube",
          },
        ],
      },
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
    };

    const headline = buildNewsBriefingLayout(payload).marketBriefHeadlines[0];
    expect(headline?.canonicalUrl).toBe("https://example.com/macro");
    expect(headline?.thumbnailUrl).toBe(
      selectTrustedNewsThumbnail({
        thumbnailUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        sourceType: "youtube",
      }),
    );
  });
});
