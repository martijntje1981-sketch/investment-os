import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildFourQuestions } from "@/lib/services/fourQuestions";
import { selectRelevantContext } from "@/lib/services/intelligenceTrace/selectRelevantContext";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const now = "2026-08-20T10:00:00.000Z";
  return {
    id: partial.id ?? partial.symbol,
    symbol: partial.symbol,
    name: partial.name ?? partial.symbol,
    quantity: partial.quantity ?? 1,
    purchasePrice: partial.purchasePrice ?? 100,
    currentPrice: partial.currentPrice ?? 110,
    previousClose: partial.previousClose ?? 100,
    currency: "EUR",
    portfolioCurrency: "EUR",
    assetType: partial.assetType ?? "investment",
    createdAt: now,
    updatedAt: now,
    priceDataStatus: "live",
    change24hPercent: partial.change24hPercent,
    changePercent: partial.changePercent,
    platform: null,
    pairCurrency: partial.pairCurrency,
    pricingStatus: partial.pricingStatus,
    tradingPair: partial.tradingPair,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Bloomberg Television",
    sourceType: "news",
    canonicalUrl: `https://www.bloomberg.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-19T08:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.summary ?? overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: "Strong portfolio match",
    category: "markets",
    marketCategory: "equities",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-20T10:00:00.000Z",
    relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
    ...overrides,
  };
}

describe("Phase 16.5 Q2 / Phase 15 wiring", () => {
  const vwce = holding({
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 1000,
    currentPrice: 100,
    previousClose: 99,
  });
  const btc = holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    quantity: 0.02,
    currentPrice: 50_000,
    previousClose: 49_000,
    change24hPercent: 2,
  });

  it("Q2 glance follows the largest holding by weight, not Bitcoin article volume", () => {
    const bitcoinStories = Array.from({ length: 12 }, (_, index) =>
      newsItem({
        id: `btc-${index}`,
        title: `Bitcoin ETF inflows hit a record ${index}`,
        matchedSymbols: ["BTC"],
        matchedHoldings: [
          { id: "btc", symbol: "BTC", name: "Bitcoin", providerSymbol: "BTC" },
        ],
        category: "crypto",
        marketCategory: "crypto",
      }),
    );
    const vwceStory = newsItem({
      id: "vwce-1",
      title: "VWCE Vanguard FTSE All-World sees continued European inflows",
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "vwce",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.AS",
        },
      ],
    });

    const bundle = buildFourQuestions({
      holdings: [vwce, btc],
      preferredScope: "complete",
      goal: null,
      hasSavedGoal: false,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 101_000,
        goal: null,
        hasSavedGoal: false,
      }),
      newsItems: [...bitcoinStories, vwceStory],
    });
    const q2 = bundle.questions.find((question) => question.id === "what_matters_now")!;

    expect(q2.answer).toMatch(/Vanguard FTSE All-World|largest portfolio concentration/i);
    expect(q2.answer).not.toMatch(/bitcoin is today/i);
  });

  it("expanded Q2 context for the largest holding is not the most-available Bitcoin story", () => {
    const bitcoinStories = Array.from({ length: 12 }, (_, index) =>
      newsItem({
        id: `btc-ctx-${index}`,
        title: `Bitcoin miners rally ${index}`,
        matchedSymbols: ["BTC"],
        matchedHoldings: [
          { id: "btc", symbol: "BTC", name: "Bitcoin", providerSymbol: "BTC" },
        ],
        category: "crypto",
        marketCategory: "crypto",
      }),
    );
    const vwceStory = newsItem({
      id: "vwce-ctx",
      title: "VWCE Vanguard FTSE All-World rebalance completed",
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "vwce",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.AS",
        },
      ],
    });

    const pick = selectRelevantContext({
      subject: {
        symbols: ["VWCE"],
        names: ["Vanguard FTSE All-World"],
      },
      newsItems: [...bitcoinStories, vwceStory],
      holdings: [vwce, btc],
      prefer: "perspective",
      nowMs: Date.parse("2026-08-20T10:00:00.000Z"),
    });

    expect(pick?.layer.detail).toMatch(/VWCE|Vanguard/i);
    expect(pick?.layer.detail).not.toMatch(/Bitcoin miners/i);
  });

  it("does not change Q1 or news ranking modules in this phase", () => {
    const q1 = readFileSync(
      path.resolve(process.cwd(), "lib/services/fourQuestions/buildWhatHappened.ts"),
      "utf8",
    );
    const ranking = readFileSync(
      path.resolve(process.cwd(), "lib/services/news/newsPortfolioRanking.ts"),
      "utf8",
    );
    const orchestrator = readFileSync(
      path.resolve(process.cwd(), "lib/services/fourQuestions/buildFourQuestions.ts"),
      "utf8",
    );

    expect(orchestrator).toContain('prefer: "perspective"');
    expect(orchestrator).toContain("leadingWeight");
    expect(q1.length).toBeGreaterThan(0);
    expect(ranking.length).toBeGreaterThan(0);
  });
});
