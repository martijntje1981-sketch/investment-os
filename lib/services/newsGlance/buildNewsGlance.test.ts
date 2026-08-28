import { describe, expect, it } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import {
  NEWS_GLANCE_NO_MATERIAL,
  assertNoNewsGlanceAdvisoryLanguage,
  buildNewsGlance,
} from "@/lib/services/newsGlance";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
    change24hPercent: overrides.change24hPercent,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Test Wire",
    sourceType: "news",
    canonicalUrl: `https://example.test/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: overrides.publishedAt ?? "2026-08-18T10:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: overrides.matchedHoldingIds ?? [],
    matchedSymbols: overrides.matchedSymbols ?? [],
    matchedHoldings: overrides.matchedHoldings ?? [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: overrides.relevanceScore ?? 0,
    ...overrides,
  };
}

function payload(items: NewsContentItem[], macro: NewsContentItem[] = []): NewsApiResponse {
  const fetchedAt = "2026-08-18T12:00:00.000Z";
  return {
    success: true,
    marketBrief: createEmptyMarketBrief(fetchedAt),
    portfolioNews: items,
    macroNews: macro,
    marketVideos: [],
    upcomingEvents: [],
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: fetchedAt,
      sourceCount: 1,
      activeSourceNames: ["Test Wire"],
      unavailableSourceCount: 0,
    },
    sourceErrors: [],
    fetchedAt,
  };
}

function bitcoinHeavyHoldings(): StoredPortfolioHolding[] {
  return [
    holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
      quantity: 1,
      currentPrice: 600,
      previousClose: 500,
      purchasePrice: 400,
    }),
    holding({
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
      providerSymbol: "NUKL.XETRA",
      quantity: 10,
      currentPrice: 10,
      previousClose: 9.95,
    }),
    holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerSymbol: "VWCE.XETRA",
      quantity: 10,
      currentPrice: 10,
      previousClose: 9.98,
    }),
  ];
}

function bitcoinArticles(count: number): NewsContentItem[] {
  return Array.from({ length: count }, (_, index) =>
    newsItem({
      id: `btc-${index}`,
      title: `Bitcoin ETF flows update ${index} from the desk`,
      matchedSymbols: ["IB1T"],
      matchedHoldingIds: ["IB1T-id"],
      matchedHoldings: [
        {
          id: "IB1T-id",
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
        },
      ],
      relevanceScore: 22,
      marketCategory: "crypto",
      category: "crypto",
    }),
  );
}

describe("buildNewsGlance", () => {
  it("uses canonical original URLs on holding rows with relevant news", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        providerSymbol: "VWCE.XETRA",
        quantity: 20,
        currentPrice: 140,
        previousClose: 138,
      }),
    ];
    const item = newsItem({
      id: "vwce-1",
      title: "All-world ETF sees record European inflows this week",
      canonicalUrl: "https://example.test/vwce-original",
      matchedSymbols: ["VWCE"],
      matchedHoldingIds: ["VWCE-id"],
      matchedHoldings: [
        {
          id: "VWCE-id",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.XETRA",
        },
      ],
      relevanceScore: 22,
    });
    const newsPayload = payload([item]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });

    const row = glance.holdingRows.find((entry) => entry.symbol === "VWCE");
    expect(row?.canonicalUrl).toBe("https://example.test/vwce-original");
    expect(row?.matchKind).toBe("direct");
    expect(row?.classificationLabel).toBe("Direct");
    expect(row?.emptyCopy).toBeNull();
  });

  it("uses a designed fallback when no thumbnail exists", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 20,
        currentPrice: 140,
        previousClose: 138,
      }),
    ];
    const item = newsItem({
      id: "vwce-2",
      title: "Global equity funds attract fresh European inflows",
      thumbnailUrl: null,
      matchedSymbols: ["VWCE"],
      matchedHoldingIds: ["VWCE-id"],
      relevanceScore: 22,
    });
    const newsPayload = payload([item]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const row = glance.holdingRows.find((entry) => entry.symbol === "VWCE");
    expect(row?.hasThumbnail).toBe(false);
    expect(row?.thumbnailUrl).toBeNull();
    expect(row?.fallbackCategory).toBeTruthy();
  });

  it("keeps direct, contextual and empty states distinguishable", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      ...bitcoinArticles(1),
      newsItem({
        id: "nukl-strong",
        title: "Uranium miners rally on utility contracting demand",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        matchedHoldings: [
          {
            id: "NUKL-id",
            symbol: "NUKL",
            name: "VanEck Uranium ETF",
            providerSymbol: "NUKL.XETRA",
          },
        ],
        relevanceScore: 22,
      }),
    ];
    const newsPayload = payload(items);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });

    const kinds = new Set(glance.holdingRows.map((row) => row.matchKind));
    expect(kinds.has("direct") || kinds.has("sector") || kinds.has("none")).toBe(
      true,
    );
    expect(
      glance.holdingRows.every(
        (row) =>
          (row.matchKind === "none" && row.emptyCopy === NEWS_GLANCE_NO_MATERIAL) ||
          (row.matchKind !== "none" && row.classificationLabel != null),
      ),
    ).toBe(true);
  });

  it("does not invent an article when no relevant news exists", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 20,
        currentPrice: 100,
        previousClose: 100,
      }),
    ];
    const newsPayload = payload([]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const row = glance.holdingRows.find((entry) => entry.symbol === "VWCE");
    if (row) {
      expect(row.matchKind).toBe("none");
      expect(row.emptyCopy).toBe(NEWS_GLANCE_NO_MATERIAL);
      expect(row.canonicalUrl).toBeNull();
      expect(row.headline).toBeNull();
    } else {
      expect(glance.holdingRows).toEqual([]);
    }
  });

  it("does not flood the visible surface with the same dominant story", () => {
    const holdings = bitcoinHeavyHoldings();
    const newsPayload = payload(bitcoinArticles(24));
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const linkedBitcoin = glance.holdingRows.filter(
      (row) =>
        (row.symbol === "IB1T" || row.exposureLabel === "Bitcoin") &&
        row.canonicalUrl,
    );
    expect(linkedBitcoin.length).toBeLessThanOrEqual(1);
    const allUrls = glance.holdingRows
      .map((row) => row.canonicalUrl)
      .filter((url): url is string => Boolean(url));
    expect(new Set(allUrls).size).toBe(allUrls.length);
  });

  it("lets a smaller holding appear when it has stronger direct relevance", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      ...bitcoinArticles(40),
      newsItem({
        id: "nukl-strong",
        title: "Uranium miners rally on utility contracting demand",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        matchedHoldings: [
          {
            id: "NUKL-id",
            symbol: "NUKL",
            name: "VanEck Uranium ETF",
            providerSymbol: "NUKL.XETRA",
          },
        ],
        relevanceScore: 22,
      }),
    ];
    const newsPayload = payload(items);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    expect(glance.holdingRows.some((row) => row.symbol === "NUKL")).toBe(true);
    const nukl = glance.holdingRows.find((row) => row.symbol === "NUKL");
    expect(nukl?.matchKind).toBe("direct");
    expect(nukl?.canonicalUrl).toContain("nukl-strong");
  });

  it("omits What Tobailey sees when the market is quiet", () => {
    const newsPayload = payload([]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings: bitcoinHeavyHoldings(),
    });
    expect(glance.synthesis).toBeNull();
    expect(glance.biggerPicture).toEqual([]);
  });

  it("does not use advisory buy/sell/hold language", () => {
    const holdings = bitcoinHeavyHoldings();
    const newsPayload = payload([
      ...bitcoinArticles(1),
      newsItem({
        id: "nukl-strong",
        title: "Uranium miners rally on utility contracting demand",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: 22,
      }),
    ]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const texts = [
      ...glance.holdingRows.flatMap((row) => [
        row.headline ?? "",
        row.emptyCopy ?? "",
      ]),
      ...glance.biggerPicture.map((item) => `${item.headline} ${item.relevanceCue}`),
      glance.synthesis?.text ?? "",
    ];
    expect(() => assertNoNewsGlanceAdvisoryLanguage(texts)).not.toThrow();
  });
});
