import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import {
  BITCOIN_CRYPTO_CONTEXT_NOTE,
  ETF_CONTEXTUAL_NOTE,
  NEWS_HUB_NO_CATALYST,
  buildHoldingIntelligenceCandidates,
  buildNewsHubHoldingRows,
  buildQ1HoldingContextLayer,
  dedupeSharedHoldingStories,
  isSameUnderlyingStory,
  buildHoldingStoryIdentity,
  rankHoldingIntelligenceCandidates,
  selectNewsHubHoldingCandidates,
} from "@/lib/services/holdingIntelligence";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import { buildNewsBriefingLayout } from "@/lib/services/news/newsBriefingLayout";
import {
  CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
  STRONG_PORTFOLIO_MATCH_SCORE,
  buildHoldingMatchProfiles,
  isContextualPortfolioMatch,
  isStrongPortfolioMatch,
  scoreNewsItemRelevance,
} from "@/lib/services/news/relevanceMatching";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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
    Pick<NewsContentItem, "id" | "title">,
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

function payload(overrides: Partial<NewsApiResponse> = {}): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-08-18T12:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    sourceErrors: [],
    fetchedAt: "2026-08-18T12:00:00.000Z",
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: "2026-08-18T12:00:00.000Z",
      sourceCount: 1,
      activeSourceNames: ["Test Wire"],
      unavailableSourceCount: 0,
    },
    ...overrides,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

describe("Phase 11C–11H portfolio-first news", () => {
  it("1. generic crypto does not strongly match Bitcoin", () => {
    const profiles = buildHoldingMatchProfiles([
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
    ]);
    const haystack = "crypto market rally as altcoins surge";
    expect(isStrongPortfolioMatch(haystack, profiles[0]!)).toBe(false);
    expect(isContextualPortfolioMatch(haystack, profiles[0]!)).toBe(true);

    const scored = scoreNewsItemRelevance(
      newsItem({
        id: "crypto-generic",
        title: "Crypto market rally as altcoins surge",
      }),
      profiles,
    );
    expect(scored.relevanceScore).toBe(CONTEXTUAL_PORTFOLIO_MATCH_SCORE);
    expect(scored.relevanceScore).toBeLessThan(STRONG_PORTFOLIO_MATCH_SCORE);
    expect(profiles[0]?.strongKeywords).not.toContain("crypto");
  });

  it("2. a genuine Bitcoin story still matches strongly", () => {
    const profiles = buildHoldingMatchProfiles([
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
    ]);
    const haystack = "bitcoin etf outflows hit records as btc slips";
    expect(isStrongPortfolioMatch(haystack, profiles[0]!)).toBe(true);

    const scored = scoreNewsItemRelevance(
      newsItem({
        id: "btc-true",
        title: "Bitcoin ETF outflows hit records as BTC slips",
      }),
      profiles,
    );
    expect(scored.relevanceScore).toBeGreaterThanOrEqual(
      STRONG_PORTFOLIO_MATCH_SCORE,
    );
    expect(scored.matchedSymbols).toContain("IB1T");
  });

  it("3. a non-Bitcoin material holding can outrank Bitcoin", () => {
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
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
          quantity: 1,
          currentPrice: 50,
          previousClose: 49,
        }),
      ],
      newsItems: Array.from({ length: 12 }, (_, index) =>
        newsItem({
          id: `btc-${index}`,
          title: "Bitcoin rally continues",
          matchedSymbols: ["IB1T"],
          matchedHoldingIds: ["IB1T-id"],
          relevanceScore: 25,
        }),
      ),
    });
    const ranked = rankHoldingIntelligenceCandidates(candidates);
    expect(ranked[0]?.symbol).toBe("VWCE");
  });

  it("4. Bitcoin can still rank first when it is the material driver", () => {
    const candidates = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "VWCE",
          quantity: 1,
          currentPrice: 101,
          previousClose: 100,
        }),
        holding({
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
          quantity: 8,
          currentPrice: 80,
          previousClose: 50,
        }),
      ],
    });
    const ranked = rankHoldingIntelligenceCandidates(candidates);
    expect(ranked[0]?.symbol).toBe("IB1T");
  });

  it("5. News hub ranking ignores article count", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 1,
        currentPrice: 50,
        previousClose: 49,
      }),
    ];
    const layout = buildNewsBriefingLayout(
      payload({
        portfolioNews: [
          newsItem({
            id: "vwce-one",
            title: "VWCE flows update",
            matchedSymbols: ["VWCE"],
            matchedHoldingIds: ["VWCE-id"],
            relevanceScore: 20,
          }),
          ...Array.from({ length: 9 }, (_, index) =>
            newsItem({
              id: `btc-vol-${index}`,
              title: `Bitcoin wrap ${index}`,
              matchedSymbols: ["IB1T"],
              matchedHoldingIds: ["IB1T-id"],
              relevanceScore: 25,
            }),
          ),
        ],
      }),
      { holdings },
    );

    expect(layout.holdingIntelligenceRows[0]?.candidate.symbol).toBe("VWCE");
    expect(
      layout.holdingIntelligenceRows.map((row) => row.candidate.symbol),
    ).not.toEqual(["IB1T", "VWCE"]);
  });

  it("6. a material holding without news remains visible and honest", () => {
    const rows = buildNewsHubHoldingRows(
      buildHoldingIntelligenceCandidates({
        holdings: [
          holding({
            symbol: "NUKL",
            name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
            providerSymbol: "NUKL.XETRA",
            providerInstrumentType: "ETF",
            quantity: 20,
            currentPrice: 50,
            previousClose: 40,
          }),
        ],
        newsItems: [],
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.candidate.symbol).toBe("NUKL");
    expect(rows[0]?.contextItem).toBeNull();
    expect(rows[0]?.contextCopy).toBe(NEWS_HUB_NO_CATALYST);
  });

  it("7. ETF thematic context is not causal", () => {
    const candidates = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "4COP",
          name: "Global X Copper Miners UCITS ETF",
          providerSymbol: "4COP.XETRA",
          providerInstrumentType: "ETF",
          quantity: 10,
          currentPrice: 30,
          previousClose: 28,
        }),
      ],
      newsItems: [
        newsItem({
          id: "copper-1",
          title: "Copper miners slide on China demand fears",
          matchedSymbols: ["4COP"],
          matchedHoldingIds: ["4COP-id"],
          relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
        }),
      ],
    });
    expect(candidates[0]?.matchType).toBe("sector_theme");
    expect(candidates[0]?.explanationStatus).toBe("probable_contextual");
    expect(candidates[0]?.explanationNote).toBe(ETF_CONTEXTUAL_NOTE);
    expect(candidates[0]?.explanationNote).not.toMatch(/caused|because/i);

    const row = buildNewsHubHoldingRows(candidates)[0];
    expect(row?.matchRole).toBe("sector_context");
    expect(row?.contextCopy).toMatch(/sector context/i);
    expect(row?.contextCopy).not.toMatch(/caused the etf/i);
  });

  it("8. insufficient evidence copy stays honest", () => {
    const layer = buildQ1HoldingContextLayer({
      ...buildHoldingIntelligenceCandidates({
        holdings: [
          holding({
            symbol: "VWCE",
            quantity: 10,
            currentPrice: 110,
            previousClose: 100,
          }),
        ],
      })[0]!,
      explanationStatus: "insufficient_evidence",
      matchType: "none",
      newsItem: newsItem({ id: "weak", title: "Unrelated note" }),
      newsItemCount: 1,
    });
    expect(layer?.detail).toBe(NEWS_HUB_NO_CATALYST);
    expect(layer?.detail).not.toMatch(/caused|catalyst was/i);
  });

  it("9. Q1 still owns contribution rather than replacing it with news", () => {
    const ib1t = holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
      quantity: 10,
      currentPrice: 80,
      previousClose: 100,
    });
    const bundle = buildFourQuestions({
      holdings: [ib1t],
      preferredScope: "complete",
      goal,
      hasSavedGoal: true,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 800,
        goal,
        hasSavedGoal: true,
      }),
      newsItems: [
        newsItem({
          id: "btc-q1",
          title: "Bitcoin ETF outflows hit records",
          matchedSymbols: ["IB1T"],
          matchedHoldingIds: ["IB1T-id"],
          relevanceScore: 25,
        }),
      ],
    });
    const q1 = bundle.questions.find((question) => question.id === "what_happened")!;
    expect(q1.answer).toMatch(/today/i);
    expect(q1.support).toMatch(/explains most|largest contributor/i);
    expect(q1.answer).not.toMatch(/Bitcoin ETF outflows hit records/i);
    const context = q1.expandItems.find((item) => item.id === "trace-relevant_context");
    expect(context?.detail).toMatch(/not a proven cause|not proof/i);
  });

  it("10. Q2 does not duplicate Q1’s daily-driver story", () => {
    const nukl = holding({
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear ETF",
      providerSymbol: "NUKL.XETRA",
      quantity: 100,
      currentPrice: 40,
      previousClose: 55,
    });
    const btc = holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
      quantity: 80,
      currentPrice: 100,
      previousClose: 99,
    });
    const uraniumUrl = "https://example.test/uranium-sector";
    const bitcoinUrl = "https://example.test/bitcoin-etf";
    const bundle = buildFourQuestions({
      holdings: [nukl, btc],
      preferredScope: "complete",
      goal,
      hasSavedGoal: true,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 12000,
        goal,
        hasSavedGoal: true,
      }),
      newsItems: [
        newsItem({
          id: "uranium-q1",
          title: "Uranium miners fall on supply headlines",
          canonicalUrl: uraniumUrl,
          matchedSymbols: ["NUKL"],
          matchedHoldingIds: ["NUKL-id"],
          relevanceScore: 20,
        }),
        newsItem({
          id: "bitcoin-q2",
          title: "Bitcoin ETF outflows hit records",
          canonicalUrl: bitcoinUrl,
          matchedSymbols: ["IB1T"],
          matchedHoldingIds: ["IB1T-id"],
          relevanceScore: 25,
        }),
      ],
    });
    const q1 = bundle.questions.find((question) => question.id === "what_happened")!;
    const q2 = bundle.questions.find((question) => question.id === "what_matters_now")!;
    expect(q1.support).toMatch(/Uranium|NUKL/i);
    expect(q2.answer).not.toMatch(/explains most of/i);
    expect(q2.answer).not.toBe(q1.answer);
    expect(q2.expandItems.some((item) => item.href === uraniumUrl)).toBe(false);
  });

  it("11. the same story is deduplicated across the surface model", () => {
    const shared = newsItem({
      id: "same-btc",
      title: "Bitcoin ETF outflows hit records",
      canonicalUrl: "https://example.test/same-btc",
      matchedSymbols: ["IB1T", "BTC"],
      relevanceScore: 25,
    });
    const ranked = rankHoldingIntelligenceCandidates(
      buildHoldingIntelligenceCandidates({
        holdings: [
          holding({
            symbol: "IB1T",
            name: "iShares Bitcoin ETP",
            quantity: 10,
            currentPrice: 80,
            previousClose: 50,
          }),
          holding({
            symbol: "BTC",
            name: "Bitcoin",
            assetType: "crypto",
            quantity: 1,
            currentPrice: 40,
            change24hPercent: 2,
          }),
        ],
        newsItems: [shared],
      }),
    );
    const left = buildHoldingStoryIdentity(ranked[0]!);
    const rightBefore = buildHoldingStoryIdentity(ranked[1]!);
    expect(isSameUnderlyingStory(left, rightBefore)).toBe(true);

    const deduped = dedupeSharedHoldingStories(ranked);
    expect(deduped[0]?.newsItem?.id).toBe("same-btc");
    expect(deduped[1]?.newsItem).toBeNull();
    expect(deduped[1]?.explanationNote).toMatch(/distinct holding-specific catalyst/i);
  });

  it("12. adds no extra fetch, EODHD, OpenAI, or polling path", () => {
    const files = [
      "lib/services/holdingIntelligence/newsHubRows.ts",
      "lib/services/holdingIntelligence/storyIdentity.ts",
      "lib/services/holdingIntelligence/q1HoldingContext.ts",
      "lib/services/holdingIntelligence/attachHoldingNews.ts",
      "lib/services/fourQuestions/buildFourQuestions.ts",
      "lib/services/news/newsBriefingLayout.ts",
      "lib/services/news/relevanceMatching.ts",
      "components/news/NewsForPortfolioSection.tsx",
      "components/holding/HoldingMoveContextCard.tsx",
      "lib/services/holdingIntelligence/holdingPageNews.ts",
      "app/holding/[ticker]/page.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/ETF_Data/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it("generic crypto on Bitcoin stays contextual, not a strong catalyst", () => {
    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
          quantity: 10,
          currentPrice: 80,
          previousClose: 70,
        }),
      ],
      newsItems: [
        newsItem({
          id: "crypto-only",
          title: "Crypto markets rally as altcoins recover",
          matchedSymbols: ["IB1T"],
          matchedHoldingIds: ["IB1T-id"],
          relevanceScore: CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
        }),
      ],
    });
    expect(candidate?.matchType).toBe("sector_theme");
    expect(candidate?.explanationNote).toBe(BITCOIN_CRYPTO_CONTEXT_NOTE);
    const row = buildNewsHubHoldingRows([candidate!])[0];
    expect(row?.matchRole).toBe("none");
    expect(row?.contextCopy).not.toMatch(/^Crypto markets rally/);
  });

  it("unavailable Q1 context is omitted rather than invented", () => {
    const [candidate] = buildHoldingIntelligenceCandidates({
      holdings: [
        holding({
          symbol: "VWCE",
          quantity: 10,
          currentPrice: 110,
          previousClose: 100,
        }),
      ],
      newsItems: [],
    });
    expect(buildQ1HoldingContextLayer(candidate!)).toBeNull();
  });

  it("News hub does not promote an immaterial holding just because it has many articles", () => {
    const rows = selectNewsHubHoldingCandidates(
      buildHoldingIntelligenceCandidates({
        holdings: [
          holding({
            symbol: "AIFS",
            name: "iShares AI Infrastructure UCITS ETF",
            providerSymbol: "AIFS.XETRA",
            quantity: 1,
            currentPrice: 100.02,
            previousClose: 100,
          }),
          holding({
            symbol: "NUKL",
            name: "VanEck Uranium ETF",
            providerSymbol: "NUKL.XETRA",
            quantity: 20,
            currentPrice: 50,
            previousClose: 40,
          }),
        ],
        newsItems: Array.from({ length: 8 }, (_, index) =>
          newsItem({
            id: `ai-${index}`,
            title: `AI infrastructure note ${index}`,
            matchedSymbols: ["AIFS"],
            matchedHoldingIds: ["AIFS-id"],
            relevanceScore: 22,
          }),
        ),
      }),
    );
    expect(rows.map((row) => row.symbol)).toEqual(["NUKL"]);
  });
});
