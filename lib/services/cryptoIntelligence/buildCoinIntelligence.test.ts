import { describe, expect, it } from "vitest";

import {
  buildCoinIntelligence,
  buildOwnedCoinIntelligence,
  selectCoinsThatMatterToday,
  selectDashboardCoinConclusion,
} from "@/lib/services/cryptoIntelligence";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
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

describe("buildCoinIntelligence", () => {
  it("supports BTC ETH XRP SOL ADA DOGE SHIB via the same generic path", () => {
    for (const symbol of ["BTC", "ETH", "XRP", "SOL", "ADA", "DOGE", "SHIB"]) {
      const coin = buildCoinIntelligence({
        holding: holding({
          symbol,
          name: symbol,
          currentPrice: 10_000,
          change24hPercent: 2,
          change24hAmount: 200,
        }),
        totalPortfolioValue: 100_000,
      });
      expect(coin?.symbol).toBe(symbol);
      expect(coin?.change24hPercent).toBe(2);
      expect(coin?.contributionPp).not.toBeNull();
    }
  });

  it("ranks large modest movers above tiny high movers", () => {
    const coins = buildOwnedCoinIntelligence({
      holdings: [
        holding({
          symbol: "VWCE",
          assetType: "investment",
          currentPrice: 50_000,
          quantity: 1,
        }),
        holding({
          symbol: "XRP",
          name: "XRP",
          currentPrice: 40_000,
          change24hPercent: 2,
          change24hAmount: 800,
        }),
        holding({
          symbol: "SHIB",
          name: "Shiba Inu",
          currentPrice: 50,
          change24hPercent: 25,
          change24hAmount: 12.5,
        }),
      ],
    });
    expect(coins[0]?.symbol).toBe("XRP");
    expect(coins[0]!.importanceScore).toBeGreaterThan(coins[1]!.importanceScore);
    const matter = selectCoinsThatMatterToday(coins, 2);
    expect(matter.some((c) => c.symbol === "XRP")).toBe(true);
    expect(matter.some((c) => c.symbol === "SHIB")).toBe(false);
  });

  it("compares vs BTC and ETH with materiality thresholds", () => {
    const coin = buildCoinIntelligence({
      holding: holding({
        symbol: "XRP",
        name: "XRP",
        currentPrice: 20_000,
        change24hPercent: 4.8,
        change24hAmount: 960,
      }),
      totalPortfolioValue: 100_000,
      periodReturns: { weekPercent: 6, monthPercent: -2 },
      benchmarks: {
        btc: {
          change24hPercent: 1,
          change1wPercent: 2,
          change1mPercent: -1,
        },
        eth: {
          change24hPercent: 1.2,
          change1wPercent: 2.5,
          change1mPercent: -1.5,
        },
      },
    });
    expect(coin?.vsBtc.day).toBe("outperforming");
    expect(coin?.vsBtc.week).toBe("outperforming");
    expect(coin?.vsBtc.summary).toMatch(/outperforming Bitcoin/i);
    expect(coin?.conclusion).toMatch(/XRP is \+4\.8%/);
    expect(coin?.conclusion).toMatch(/percentage points/);
  });

  it("treats tiny relative gaps as in_line", () => {
    const coin = buildCoinIntelligence({
      holding: holding({
        symbol: "SOL",
        name: "Solana",
        currentPrice: 10_000,
        change24hPercent: 1.2,
        change24hAmount: 120,
      }),
      totalPortfolioValue: 50_000,
      benchmarks: {
        eth: {
          change24hPercent: 1.1,
          change1wPercent: null,
          change1mPercent: null,
        },
      },
    });
    expect(coin?.vsEth.day).toBe("in_line");
  });

  it("omits unverified history instead of substituting 24h", () => {
    const coin = buildCoinIntelligence({
      holding: holding({
        symbol: "ADA",
        name: "Cardano",
        currentPrice: 5_000,
        change24hPercent: 3,
        change24hAmount: 150,
      }),
      totalPortfolioValue: 20_000,
    });
    expect(coin?.week.available).toBe(false);
    expect(coin?.month.available).toBe(false);
    expect(coin?.week.reason).toMatch(/1W/);
  });

  it("attaches holding-matched news without causal language", () => {
    const coin = buildCoinIntelligence({
      holding: holding({
        id: "xrp-1",
        symbol: "XRP",
        name: "XRP",
        currentPrice: 10_000,
        change24hPercent: 4.8,
        change24hAmount: 480,
        providerSymbol: "XRP-USD.CC",
      }),
      totalPortfolioValue: 50_000,
      newsItems: [
        news({
          id: "n1",
          title: "XRP legal clarity improves market outlook",
          matchedSymbols: ["XRP"],
          matchedHoldingIds: ["xrp-1"],
        }),
        news({
          id: "n2",
          title: "Oil inventories surprise traders",
          category: "macro",
          marketCategory: "macro",
        }),
      ],
    });
    expect(coin?.news).toHaveLength(1);
    expect(coin?.news[0]?.matchBasis).toBe("holding_id");
    expect(coin?.news[0]?.watchLabel).toMatch(/worth watching/i);
    const blob = `${coin?.conclusion ?? ""} ${coin?.news[0]?.watchLabel ?? ""}`;
    expect(blob).not.toMatch(/\b(caused|buy|sell|hold|bullish|bearish)\b/i);
  });

  it("surfaces a dashboard coin conclusion for material drivers", () => {
    const coins = buildOwnedCoinIntelligence({
      holdings: [
        holding({
          symbol: "XRP",
          name: "XRP",
          currentPrice: 30_000,
          change24hPercent: 4,
          change24hAmount: 1200,
        }),
        holding({
          symbol: "ETH",
          name: "Ethereum",
          currentPrice: 20_000,
          change24hPercent: 0.2,
          change24hAmount: 40,
        }),
      ],
    });
    expect(selectDashboardCoinConclusion(coins)).toMatch(/XRP drove/i);
  });

  it("handles multi-coin portfolios without advisory wording", () => {
    const coins = buildOwnedCoinIntelligence({
      holdings: [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          currentPrice: 40_000,
          change24hPercent: 0.5,
          change24hAmount: 200,
        }),
        holding({
          symbol: "ETH",
          name: "Ethereum",
          currentPrice: 25_000,
          change24hPercent: 0.4,
          change24hAmount: 100,
        }),
        holding({
          symbol: "DOGE",
          name: "Dogecoin",
          currentPrice: 15_000,
          change24hPercent: -3,
          change24hAmount: -450,
        }),
      ],
      benchmarks: {
        btc: {
          change24hPercent: 0.5,
          change1wPercent: 1,
          change1mPercent: 2,
        },
        eth: {
          change24hPercent: 0.4,
          change1wPercent: 1.2,
          change1mPercent: 1.5,
        },
      },
    });
    expect(coins.map((c) => c.symbol)).toEqual(
      expect.arrayContaining(["BTC", "ETH", "DOGE"]),
    );
    const text = coins.map((c) => c.conclusion ?? "").join(" ");
    expect(text).not.toMatch(/\b(buy|sell|recommend|target)\b/i);
  });
});
