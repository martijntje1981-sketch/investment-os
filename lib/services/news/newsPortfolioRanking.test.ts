import { describe, expect, it } from "vitest";

import {
  buildNewsRankingEvidence,
  classifyNewsRankingTier,
  compareNewsItemsForRanking,
  isDirectVerifiedHoldingMatch,
  rankNewsItemsForBriefing,
} from "@/lib/services/news/newsPortfolioRanking";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";

const NOW = Date.parse("2026-07-20T12:00:00.000Z");

function item(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Reuters",
    sourceType: "news",
    canonicalUrl: `https://example.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Coverage",
    summary: "Coverage",
    interpretation: "Context",
    impactLevel: "Medium Impact",
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

describe("newsPortfolioRanking", () => {
  it("ranks direct verified holding matches above generic market news", () => {
    const holding = item({
      id: "holding",
      title: "VWCE ETF flows rise",
      relevanceScore: 25,
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });
    const generic = item({
      id: "generic",
      title: "Global markets mixed",
      sourceName: "Blog Mirror",
    });

    const ranked = rankNewsItemsForBriefing([generic, holding], NOW);
    expect(ranked[0]?.id).toBe("holding");
    expect(isDirectVerifiedHoldingMatch(holding)).toBe(true);
  });

  it("recognises full instrument-name relevance through matched holdings", () => {
    const named = item({
      id: "named",
      title: "Vanguard FTSE All-World UCITS ETF update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE,
      matchedHoldings: [
        {
          id: "h1",
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          providerSymbol: null,
        },
      ],
    });

    expect(classifyNewsRankingTier(named)).toBe("direct_holding");
  });

  it("uses verified articleSymbols as a direct holding match", () => {
    const verified = item({
      id: "verified",
      title: "Apple earnings preview",
      articleSymbols: ["AAPL.US"],
      relevanceScore: 25,
      matchedHoldings: [
        {
          id: "h1",
          symbol: "AAPL",
          name: "Apple",
          providerSymbol: "AAPL.US",
        },
      ],
    });

    expect(classifyNewsRankingTier(verified)).toBe("direct_holding");
  });

  it("does not treat ambiguous short ticker substrings as direct matches", () => {
    const ambiguous = item({
      id: "ambiguous",
      title: "AI adoption accelerates across enterprise software",
      relevanceScore: 0,
      matchedHoldings: [],
      matchedSymbols: [],
      category: "general",
      marketCategory: "general",
    });

    expect(classifyNewsRankingTier(ambiguous)).toBe("general");
    expect(isDirectVerifiedHoldingMatch(ambiguous)).toBe(false);
  });

  it("ranks portfolio theme relevance below direct holding relevance", () => {
    const theme = item({
      id: "theme",
      title: "Semiconductor demand outlook",
      relevanceScore: 8,
      marketCategory: "equities",
    });
    const direct = item({
      id: "direct",
      title: "AIFS infrastructure update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
      matchedHoldings: [
        {
          id: "h1",
          symbol: "AIFS",
          name: "AI Infrastructure ETF",
          providerSymbol: "AIFS.XETRA",
        },
      ],
    });

    expect(
      compareNewsItemsForRanking(theme, direct, NOW),
    ).toBeGreaterThan(0);
  });

  it("keeps strong macro relevance available below holding-specific news", () => {
    const macro = item({
      id: "macro",
      title: "Fed signals slower rate cuts",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Bloomberg Television",
    });
    const holding = item({
      id: "holding",
      title: "NUKL uranium sector update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 3,
      matchedSymbols: ["NUKL"],
      matchedHoldings: [
        {
          id: "h1",
          symbol: "NUKL",
          name: "Nuclear ETF",
          providerSymbol: "NUKL.XETRA",
        },
      ],
    });

    const ranked = rankNewsItemsForBriefing([macro, holding], NOW);
    expect(ranked.map((entry) => entry.id)).toEqual(["holding", "macro"]);
    expect(classifyNewsRankingTier(macro)).toBe("macro");
  });

  it("uses source quality after portfolio relevance at equal tiers", () => {
    const lowQuality = item({
      id: "low",
      title: "ECB preview",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Blog Mirror",
      publishedAt: "2026-07-20T11:00:00.000Z",
    });
    const highQuality = item({
      id: "high",
      title: "ECB preview from wire",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Reuters",
      publishedAt: "2026-07-20T08:00:00.000Z",
    });

    expect(
      compareNewsItemsForRanking(lowQuality, highQuality, NOW),
    ).toBeGreaterThan(0);
  });

  it("uses recency after relevance and source quality", () => {
    const older = item({
      id: "older",
      title: "Macro update",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Reuters",
      publishedAt: "2026-07-19T08:00:00.000Z",
    });
    const newer = item({
      id: "newer",
      title: "Macro update later",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Reuters",
      publishedAt: "2026-07-20T10:00:00.000Z",
    });

    expect(compareNewsItemsForRanking(older, newer, NOW)).toBeGreaterThan(0);
  });

  it("does not destabilise ordering when dates are missing or invalid", () => {
    const invalidA = item({
      id: "a",
      title: "Story A",
      publishedAt: "not-a-date",
    });
    const invalidB = item({
      id: "b",
      title: "Story B",
      publishedAt: "",
    });

    const first = rankNewsItemsForBriefing([invalidA, invalidB], NOW);
    const second = rankNewsItemsForBriefing([invalidB, invalidA], NOW);
    expect(first.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(second.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("uses a stable tie-breaker for equal-ranked items", () => {
    const left = item({
      id: "left",
      title: "Same tier story",
      canonicalUrl: "https://example.com/a",
    });
    const right = item({
      id: "right",
      title: "Same tier story copy",
      canonicalUrl: "https://example.com/b",
    });

    const evidenceLeft = buildNewsRankingEvidence(left, NOW);
    const evidenceRight = buildNewsRankingEvidence(right, NOW);
    expect(evidenceLeft.rankScore).toBe(evidenceRight.rankScore);
    expect(compareNewsItemsForRanking(left, right, NOW)).toBeLessThan(0);
    expect(compareNewsItemsForRanking(right, left, NOW)).toBeGreaterThan(0);
  });

  it("provides a deterministic no-portfolio fallback", () => {
    const macro = item({
      id: "macro",
      title: "Central bank decision ahead",
      category: "macro",
      marketCategory: "macro",
      sourceName: "Reuters",
    });
    const general = item({
      id: "general",
      title: "Market open recap",
      sourceName: "Blog Mirror",
    });

    const ranked = rankNewsItemsForBriefing([general, macro], NOW);
    expect(ranked[0]?.id).toBe("macro");
  });

  it("does not automatically hide smaller holdings behind larger ones", () => {
    const smallHolding = item({
      id: "small",
      title: "NUKL uranium update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 10,
      matchedSymbols: ["NUKL"],
      matchedHoldings: [
        {
          id: "h-small",
          symbol: "NUKL",
          name: "Nuclear ETF",
          providerSymbol: "NUKL.XETRA",
        },
      ],
    });
    const largeHolding = item({
      id: "large",
      title: "VWCE flows update",
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 2,
      matchedSymbols: ["VWCE"],
      matchedHoldings: [
        {
          id: "h-large",
          symbol: "VWCE",
          name: "All-World ETF",
          providerSymbol: "VWCE.XETRA",
        },
      ],
    });

    const ranked = rankNewsItemsForBriefing([largeHolding, smallHolding], NOW);
    expect(ranked[0]?.id).toBe("small");
  });
});
