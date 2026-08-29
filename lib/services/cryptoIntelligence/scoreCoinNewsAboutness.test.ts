import { describe, expect, it } from "vitest";

import { scoreCoinNewsAboutness } from "@/lib/services/cryptoIntelligence/scoreCoinNewsAboutness";
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
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    assetType: "crypto",
    ...overrides,
  };
}

function news(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "CoinDesk",
    sourceType: "news",
    canonicalUrl: "https://example.com",
    thumbnailUrl: null,
    publishedAt: "2026-08-17T08:00:00.000Z",
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
    fetchedAt: "2026-08-17T08:00:00.000Z",
    relevanceScore: 20,
    ...overrides,
  };
}

describe("scoreCoinNewsAboutness", () => {
  it("scores strong matches when coin name leads the headline", () => {
    const result = scoreCoinNewsAboutness(
      news({
        id: "1",
        title: "XRP gains after court clarity on digital assets",
        articleSymbols: ["XRP"],
        matchedHoldingIds: ["XRP-id"],
      }),
      holding({ symbol: "XRP", name: "XRP", id: "XRP-id" }),
      Date.parse("2026-08-17T10:00:00.000Z"),
    );
    expect(result?.confidence).toBe("strong");
    expect(result?.defaultEligible).toBe(true);
  });

  it("suppresses weak short-ticker body mentions without crypto context", () => {
    const result = scoreCoinNewsAboutness(
      news({
        id: "2",
        title: "Spain enjoys another sunny sol this weekend",
        category: "general",
        marketCategory: "general",
        description: "Tourists enjoy the sol on the coast.",
      }),
      holding({ symbol: "SOL", name: "Solana" }),
      Date.parse("2026-08-17T10:00:00.000Z"),
    );
    expect(result).toBeNull();
  });

  it("allows SOL when Solana name or crypto context is present", () => {
    const result = scoreCoinNewsAboutness(
      news({
        id: "3",
        title: "Solana network activity rises this week",
        matchedSymbols: ["SOL"],
      }),
      holding({ symbol: "SOL", name: "Solana" }),
      Date.parse("2026-08-17T10:00:00.000Z"),
    );
    expect(result?.defaultEligible).toBe(true);
    expect(["strong", "likely"]).toContain(result?.confidence);
  });

  it("marks generic crypto market pieces that only name-drop a coin as weak", () => {
    const result = scoreCoinNewsAboutness(
      news({
        id: "4",
        title: "Crypto market mixed as Bitcoin and Ethereum consolidate",
        description: "Traders also watched ADA on the sidelines.",
      }),
      holding({ symbol: "ADA", name: "Cardano" }),
      Date.parse("2026-08-17T10:00:00.000Z"),
    );
    expect(result?.confidence).toBe("weak");
    expect(result?.defaultEligible).toBe(false);
  });

  it("prefers Cardano name matches for ADA", () => {
    const result = scoreCoinNewsAboutness(
      news({
        id: "5",
        title: "Cardano developers outline upcoming network upgrade",
        sourceName: "Cointelegraph",
      }),
      holding({ symbol: "ADA", name: "Cardano" }),
      Date.parse("2026-08-17T10:00:00.000Z"),
    );
    expect(result?.confidence).toBe("strong");
    expect(result?.defaultEligible).toBe(true);
  });
});
