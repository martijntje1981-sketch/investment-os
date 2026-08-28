import { describe, expect, it } from "vitest";

import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import {
  NEWS_GLANCE_MARKET_REGION_IDS,
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
    expect(row?.matchKind).toBe("sector");
    expect(row?.classificationLabel).toBe("Context");
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
    expect(nukl?.matchKind).toBe("sector");
    expect(nukl?.classificationLabel).toBe("Context");
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

  it("labels identity-in-copy coverage as Direct", () => {
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
      id: "vwce-direct",
      title: "VWCE sees record European inflows this week",
      canonicalUrl: "https://example.test/vwce-direct",
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
    expect(row?.matchKind).toBe("direct");
    expect(row?.classificationLabel).toBe("Direct");
    expect(row?.canonicalUrl).toBe("https://example.test/vwce-direct");
  });

  it("does not promote symbol-tag-only coverage to Direct", () => {
    const holdings = [
      holding({
        symbol: "YLDX",
        name: "Strategy Yield ETP",
        providerSymbol: "YLDX.XETRA",
        quantity: 20,
        currentPrice: 100,
        previousClose: 99,
      }),
    ];
    const item = newsItem({
      id: "bonds-wire",
      title:
        "Warsh Doesn’t Run Much Risk of Losing Control of Bonds, Says Strategist",
      articleSymbols: ["YLDX"],
      matchedSymbols: ["YLDX"],
      matchedHoldingIds: ["YLDX-id"],
      relevanceScore: 22,
    });
    const newsPayload = payload([item]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const row = glance.holdingRows.find((entry) => entry.symbol === "YLDX");
    expect(row?.headline).toContain("Warsh");
    expect(row?.matchKind).toBe("sector");
    expect(row?.classificationLabel).toBe("Context");
    expect(row?.matchKind).not.toBe("direct");
  });

  it("keeps around-the-markets to US, Europe, Asia and Crypto from Markets Today", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        quantity: 10,
        currentPrice: 100,
        previousClose: 100,
      }),
    ];
    const regional = [
      newsItem({
        id: "us-tape",
        title: "Federal Reserve and S&P 500 futures firm on Wall Street",
        category: "markets",
        marketCategory: "equities",
      }),
      newsItem({
        id: "eu-tape",
        title: "ECB comments weigh on German DAX and euro area stocks",
        category: "markets",
        marketCategory: "equities",
      }),
      newsItem({
        id: "asia-tape",
        title: "Nikkei and Hang Seng rise as Japan and China stocks firm",
        category: "markets",
        marketCategory: "equities",
      }),
      newsItem({
        id: "crypto-tape",
        title: "Bitcoin and cryptocurrency funds see fresh inflows",
        category: "crypto",
        marketCategory: "crypto",
      }),
    ];
    const newsPayload = payload([], regional);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });

    expect(glance.aroundTheMarkets.map((tile) => tile.id)).toEqual([
      ...NEWS_GLANCE_MARKET_REGION_IDS,
    ]);
    expect(glance.aroundTheMarkets.map((tile) => tile.label)).toEqual([
      "US",
      "Europe",
      "Asia",
      "Crypto",
    ]);
    expect(
      glance.aroundTheMarkets.every(
        (tile) => tile.href === NEWS_MARKETS_TODAY_HREF,
      ),
    ).toBe(true);
    expect(
      glance.aroundTheMarkets.every((tile) => !("changePercent" in tile)),
    ).toBe(true);
    expect(
      glance.aroundTheMarkets.every((tile) => !/%/.test(tile.statusLabel)),
    ).toBe(true);

    const byId = Object.fromEntries(
      glance.aroundTheMarkets.map((tile) => [tile.id, tile]),
    );
    expect(byId.us?.available).toBe(true);
    expect(byId.europe?.available).toBe(true);
    expect(byId.asia?.available).toBe(true);
    expect(byId.crypto?.available).toBe(true);
    expect(byId.crypto?.visualFamily).toBe("crypto");
    expect(byId.us?.visualFamily).toBe("macro");
  });

  it("shows a quiet unavailable state when a region has no Markets Today stories", () => {
    const newsPayload = payload([]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings: bitcoinHeavyHoldings(),
    });
    expect(glance.aroundTheMarkets).toHaveLength(4);
    for (const tile of glance.aroundTheMarkets) {
      expect(tile.available).toBe(false);
      expect(tile.statusLabel).toBe("Unavailable");
      expect(tile.signal).toBeNull();
      expect(tile.href).toBe(NEWS_MARKETS_TODAY_HREF);
      expect(tile.statusLabel).not.toMatch(/[+-]?\d/);
    }
  });

  it("omits Bigger Picture when there is no meaningful broader context", () => {
    const newsPayload = payload(bitcoinArticles(1));
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings: bitcoinHeavyHoldings(),
    });
    expect(glance.biggerPicture).toEqual([]);
  });

  it("still renders Bigger Picture when broader context has portfolio relevance", () => {
    const holdings = [
      holding({
        symbol: "NUKL",
        name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
        providerSymbol: "NUKL.XETRA",
        quantity: 40,
        currentPrice: 20,
        previousClose: 20,
      }),
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 10,
        previousClose: 10,
      }),
    ];
    const portfolioItem = newsItem({
      id: "nukl-miners",
      title: "Uranium miners rally on utility contracting demand",
      matchedSymbols: ["NUKL"],
      matchedHoldingIds: ["NUKL-id"],
      relevanceScore: 22,
    });
    const broader = newsItem({
      id: "nuclear-fuel",
      title: "Nuclear fuel cycle contracts tighten for utilities",
      category: "macro",
      marketCategory: "commodities",
      matchedSymbols: ["NUKL"],
      matchedHoldingIds: ["NUKL-id"],
      relevanceScore: 10,
    });
    const newsPayload = payload([portfolioItem], [broader]);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    expect(glance.biggerPicture.length).toBeGreaterThan(0);
    expect(glance.biggerPicture[0]?.relevanceCue).toMatch(/relevant/i);
    expect(glance.biggerPicture.length).toBeLessThanOrEqual(3);
  });

  it("does not render What Tobailey sees for large holding plus article alone", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 10,
        currentPrice: 600,
        previousClose: 600,
        purchasePrice: 400,
      }),
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        quantity: 1,
        currentPrice: 10,
        previousClose: 10,
      }),
    ];
    const newsPayload = payload(bitcoinArticles(1));
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    expect(glance.holdingRows.some((row) => row.symbol === "IB1T" && row.headline)).toBe(
      true,
    );
    expect(glance.synthesis).toBeNull();
  });

  it("can render What Tobailey sees when a meaningful move meets relevant coverage", () => {
    const newsPayload = payload(bitcoinArticles(1));
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings: bitcoinHeavyHoldings(),
    });
    expect(glance.synthesis).not.toBeNull();
    expect(glance.synthesis?.text).toMatch(/moved/i);
    expect(glance.synthesis?.text).not.toMatch(/represents \d+% of portfolio value/i);
  });

  it("can render What Tobailey sees when one theme reaches more than one holding", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 1,
        currentPrice: 100,
        previousClose: 100,
      }),
      holding({
        symbol: "CBTC",
        name: "Bitcoin Tracker ETP",
        providerSymbol: "CBTC.XETRA",
        quantity: 1,
        currentPrice: 100,
        previousClose: 100,
      }),
    ];
    const items = [
      newsItem({
        id: "btc-a",
        title: "Bitcoin ETF flows update from the desk",
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
      newsItem({
        id: "btc-b",
        title: "Spot bitcoin products see a second day of inflows",
        matchedSymbols: ["CBTC"],
        matchedHoldingIds: ["CBTC-id"],
        matchedHoldings: [
          {
            id: "CBTC-id",
            symbol: "CBTC",
            name: "Bitcoin Tracker ETP",
            providerSymbol: "CBTC.XETRA",
          },
        ],
        relevanceScore: 22,
        marketCategory: "crypto",
        category: "crypto",
      }),
    ];
    const newsPayload = payload(items);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    expect(glance.synthesis).not.toBeNull();
    expect(glance.synthesis?.text).toMatch(/more than one holding/i);
  });

  it("derives accent families from semantic context, not row order", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      ...bitcoinArticles(1),
      newsItem({
        id: "nukl-strong",
        title: "Uranium miners rally on utility contracting demand",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        relevanceScore: 22,
        marketCategory: "commodities",
      }),
    ];
    const newsPayload = payload(items);
    const glance = buildNewsGlance({
      payload: newsPayload,
      intelligence: buildInvestmentIntelligence(newsPayload),
      holdings,
    });
    const btc = glance.holdingRows.find((row) => row.symbol === "IB1T");
    const nukl = glance.holdingRows.find((row) => row.symbol === "NUKL");
    expect(btc?.visualFamily).toBe("crypto");
    expect(nukl?.visualFamily === "holding" || nukl?.visualFamily === "commodities").toBe(
      true,
    );
    expect(glance.aroundTheMarkets.find((tile) => tile.id === "crypto")?.visualFamily).toBe(
      "crypto",
    );
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
