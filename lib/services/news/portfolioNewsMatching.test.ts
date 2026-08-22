import { describe, expect, it, vi } from "vitest";

import {
  providerSymbolsFromProfiles,
  scoreNewsItemWithProfiles,
} from "@/lib/services/news/portfolioNewsMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";

vi.mock("@/lib/services/briefing/briefingPortfolio", () => ({
  resolveBriefingPortfolio: vi.fn(async (holdings: Array<{ providerSymbol?: string | null }>) =>
    holdings.map((holding) => ({
      providerSymbol: holding.providerSymbol ?? null,
      isin: null,
    })),
  ),
}));

function article(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "EODHD News",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: null,
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
    ...overrides,
  };
}

describe("portfolioNewsMatching", () => {
  it("scores articleSymbols matches higher than keyword-only matches", async () => {
    const { resolveNewsHoldingProfiles } = await import(
      "@/lib/services/news/portfolioNewsMatching"
    );

    const profiles = await resolveNewsHoldingProfiles([
      {
        id: "aapl-id",
        symbol: "AAPL",
        name: "Apple",
        quantity: 1,
        purchasePrice: 100,
        currentPrice: 120,
        currency: "EUR",
        assetType: "investment",
        providerSymbol: "AAPL.US",
      },
    ]);

    const symbolMatch = scoreNewsItemWithProfiles(
      article({
        id: "symbol-match",
        title: "Tech sector update",
        articleSymbols: ["AAPL.US"],
      }),
      profiles,
    );

    const keywordMatch = scoreNewsItemWithProfiles(
      article({
        id: "keyword-match",
        title: "Apple iPhone demand update",
        description: "Apple continues to dominate premium smartphone demand.",
      }),
      profiles,
    );

    expect(symbolMatch.relevanceScore).toBeGreaterThan(keywordMatch.relevanceScore);
    expect(symbolMatch.matchedSymbols).toEqual(["AAPL"]);
    expect(symbolMatch.matchedHoldings[0]?.providerSymbol).toBe("AAPL.US");
  });

  it("extracts provider symbols for EODHD fetch", async () => {
    const { resolveNewsHoldingProfiles } = await import(
      "@/lib/services/news/portfolioNewsMatching"
    );

    const profiles = await resolveNewsHoldingProfiles([
      {
        id: "1",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        quantity: 1,
        purchasePrice: 100,
        currentPrice: 100,
        currency: "EUR",
        assetType: "investment",
        providerSymbol: "VWCE.XETRA",
      },
      {
        id: "2",
        symbol: "CASH",
        name: "Cash",
        quantity: 1,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR",
        assetType: "cash",
      },
    ]);

    expect(providerSymbolsFromProfiles(profiles)).toEqual(["VWCE.XETRA"]);
  });

  it("falls back to stored provider symbols when instrument matching fails", async () => {
    const briefing = await import("@/lib/services/briefing/briefingPortfolio");
    vi.spyOn(briefing, "resolveBriefingPortfolio").mockRejectedValueOnce(
      new Error("EODHD_API_KEY is missing"),
    );

    const { resolveNewsHoldingProfiles } = await import(
      "@/lib/services/news/portfolioNewsMatching"
    );

    const profiles = await resolveNewsHoldingProfiles([
      {
        id: "1",
        symbol: "AAPL",
        name: "Apple",
        quantity: 1,
        purchasePrice: 100,
        currentPrice: 100,
        currency: "EUR",
        assetType: "investment",
        providerSymbol: "AAPL.US",
      },
    ]);

    expect(profiles).toEqual([
      expect.objectContaining({
        symbol: "AAPL",
        providerSymbol: "AAPL.US",
      }),
    ]);
  });
});
