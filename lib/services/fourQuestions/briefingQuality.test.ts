import { describe, expect, it } from "vitest";

import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import {
  buildFourQuestions,
  evaluateBriefingSelection,
  selectWhatMattersAttention,
  themeKeyForHolding,
  themeKeyForSymbol,
} from "@/lib/services/fourQuestions";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  const now = "2026-08-21T12:00:00.000Z";
  return {
    id: partial.id ?? `${partial.symbol}-id`,
    symbol: partial.symbol,
    name: partial.name,
    quantity: partial.quantity ?? 1,
    purchasePrice: partial.purchasePrice ?? 100,
    currentPrice: partial.currentPrice ?? 100,
    previousClose: partial.previousClose ?? 100,
    currency: "EUR",
    portfolioCurrency: "EUR",
    assetType: partial.assetType ?? "investment",
    createdAt: now,
    updatedAt: now,
    priceDataStatus: "live",
    change24hPercent: partial.change24hPercent,
    changePercent: partial.changePercent,
    platform: partial.platform ?? null,
    pairCurrency: partial.pairCurrency,
    pricingStatus: partial.pricingStatus,
    tradingPair: partial.tradingPair,
    providerSymbol: partial.providerSymbol,
    providerInstrumentType: partial.providerInstrumentType,
    instrumentName: partial.instrumentName,
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
    publishedAt: "2026-08-21T08:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.summary ?? overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: overrides.matchedHoldingIds ?? [],
    matchedSymbols: overrides.matchedSymbols ?? [],
    matchedHoldings: overrides.matchedHoldings ?? [],
    relevanceLabel: "Strong portfolio match",
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-21T12:00:00.000Z",
    relevanceScore: overrides.relevanceScore ?? STRONG_PORTFOLIO_MATCH_SCORE + 7,
    ...overrides,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

function portfolioValue(rows: StoredPortfolioHolding[]): number {
  return rows.reduce((sum, row) => sum + row.quantity * row.currentPrice, 0);
}

function buildBundle(
  holdings: StoredPortfolioHolding[],
  extra?: {
    newsItems?: NewsContentItem[];
    nextEventLabel?: string | null;
  },
) {
  return buildFourQuestions({
    holdings,
    preferredScope: "complete",
    goal,
    hasSavedGoal: true,
    goalProgress: deriveGoalProgress({
      currentPortfolioValue: portfolioValue(holdings),
      goal,
      hasSavedGoal: true,
    }),
    newsItems: extra?.newsItems,
    nextEventLabel: extra?.nextEventLabel ?? null,
    nextEventHref: extra?.nextEventLabel ? "/events" : null,
  });
}

function question(
  bundle: ReturnType<typeof buildFourQuestions>,
  id: "what_happened" | "what_matters_now" | "am_i_on_track" | "whats_ahead",
) {
  return bundle.questions.find((row) => row.id === id)!;
}

function bitcoinDominantHoldings(input?: {
  nuklChange?: { current: number; previous: number };
  quiet?: boolean;
}): StoredPortfolioHolding[] {
  const quiet = input?.quiet ?? false;
  const nuklCurrent = input?.nuklChange?.current ?? (quiet ? 80 : 80);
  const nuklPrevious = input?.nuklChange?.previous ?? (quiet ? 79.9 : 88);
  return [
    holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
      quantity: 70,
      currentPrice: quiet ? 100 : 105,
      previousClose: 100,
      purchasePrice: 80,
    }),
    holding({
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear ETF",
      providerSymbol: "NUKL.XETRA",
      quantity: 10,
      currentPrice: nuklCurrent,
      previousClose: nuklPrevious,
    }),
    holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerSymbol: "VWCE.XETRA",
      quantity: 10,
      currentPrice: quiet ? 80 : 80.2,
      previousClose: 80,
    }),
    holding({
      symbol: "PPFB",
      name: "WisdomTree Physical Gold ETC",
      providerSymbol: "PPFB.XETRA",
      quantity: 8,
      currentPrice: quiet ? 100 : 100.4,
      previousClose: 100,
    }),
    holding({
      symbol: "EUNA",
      name: "iShares Global Aggregate Bond UCITS ETF",
      providerSymbol: "EUNA.XETRA",
      providerInstrumentType: "ETF",
      quantity: 8,
      currentPrice: 75,
      previousClose: quiet ? 75 : 74.95,
    }),
  ];
}

describe("Four Questions briefing quality", () => {
  it("maps IB1T Bitcoin-named products onto the bitcoin theme", () => {
    const ib1t = holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
    });
    expect(themeKeyForHolding(ib1t)).toBe("bitcoin");
    expect(themeKeyForSymbol("IB1T", [ib1t])).toBe("bitcoin");
  });

  it("Test A — dominant Bitcoin: Q1 may own IB1T; remaining questions search elsewhere", () => {
    const holdings = bitcoinDominantHoldings();
    const ib1tValue = 70 * 105;
    const total = portfolioValue(holdings);
    expect(ib1tValue / total).toBeGreaterThan(0.6);
    expect(ib1tValue / total).toBeLessThan(0.8);

    const uraniumNews = newsItem({
      id: "nukl-halt",
      title: "Kazakhstan uranium export halt cuts miner output",
      matchedSymbols: ["NUKL"],
      matchedHoldingIds: ["NUKL-id"],
      matchedHoldings: [
        {
          id: "NUKL-id",
          symbol: "NUKL",
          name: "VanEck Uranium and Nuclear ETF",
          providerSymbol: "NUKL.XETRA",
        },
      ],
    });

    const bundle = buildBundle(holdings, {
      newsItems: [uraniumNews],
      nextEventLabel: "FOMC decision this week",
    });
    const q1 = question(bundle, "what_happened");
    const q2 = question(bundle, "what_matters_now");
    const q3 = question(bundle, "am_i_on_track");
    const q4 = question(bundle, "whats_ahead");

    expect(`${q1.answer} ${q1.support ?? ""}`).toMatch(/IB1T|Bitcoin/i);

    expect(q2.answer).toMatch(/Uranium|NUKL/i);
    expect(q2.answer).not.toMatch(/remains your largest portfolio concentration/i);
    expect(q2.answer).not.toMatch(/main driver|explains most/i);

    expect(q3.answer).not.toMatch(/IB1T rose|Bitcoin rose|main driver/i);
    expect(q3.answer.length).toBeGreaterThan(0);

    expect(q4.answer).toMatch(/FOMC decision this week/i);
    expect(q4.answer).not.toMatch(/Bitcoin −20%|Bitcoin -20%/i);

    const pick = selectWhatMattersAttention({
      holdings,
      intelligence: {
        generatedAt: "2026-08-21T12:00:00.000Z",
        version: "pi-today-v1",
        attention: "watch",
        headline: "IB1T explains most of today’s move.",
        portfolioMove: {
          todayChange: 350,
          todayPercent: 3.4,
          hasDailyData: true,
          coverageComplete: true,
          validPerformanceCount: 5,
          eligibleMarketHoldingCount: 5,
          previousPortfolioValue: 10_000,
        },
        topContributors: [],
        topDetractors: [],
        holdingsWeights: holdings.map((row) => ({
          symbol: row.symbol,
          name: row.name,
          weightPercent: (row.quantity * row.currentPrice / total) * 100,
        })),
        exposure: null,
        news: null,
        goals: null,
        attentionItems: [],
        dataNotes: [],
      },
      newsItems: [uraniumNews],
      avoidDailyDriverSymbol: "IB1T",
      usedThemeKeys: ["bitcoin"],
    });
    const trace = evaluateBriefingSelection({
      usedThemeKeys: ["bitcoin"],
      pick,
    });
    expect(trace.pick.themeKey).toBe("uranium");
    expect(trace.pick.whySelected.length).toBeGreaterThan(0);
    expect(trace.pick.angle).not.toBe("concentration");
    expect(
      trace.pick.rejected.every((row) => row.angle !== "concentration"),
    ).toBe(true);
  });

  it("Test B — balanced book does not invent diversification", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        quantity: 40,
        currentPrice: 100.3,
        previousClose: 100,
      }),
      holding({
        symbol: "AAPL",
        name: "Apple",
        quantity: 35,
        currentPrice: 100.2,
        previousClose: 100,
      }),
      holding({
        symbol: "MSFT",
        name: "Microsoft",
        quantity: 25,
        currentPrice: 100.1,
        previousClose: 100,
      }),
    ];
    const bundle = buildBundle(holdings);
    const q2 = question(bundle, "what_matters_now");
    expect(q2.answer).not.toMatch(/uranium|copper|gold|bitcoin/i);
    expect(q2.quiet || /nothing else requires special attention/i.test(q2.answer)).toBe(
      true,
    );
  });

  it("Test C — quiet day does not manufacture four dramatic insights", () => {
    const holdings = bitcoinDominantHoldings({ quiet: true });
    const bundle = buildBundle(holdings);
    const q2 = question(bundle, "what_matters_now");
    const q4 = question(bundle, "whats_ahead");
    expect(q2.quiet || /nothing else requires special attention/i.test(q2.answer)).toBe(
      true,
    );
    expect(q2.answer).not.toMatch(/fell sharply|halt|crisis|remains your largest/i);
    expect(q4.answer).not.toMatch(/fell sharply|halt|crisis/i);
  });

  it("Test D — a 5–10% holding with material news can outrank a second Bitcoin line", () => {
    const holdings = bitcoinDominantHoldings({
      nuklChange: { current: 80.2, previous: 80 },
    });
    const nuklValue = 10 * 80.2;
    const total = portfolioValue(holdings);
    expect(nuklValue / total).toBeGreaterThan(0.05);
    expect(nuklValue / total).toBeLessThan(0.12);

    const uraniumNews = newsItem({
      id: "nukl-major",
      title: "Nuclear-fuel contract awards lift uranium miners",
      matchedSymbols: ["NUKL"],
      matchedHoldingIds: ["NUKL-id"],
      matchedHoldings: [
        {
          id: "NUKL-id",
          symbol: "NUKL",
          name: "VanEck Uranium and Nuclear ETF",
          providerSymbol: "NUKL.XETRA",
        },
      ],
    });
    const bitcoinNews = newsItem({
      id: "ib1t-note",
      title: "Bitcoin ETF inflows continue",
      category: "crypto",
      marketCategory: "crypto",
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
    });

    const bundle = buildBundle(holdings, {
      newsItems: [bitcoinNews, uraniumNews],
    });
    const q1 = question(bundle, "what_happened");
    const q2 = question(bundle, "what_matters_now");
    expect(`${q1.answer} ${q1.support ?? ""}`).toMatch(/IB1T|Bitcoin/i);
    expect(q2.answer).toMatch(/Uranium|NUKL|Nuclear/i);
    expect(q2.answer).not.toMatch(/remains your largest/i);
    expect(q2.support ?? "").toMatch(/context, not proof|not a confirmed explanation/i);
  });
});
