import { describe, expect, it } from "vitest";

import {
  buildDiscoverSnapshot,
  DISCOVER_SNAPSHOT_TTL_MS,
} from "@/lib/services/discover/buildDiscoverSnapshot";
import { QUIET_STATE_MESSAGE } from "@/lib/services/discover/thingsYouMayHaveMissed";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  const { symbol, name, ...rest } = overrides;
  return {
    id: `${symbol}-id`,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: `${symbol}.XETRA`,
    ...rest,
    symbol,
    name,
  };
}

function newsItem(
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
    impactLevel: "High Impact",
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
      activeSourceNames: ["Bloomberg Television"],
      unavailableSourceCount: 0,
    },
    ...overrides,
  };
}

describe("buildDiscoverSnapshot", () => {
  it("builds a deterministic snapshot with freshness metadata", () => {
    const holdings = [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })];
    const fingerprint = portfolioContentFingerprint(holdings, null);
    const newsPayload = payload();

    const first = buildDiscoverSnapshot({
      holdings,
      portfolioFingerprint: fingerprint,
      newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      intelligenceFromCache: true,
      newsStale: false,
      now: new Date("2026-07-20T12:00:00.000Z"),
    });
    const second = buildDiscoverSnapshot({
      holdings,
      portfolioFingerprint: fingerprint,
      newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      intelligenceFromCache: true,
      newsStale: false,
      now: new Date("2026-07-20T12:00:00.000Z"),
    });

    expect(first).toEqual(second);
    expect(first.generatedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(
      new Date(first.expiresAt).getTime() - new Date(first.generatedAt).getTime(),
    ).toBe(DISCOVER_SNAPSHOT_TTL_MS);
    expect(first.freshness).toBe("fresh");
  });
});

describe("buildThingsYouMayHaveMissed", () => {
  it("prioritizes holding risk over macro and limits to three items", () => {
    const newsPayload = payload({
      portfolioNews: [
        newsItem({
          id: "p1",
          title: "VWCE outflows raise concern",
          matchedSymbols: ["VWCE"],
          relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 2,
        }),
      ],
      macroNews: [
        newsItem({
          id: "m1",
          title: "Global inflation update",
          marketCategory: "macro",
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
          source: "calendar",
        },
      ],
    });
    const intelligence = buildInvestmentIntelligence(newsPayload);
    intelligence.keyRisks = ["Review one holding with elevated concentration risk."];
    intelligence.portfolioStatus = "High Attention";

    const snapshot = buildDiscoverSnapshot({
      holdings: [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })],
      portfolioFingerprint: "fp",
      newsPayload,
      intelligence,
      intelligenceFromCache: true,
      newsStale: false,
    });

    expect(snapshot.thingsYouMayHaveMissed.length).toBeLessThanOrEqual(3);
    expect(snapshot.thingsYouMayHaveMissed[0]?.kind).toBe("holding_risk");
    expect(snapshot.thingsYouMayHaveMissed[0]?.headline).toContain("concentration risk");
  });

  it("returns a useful quiet state without market-close wording", () => {
    const snapshot = buildDiscoverSnapshot({
      holdings: [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })],
      portfolioFingerprint: "fp",
      newsPayload: payload(),
      intelligence: buildInvestmentIntelligence(payload()),
      intelligenceFromCache: true,
      newsStale: false,
    });

    expect(snapshot.thingsYouMayHaveMissed).toHaveLength(1);
    expect(snapshot.thingsYouMayHaveMissed[0]?.headline).toBe(QUIET_STATE_MESSAGE);
    expect(snapshot.thingsYouMayHaveMissed[0]?.headline.toLowerCase()).not.toContain(
      "after market close",
    );
  });
});

describe("portfolio blind spots", () => {
  it("marks unknown separately from not represented", () => {
    const snapshot = buildDiscoverSnapshot({
      holdings: [
        holding({
          symbol: "UNKNOWN",
          name: "Unclassified ETF",
          providerSymbol: "UNKNOWN.LSE",
        }),
      ],
      portfolioFingerprint: "fp",
      newsPayload: null,
      intelligence: null,
      intelligenceFromCache: false,
      newsStale: true,
    });

    const healthcare = snapshot.portfolioCoverage.categories.find(
      (category) => category.id === "healthcare",
    );
    expect(healthcare?.level).toBe("unknown");
    expect(healthcare?.detail.toLowerCase()).toContain("could not be determined");
  });

  it("classifies cash separately and avoids advisory language", () => {
    const snapshot = buildDiscoverSnapshot({
      holdings: [
        holding({
          symbol: "CASH",
          name: "Cash",
          assetType: "cash",
          providerSymbol: null,
        }),
      ],
      portfolioFingerprint: "fp",
      newsPayload: null,
      intelligence: null,
      intelligenceFromCache: false,
      newsStale: true,
    });

    const cash = snapshot.portfolioCoverage.categories.find(
      (category) => category.id === "cash",
    );
    expect(cash?.level).toBe("limited");
    expect(JSON.stringify(snapshot.portfolioCoverage)).not.toMatch(/should add|you need|buy/i);
  });
});

describe("related investments", () => {
  it("excludes the original holding and avoids recommendation wording", () => {
    const snapshot = buildDiscoverSnapshot({
      holdings: [
        holding({ symbol: "NUKL", name: "VanEck Uranium and Nuclear ETF" }),
        holding({ symbol: "4COP", name: "Global X Copper Miners UCITS ETF" }),
      ],
      portfolioFingerprint: "fp",
      newsPayload: payload(),
      intelligence: buildInvestmentIntelligence(payload()),
      intelligenceFromCache: true,
      newsStale: false,
      now: new Date("2026-07-20T12:00:00.000Z"),
    });

    const spotlight = snapshot.relatedInvestmentGroups.spotlight;
    expect(spotlight).not.toBeNull();
    expect(spotlight?.relatedInstruments.length).toBeLessThanOrEqual(3);
    for (const related of spotlight?.relatedInstruments ?? []) {
      expect(related.symbol).not.toBe(spotlight?.symbol);
      expect(related.oneYearReturn.label).toBe("1-year return unavailable");
      expect(related.relationshipLabel.toLowerCase()).not.toContain("recommended");
    }
  });
});
