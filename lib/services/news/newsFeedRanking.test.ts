import { describe, expect, it, vi } from "vitest";

import {
  applyFeedDiversityRules,
  buildNewsHubLayout,
  buildRankedSearchResults,
  canPlaceInDiverseFeed,
  computeNewsRankScore,
  countConsecutiveVideos,
  isLowQualityVideo,
  isStrongPortfolioItem,
} from "@/lib/services/news/newsFeedRanking";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";

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
    interpretation: "",
    impactLevel: "Low Impact",
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

describe("newsFeedRanking", () => {
  it("ranks portfolio-matched videos above unrelated articles", () => {
    const portfolioVideo = item({
      id: "video-portfolio",
      title: "NUKL uranium sector update",
      sourceType: "youtube",
      sourceName: "CNBC Television",
      contentTypeLabel: "Video",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
      matchedSymbols: ["NUKL"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "NUKL",
          name: "Nuclear ETF",
          providerSymbol: "NUKL.XETRA",
        },
      ],
    });
    const unrelatedArticle = item({
      id: "article-unrelated",
      title: "Generic market open recap",
      publishedAt: "2026-07-20T12:00:00.000Z",
    });

    const ranked = applyFeedDiversityRules(
      [unrelatedArticle, portfolioVideo],
      Date.parse("2026-07-20T13:00:00.000Z"),
    );

    expect(ranked[0]?.id).toBe("video-portfolio");
    expect(computeNewsRankScore(portfolioVideo)).toBeGreaterThan(
      computeNewsRankScore(unrelatedArticle),
    );
  });

  it("suppresses weak promotional videos from ranking near the top", () => {
    const promoVideo = item({
      id: "promo",
      title: "Like and subscribe for more market updates",
      sourceType: "youtube",
      sourceName: "Coin Bureau",
      contentTypeLabel: "Video",
      publishedAt: "2026-07-20T12:00:00.000Z",
    });
    const article = item({
      id: "article",
      title: "Fed rate decision drives global markets",
      category: "macro",
      marketCategory: "macro",
    });

    expect(isLowQualityVideo(promoVideo)).toBe(true);

    const layout = buildNewsHubLayout([promoVideo, article]);
    expect(layout.marketsMacro[0]?.id).toBe("article");
    expect(layout.latestRelevantFeed.some((entry) => entry.id === "promoVideo")).toBe(
      false,
    );
    expect(layout.moreVideos).toEqual([]);
  });

  it("allows at most two consecutive videos in the ranked feed", () => {
    const current = [
      item({ id: "v1", title: "Video one", sourceType: "youtube", sourceName: "CNBC Television" }),
      item({ id: "v2", title: "Video two", sourceType: "youtube", sourceName: "Bloomberg Television" }),
    ];
    const nextVideo = item({
      id: "v3",
      title: "Video three",
      sourceType: "youtube",
      sourceName: "Coin Bureau",
    });

    expect(countConsecutiveVideos(current)).toBe(2);
    expect(canPlaceInDiverseFeed(current, nextVideo)).toBe(false);
  });

  it("avoids placing the same source back-to-back and suppresses near-duplicate headlines", () => {
    const first = item({ id: "1", title: "Apple earnings beat expectations", sourceName: "CNBC Television" });
    const duplicate = item({
      id: "2",
      title: "Apple earnings beat expectations today",
      sourceName: "Bloomberg Television",
    });
    const sameSource = item({
      id: "3",
      title: "Oil prices climb on supply concerns",
      sourceName: "CNBC Television",
    });

    expect(canPlaceInDiverseFeed([first], duplicate)).toBe(false);
    expect(canPlaceInDiverseFeed([first], sameSource)).toBe(false);
  });

  it("keeps strong portfolio and macro highlights near the top of the layout", () => {
    const portfolioStory = item({
      id: "portfolio",
      title: "VWCE flows remain strong",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
      matchedSymbols: ["VWCE"],
    });
    const macroStory = item({
      id: "macro",
      title: "ECB signals next policy move",
      category: "macro",
      marketCategory: "macro",
    });
    const filler = item({
      id: "filler",
      title: "General market note",
      marketCategory: "general",
    });

    const layout = buildNewsHubLayout([filler, macroStory, portfolioStory]);

    expect(layout.topPortfolioStories[0]?.id).toBe("portfolio");
    expect(layout.marketsMacro[0]?.id).toBe("macro");
    expect(layout.latestRelevantFeed.some((entry) => entry.id === "filler")).toBe(true);
  });

  it("includes videos in ranked search results without making provider calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const results = buildRankedSearchResults([
      item({ id: "article", title: "IB1T crypto outlook" }),
      item({
        id: "video",
        title: "IB1T bitcoin ETF explained",
        sourceType: "youtube",
        sourceName: "Coin Bureau",
        relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
        matchedSymbols: ["IB1T"],
      }),
    ]);

    expect(results.some((entry) => entry.sourceType === "youtube")).toBe(true);
    expect(isStrongPortfolioItem(results[0]!)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("newsSearchFilter with ranked videos", () => {
  it("includes videos when filtering by portfolio scope", async () => {
    const { filterNewsItems } = await import("@/lib/services/news/newsSearchFilter");
    const { STRONG_PORTFOLIO_MATCH_SCORE: strongScore } = await import(
      "@/lib/services/news/relevanceMatching"
    );

    const video = item({
      id: "video",
      title: "VWCE ETF flows explained",
      sourceType: "youtube",
      relevanceScore: strongScore,
      matchedSymbols: ["VWCE"],
    });

    const filtered = filterNewsItems([video], "", "portfolio");
    expect(filtered).toHaveLength(1);
  });
});
