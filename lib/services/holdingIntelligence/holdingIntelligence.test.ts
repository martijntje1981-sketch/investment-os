import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { contributionPpFromMove } from "@/lib/services/personalIntelligence/contribution";
import {
  buildHoldingIntelligenceCandidates,
  compareHoldingIntelligenceCandidates,
  ETF_CONTEXTUAL_NOTE,
  HOLDING_EXPLANATION_NOTES,
  rankHoldingIntelligenceCandidates,
  resolveHoldingExplanation,
  selectTopHoldingIntelligence,
} from "@/lib/services/holdingIntelligence";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
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
  overrides: Partial<NewsContentItem> &
    Pick<NewsContentItem, "id" | "title" | "matchedSymbols">,
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
    matchedSymbols: overrides.matchedSymbols,
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

describe("holding intelligence foundation", () => {
  it("covers every non-cash holding even when news is missing", () => {
    const candidates = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          quantity: 10,
          currentPrice: 110,
          previousClose: 100,
        }),
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 50,
          change24hPercent: 2,
        }),
        holding({
          symbol: "CASH",
          name: "Euro",
          assetType: "cash",
          quantity: 1000,
          currentPrice: 1,
        }),
      ],
      newsItems: [],
    });

    expect(candidates.map((row) => row.symbol).sort()).toEqual(["BTC", "VWCE"]);
    expect(
      candidates.every((row) => row.explanationStatus === "unavailable"),
    ).toBe(true);
    expect(
      candidates.every(
        (row) => row.explanationNote === HOLDING_EXPLANATION_NOTES.unavailable,
      ),
    ).toBe(true);
  });

  it("ranks by portfolio impact, not news volume", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50,
        purchasePrice: 40,
        change24hPercent: 25,
      }),
    ];

    const bitcoinNews = Array.from({ length: 12 }, (_, index) =>
      newsItem({
        id: `btc-${index}`,
        title: "Bitcoin rally continues",
        matchedSymbols: ["BTC"],
        matchedHoldingIds: ["BTC-id"],
        relevanceScore: 25,
      }),
    );

    const candidates = buildHoldingIntelligenceCandidates({
      holdings,
      newsItems: bitcoinNews,
    });

    const ranked = rankHoldingIntelligenceCandidates(candidates);
    expect(ranked[0]?.symbol).toBe("VWCE");
    expect(ranked[0]?.newsItemCount).toBe(0);
    expect(ranked[1]?.symbol).toBe("BTC");
    expect(ranked[1]?.newsItemCount).toBe(12);

    const vwce = ranked[0]!;
    const btc = ranked[1]!;
    expect(Math.abs(vwce.contributionPp ?? 0)).toBeGreaterThan(
      Math.abs(btc.contributionPp ?? 0),
    );
    expect(compareHoldingIntelligenceCandidates(vwce, btc)).toBeLessThan(0);
  });

  it("lets Bitcoin rank first only when it is more material", () => {
    const candidates = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          quantity: 1,
          currentPrice: 101,
          previousClose: 100,
        }),
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 2,
          currentPrice: 120,
          purchasePrice: 100,
          change24hPercent: 20,
        }),
      ],
      newsItems: [],
    });

    const ranked = selectTopHoldingIntelligence(candidates, 2);
    expect(ranked[0]?.symbol).toBe("BTC");
    expect(ranked[1]?.symbol).toBe("VWCE");
  });

  it("computes portfolio impact with the shared contribution formula", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
    ];
    const [candidate] = buildHoldingIntelligenceCandidates({ holdings });
     expect(candidate?.contributionPp).toBeCloseTo(
      contributionPpFromMove(100, 1000) ?? 0,
      10,
    );
  });

  it("does not treat ETF thematic context as a proven cause", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerInstrumentType: "ETF",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
    ];
    const candidates = buildHoldingIntelligenceCandidates({
      holdings,
      newsItems: [
        newsItem({
          id: "theme-1",
          title: "Global equities drift on growth hopes",
          matchedSymbols: ["VWCE"],
          matchedHoldingIds: ["VWCE-id"],
          relevanceScore: 8,
        }),
      ],
    });

    expect(candidates[0]?.isEtfLike).toBe(true);
    expect(candidates[0]?.matchType).toBe("sector_theme");
    expect(candidates[0]?.explanationStatus).toBe("probable_contextual");
    expect(candidates[0]?.explanationNote).toBe(ETF_CONTEXTUAL_NOTE);
    expect(candidates[0]?.explanationNote).not.toMatch(/caused|because/i);
  });

  it("keeps missing news honest and never invents a cause", () => {
    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "NUKL",
          name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
          quantity: 5,
          currentPrice: 40,
          previousClose: 38,
        }),
      ],
      newsItems: [],
    });

    expect(candidate?.explanationStatus).toBe("unavailable");
    expect(candidate?.newsItem).toBeNull();
    expect(candidate?.matchType).toBe("none");
    expect(candidate?.explanationNote).toBe(
      HOLDING_EXPLANATION_NOTES.unavailable,
    );
  });

  it("labels weak matched copy as insufficient evidence", () => {
    const result = resolveHoldingExplanation({
      matchType: "none",
      isEtfLike: false,
      matchedCount: 1,
    });
    expect(result.status).toBe("insufficient_evidence");
    expect(result.note).toBe(HOLDING_EXPLANATION_NOTES.insufficient_evidence);
  });

  it("adds no provider, OpenAI, cron, or polling path", () => {
    const files = [
      "lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates.ts",
      "lib/services/holdingIntelligence/rankHoldingIntelligence.ts",
      "lib/services/holdingIntelligence/attachHoldingNews.ts",
      "lib/services/holdingIntelligence/types.ts",
      "lib/services/holdingIntelligence/newsHubRows.ts",
      "lib/services/holdingIntelligence/storyIdentity.ts",
      "lib/services/holdingIntelligence/q1HoldingContext.ts",
      "lib/services/holdingIntelligence/holdingPageNews.ts",
    ];
    for (const file of files) {
      const source = readFileSync(
        path.resolve(process.cwd(), file),
        "utf8",
      );
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
    const rankSource = readFileSync(
      path.resolve(
        process.cwd(),
        "lib/services/holdingIntelligence/rankHoldingIntelligence.ts",
      ),
      "utf8",
    );
    expect(rankSource).not.toMatch(/isBitcoin|newsItemCount/);
  });

  it("never uses news item count in the rank comparator", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50,
        change24hPercent: 25,
      }),
    ];
    const [left, right] = buildHoldingIntelligenceCandidates({ holdings });
    const noisy = {
      ...right!,
      newsItemCount: 99,
      relevanceScore: 25,
      explanationStatus: "supported" as const,
    };
    expect(compareHoldingIntelligenceCandidates(left!, right!)).toBe(
      compareHoldingIntelligenceCandidates(left!, noisy),
    );
  });
});
