import { describe, expect, it } from "vitest";

import {
  buildCryptoIntelligenceProfile,
  buildCryptoMarketContext,
  personalizeCryptoMarketIntelligence,
  selectCryptoNewsMatters,
  selectDashboardCryptoConclusion,
} from "@/lib/services/cryptoIntelligence";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "crypto",
    ...overrides,
  };
}

function news(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Test",
    sourceType: "news",
    canonicalUrl: "https://example.com",
    thumbnailUrl: null,
    publishedAt: "2026-08-17T10:00:00.000Z",
    description: null,
    summary: "",
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "crypto",
    marketCategory: "crypto",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-17T10:00:00.000Z",
    relevanceScore: 10,
    ...overrides,
  };
}

describe("buildCryptoMarketContext", () => {
  it("marks optional market structure signals unavailable without inventing them", () => {
    const profile = buildCryptoIntelligenceProfile([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 50_000,
        change24hPercent: 1.2,
        change24hAmount: 600,
      }),
    ]);
    const context = buildCryptoMarketContext({ profile, holdings: [holding({
      symbol: "BTC",
      name: "Bitcoin",
      currentPrice: 50_000,
      change24hPercent: 1.2,
      change24hAmount: 600,
    })] });
    expect(context.bitcoinDominance.available).toBe(false);
    expect(context.etfFlows.available).toBe(false);
    expect(context.liquidity.available).toBe(false);
    expect(context.totalMarketCap.available).toBe(false);
  });

  it("classifies constructive regime on broad positive majors", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 40_000,
        change24hPercent: 1.5,
        change24hAmount: 600,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        currentPrice: 20_000,
        change24hPercent: 1.2,
        change24hAmount: 240,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({
      profile,
      holdings,
      marketMajors: [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", changePercent: 1.8 },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", changePercent: 1.4 },
        { id: "solana", symbol: "SOL", name: "Solana", changePercent: 2.1 },
        { id: "xrp", symbol: "XRP", name: "XRP", changePercent: 1.1 },
      ],
    });
    expect(context.regime).toBe("Constructive");
    expect(context.leadership.kind).toBe("broad_participation");
    expect(context.breadth.label).toBe("broad_up");
  });

  it("detects bitcoin leadership when BTC holds up and alts weaken", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 50_000,
        change24hPercent: 0.4,
        change24hAmount: 200,
      }),
      holding({
        symbol: "SOL",
        name: "Solana",
        currentPrice: 10_000,
        change24hPercent: -3,
        change24hAmount: -300,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({
      profile,
      holdings,
      marketMajors: [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", changePercent: 0.5 },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", changePercent: -1.2 },
        { id: "solana", symbol: "SOL", name: "Solana", changePercent: -3.5 },
      ],
    });
    expect(context.leadership.kind).toBe("bitcoin_leading");
    expect(context.leadership.summary).toMatch(/Bitcoin is leading/i);
  });

  it("classifies stressed regime on large downside moves", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 40_000,
        change24hPercent: -6,
        change24hAmount: -2400,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({
      profile,
      holdings,
      marketMajors: [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", changePercent: -6.2 },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", changePercent: -7.1 },
        { id: "solana", symbol: "SOL", name: "Solana", changePercent: -9 },
      ],
    });
    expect(context.regime).toBe("Stressed");
    expect(context.moveMagnitude).toBe("stressed");
  });

  it("does not invent weekly/monthly history when absent", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 50_000,
        change24hPercent: 1,
        change24hAmount: 500,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    expect(profile.pulse.weekly.available).toBe(false);
    expect(profile.pulse.monthly.available).toBe(false);
    const withHistory = buildCryptoIntelligenceProfile(holdings, {
      weekAvailable: true,
      weekReturnPercent: 3.2,
      monthAvailable: true,
      monthReturnPercent: -1.4,
    });
    expect(withHistory.pulse.weekly.available).toBe(true);
    if (withHistory.pulse.weekly.available) {
      expect(withHistory.pulse.weekly.returnPercent).toBe(3.2);
    }
    expect(withHistory.pulse.monthly.available).toBe(true);
  });
});

describe("personalizeCryptoMarketIntelligence", () => {
  it("personalizes BTC-heavy leadership", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 80_000,
        change24hPercent: 1,
        change24hAmount: 800,
      }),
      holding({
        symbol: "SOL",
        name: "Solana",
        currentPrice: 10_000,
        change24hPercent: -2,
        change24hAmount: -200,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({
      profile,
      holdings,
      marketMajors: [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", changePercent: 1.2 },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", changePercent: -0.8 },
        { id: "solana", symbol: "SOL", name: "Solana", changePercent: -2.5 },
      ],
    });
    const personalized = personalizeCryptoMarketIntelligence(profile, context);
    expect(personalized.personalConclusion).toMatch(/82%|89%|Bitcoin/i);
    expect(personalized.whatMatters.length).toBeLessThanOrEqual(2);
  });

  it("personalizes alt-heavy weak non-BTC days", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 10_000,
        change24hPercent: 0.2,
        change24hAmount: 20,
      }),
      holding({
        symbol: "SOL",
        name: "Solana",
        currentPrice: 40_000,
        change24hPercent: -3,
        change24hAmount: -1200,
      }),
      holding({
        symbol: "XRP",
        name: "XRP",
        currentPrice: 20_000,
        change24hPercent: -2,
        change24hAmount: -400,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({ profile, holdings });
    const personalized = personalizeCryptoMarketIntelligence(profile, context);
    expect(personalized.personalConclusion).toMatch(/non-Bitcoin crypto exposure is weaker/i);
  });

  it("returns no advisory wording", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        currentPrice: 50_000,
        change24hPercent: 2,
        change24hAmount: 1000,
      }),
    ];
    const profile = buildCryptoIntelligenceProfile(holdings);
    const context = buildCryptoMarketContext({ profile, holdings });
    const personalized = personalizeCryptoMarketIntelligence(profile, context);
    const blob = [
      personalized.personalConclusion,
      personalized.marketStructureLine,
      ...personalized.whatMatters.map((row) => row.text),
      selectDashboardCryptoConclusion(profile, context),
    ]
      .filter(Boolean)
      .join(" ");
    expect(blob).not.toMatch(/\b(buy|sell|hold|bullish|bearish|target)\b/i);
  });
});

describe("selectCryptoNewsMatters", () => {
  it("prioritizes holding-matched crypto stories and caps default depth", () => {
    const holdings = [
      holding({ symbol: "BTC", name: "Bitcoin", currentPrice: 50_000 }),
    ];
    const matters = selectCryptoNewsMatters({
      holdings,
      limit: 2,
      items: [
        news({
          id: "1",
          title: "Oil prices drift as inventories rise",
          category: "macro",
          marketCategory: "macro",
        }),
        news({
          id: "2",
          title: "SEC advances crypto market structure bill",
          matchedSymbols: ["BTC"],
        }),
        news({
          id: "3",
          title: "Bitcoin ETF inflows cool this week",
        }),
        news({
          id: "4",
          title: "Ethereum developers schedule network upgrade",
        }),
      ],
    });
    expect(matters).toHaveLength(2);
    expect(matters[0]?.title).toMatch(/SEC|ETF/i);
  });
});
