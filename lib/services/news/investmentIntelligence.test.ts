import { describe, expect, it, vi } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import {
  buildInvestmentIntelligence,
  createEmptyInvestmentIntelligence,
} from "@/lib/services/news/investmentIntelligence";
import { deriveInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
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

function payload(
  overrides: Partial<NewsApiResponse> = {},
): NewsApiResponse {
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

describe("investmentIntelligence", () => {
  it("returns a stable quiet-market view when no relevant news exists", () => {
    const intelligence = buildInvestmentIntelligence(payload());

    expect(intelligence.portfolioStatus).toBe("Stable");
    expect(intelligence.quietMarket).toBe(true);
    expect(intelligence.portfolioSummary).toContain("No material developments");
    expect(intelligence.todayMatters).toEqual([]);
    expect(intelligence.mustWatch).toBeNull();
  });

  it("builds a busy-day summary with portfolio status and bullets", () => {
    const intelligence = buildInvestmentIntelligence(
      payload({
        portfolioNews: [
          item({
            id: "p1",
            title: "NUKL uranium sector rally continues",
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
            impactLevel: "High Impact",
          }),
          item({
            id: "p2",
            title: "VWCE outflows raise concern",
            relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 3,
            matchedSymbols: ["VWCE"],
            description: "Investors cut exposure amid concern over valuations.",
            impactLevel: "Medium Impact",
          }),
        ],
        macroNews: [
          item({
            id: "m1",
            title: "Fed speech 20:00",
            category: "macro",
            marketCategory: "macro",
            impactLevel: "High Impact",
          }),
        ],
        upcomingEvents: [
          {
            id: "e1",
            title: "Fed speech",
            category: "fed",
            date: "2026-07-20",
            timeLabel: "20:00",
            country: "US",
            description: "Policy remarks.",
            impact: "High",
            source: "Calendar",
          },
        ],
      }),
    );

    expect(["Elevated", "High Attention"]).toContain(intelligence.portfolioStatus);
    expect(intelligence.portfolioSummary).toMatch(/holding/i);
    expect(intelligence.todayMatters.length).toBeGreaterThan(0);
    expect(intelligence.todayMatters.length).toBeLessThanOrEqual(3);
    expect(intelligence.todayMatters.some((bullet) => bullet.canonicalUrl)).toBe(
      true,
    );
    expect(intelligence.holdingInsights.positive).toContain("NUKL");
    expect(intelligence.holdingInsights.negative).toContain("VWCE");
  });

  it("recommends one must-watch item and prefers a portfolio-matched video when stronger", () => {
    const intelligence = buildInvestmentIntelligence(
      payload({
        portfolioNews: [
          item({
            id: "article",
            title: "General market recap",
            relevanceScore: 5,
          }),
        ],
        marketVideos: [
          item({
            id: "video",
            title: "NUKL uranium outlook improves",
            sourceType: "youtube",
            sourceName: "CNBC Television",
            contentTypeLabel: "Video",
            relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 8,
            matchedSymbols: ["NUKL"],
            description: "Sector rally and improving demand discussed.",
          }),
        ],
      }),
    );

    expect(intelligence.mustWatch).not.toBeNull();
    expect(intelligence.mustWatch?.type).toBe("video");
    expect(intelligence.mustWatch?.itemId).toBe("video");
  });

  it("does not promote weak promotional videos near the top", () => {
    const intelligence = buildInvestmentIntelligence(
      payload({
        marketVideos: [
          item({
            id: "promo",
            title: "Like and subscribe for more market updates",
            sourceType: "youtube",
            sourceName: "Coin Bureau",
            contentTypeLabel: "Video",
          }),
        ],
        macroNews: [
          item({
            id: "macro",
            title: "Global inflation update",
            category: "macro",
            marketCategory: "macro",
          }),
        ],
      }),
    );

    expect(intelligence.mustWatch?.itemId).not.toBe("promo");
    expect(intelligence.mustWatch?.type).toBe("article");
  });

  it("derives intelligence through the shared client helper without provider calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const newsPayload = payload({
      macroNews: [
        item({
          id: "macro",
          title: "Bitcoin ETF inflows continue",
          category: "crypto",
          marketCategory: "crypto",
        }),
      ],
    });

    const intelligence = deriveInvestmentIntelligence(newsPayload);

    expect(intelligence.macroHighlights.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("uses the same builder for empty fallback intelligence", () => {
    const empty = createEmptyInvestmentIntelligence("2026-07-20T08:00:00.000Z");
    expect(empty.quietMarket).toBe(true);
    expect(empty.portfolioStatus).toBe("Stable");
  });
});

describe("investment intelligence reuse", () => {
  it("dashboard and news pages import the shared panel and hook", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const dashboard = readFileSync(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const news = readFileSync(resolve(process.cwd(), "app/news/page.tsx"), "utf8");
    const hub = readFileSync(
      resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );

    expect(dashboard).toContain("useInvestmentIntelligence");
    expect(dashboard).toContain("DashboardIntelligenceSummary");
    expect(dashboard).not.toContain("PortfolioIntelligencePanel");
    expect(news).toContain("useInvestmentIntelligence");
    expect(hub).toContain("NewsBriefingIntelligence");
    expect(hub).not.toContain("TodaysMarketBriefHero");
  });
});
