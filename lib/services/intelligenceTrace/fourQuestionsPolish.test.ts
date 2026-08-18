import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { applyFourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/applyIntelligenceDepth";
import {
  buildAmIOnTrackQuestion,
  buildWhatHappenedQuestion,
  buildWhatMattersNowQuestion,
} from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import { buildWhatHappenedTrace } from "@/lib/services/intelligenceTrace/buildWhatHappenedTrace";
import { selectRelevantContext } from "@/lib/services/intelligenceTrace/selectRelevantContext";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildPortfolioPerformanceAttribution } from "@/lib/services/performanceAttribution";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const now = "2026-08-18T10:00:00.000Z";
  return {
    id: partial.id ?? partial.symbol,
    symbol: partial.symbol,
    name: partial.name ?? partial.symbol,
    quantity: partial.quantity ?? 1,
    purchasePrice: partial.purchasePrice ?? 100,
    currentPrice: partial.currentPrice ?? 110,
    previousClose: partial.previousClose ?? 100,
    currency: partial.currency ?? "EUR",
    portfolioCurrency: partial.portfolioCurrency ?? "EUR",
    assetType: partial.assetType ?? "investment",
    createdAt: now,
    updatedAt: now,
    priceDataStatus: "live",
    change24hPercent: partial.change24hPercent,
    changePercent: partial.changePercent,
    platform: partial.platform ?? null,
    pairCurrency: partial.pairCurrency,
    pricingStatus: partial.pricingStatus ?? "live",
    tradingPair: partial.tradingPair,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "CoinDesk",
    sourceType: "news",
    canonicalUrl: `https://www.coindesk.com/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-18T08:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.summary ?? overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: [],
    matchedSymbols: ["BTC"],
    matchedHoldings: [
      { id: "btc", symbol: "BTC", name: "Bitcoin", providerSymbol: "BTC" },
    ],
    relevanceLabel: "Strong portfolio match",
    category: "crypto",
    marketCategory: "crypto",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T10:00:00.000Z",
    relevanceScore: 20,
    ...overrides,
  };
}

function perspective(
  overrides: Partial<PerspectiveVideo> & Pick<PerspectiveVideo, "id" | "title">,
): PerspectiveVideo {
  return {
    videoId: overrides.id,
    url: `https://www.youtube.com/watch?v=${overrides.id}`,
    publishedAt: "2026-08-17T12:00:00.000Z",
    thumbnailUrl: null,
    description: null,
    channelId: "UCtest",
    channelTitle: "Coin Bureau",
    channelOwnerName: "Coin Bureau",
    creatorId: "coin-bureau",
    creatorName: "Coin Bureau",
    creatorAvatarUrl: null,
    trustedCreatorId: "coin-bureau",
    trustedCreatorName: "Coin Bureau",
    featuredPersonName: null,
    isTrustedSource: true,
    category: "bitcoin",
    categoryLabel: "Bitcoin",
    source: "youtube-rss",
    schemaVersion: "perspectives-identity-v2",
    ...overrides,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 20,
};

const apple = holding({
  symbol: "AAPL",
  name: "Apple",
  quantity: 10,
  currentPrice: 190,
  previousClose: 192,
});
const btc = holding({
  symbol: "BTC",
  name: "Bitcoin",
  assetType: "crypto",
  quantity: 1,
  currentPrice: 60_000,
  previousClose: 58_800,
  change24hPercent: 2,
});
const cash = holding({
  symbol: "CASH",
  name: "Euro cash",
  assetType: "cash",
  quantity: 5_000,
  currentPrice: 1,
  previousClose: 1,
});

const subject = { symbols: ["BTC"], names: ["Bitcoin"] };
const nowMs = Date.parse("2026-08-18T12:00:00.000Z");

describe("Phase 7 polish — relevant context", () => {
  it("surfaces highly relevant news as non-causal context", () => {
    const pick = selectRelevantContext({
      subject,
      newsItems: [
        newsItem({
          id: "btc-etf",
          title: "Bitcoin ETF inflows hit a record",
        }),
      ],
      holdings: [apple, btc],
      nowMs,
      prefer: "news",
    });
    expect(pick?.kind).toBe("news");
    expect(pick?.layer.title).toBe("Relevant context");
    expect(pick?.layer.detail).toMatch(/one related development/i);
    expect(pick?.layer.detail).not.toMatch(/because|caused|due to/i);
    expect(pick?.layer.href).toContain("coindesk.com");
    expect(pick?.layer.hrefExternal).toBe(true);
  });

  it("omits weak or generic news that merely mentions the asset", () => {
    const pick = selectRelevantContext({
      subject,
      newsItems: [
        newsItem({
          id: "generic",
          title: "Global markets mixed as traders await data",
          description: "Some desks mentioned bitcoin in passing.",
          summary: "Broad risk sentiment.",
          matchedSymbols: [],
          matchedHoldings: [],
          relevanceScore: 4,
          impactLevel: "Low Impact",
          sourceName: "Random Blog",
        }),
      ],
      holdings: [apple, btc],
      nowMs,
      prefer: "news",
    });
    expect(pick).toBeNull();
  });

  it("labels Perspective content as opinion, not a portfolio fact", () => {
    const pick = selectRelevantContext({
      subject,
      newsItems: [],
      perspectiveVideos: [
        perspective({
          id: "btc-macro",
          title: "Why Bitcoin still dominates crypto liquidity",
        }),
      ],
      holdings: [apple, btc],
      nowMs,
      prefer: "perspective",
    });
    expect(pick?.kind).toBe("perspective");
    expect(pick?.layer.title).toBe("Perspective");
    expect(pick?.layer.detail).toMatch(/perspective\/opinion/i);
    expect(pick?.layer.detail).not.toMatch(/because|caused/i);
    expect(pick?.layer.hrefExternal).toBe(true);
  });
});

describe("Phase 7 polish — meaning, clickability, Q3, Free", () => {
  it("Q1 meaning uses breadth rather than a generic concentration sentence", () => {
    const holdings = [apple, btc, cash];
    const daily = summarizeDailyPerformance(holdings);
    const attribution = buildPortfolioPerformanceAttribution({
      period: "1D",
      holdings,
    });
    const trace = buildWhatHappenedTrace({
      insight: "Portfolio moved",
      daily,
      attribution,
    });
    const meaning = trace?.layers.find((layer) => layer.id === "meaning");
    expect(meaning?.detail).toBeTruthy();
    expect(meaning?.detail).not.toBe(
      "Most of today's portfolio move came from one exposure rather than a broad move across the portfolio.",
    );
    expect(meaning?.href).toContain("#portfolio-performance");
  });

  it("clickable trace layers keep existing destinations; meaning without href stays non-clickable", () => {
    const q1 = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [apple, btc],
    });
    const evidence = q1.expandItems.find((row) => row.id === "trace-evidence");
    const meaning = q1.expandItems.find((row) => row.id === "trace-meaning");
    const confidence = q1.expandItems.find((row) => row.id === "trace-confidence");
    expect(evidence?.href).toContain("#portfolio-performance");
    expect(meaning?.href).toContain("#portfolio-performance");
    expect(confidence?.href == null || confidence.href === "").toBe(true);
  });

  it("Q1/Q2 keep the same subject without duplicating meaning", () => {
    const intelligence: PersonalIntelligenceToday = {
      generatedAt: "2026-08-18T12:00:00.000Z",
      version: "pi-today-v1",
      attention: "watch",
      headline: "Bitcoin is today's main driver.",
      portfolioMove: {
        todayChange: 400,
        todayPercent: 0.6,
        hasDailyData: true,
        coverageComplete: true,
        validPerformanceCount: 2,
        eligibleMarketHoldingCount: 2,
        previousPortfolioValue: 62_000,
      },
      topContributors: [
        {
          symbol: "BTC",
          name: "Bitcoin",
          move: 1_200,
          changePercent: 2,
          contributionPp: 1.9,
          weightPercent: 52,
        },
      ],
      topDetractors: [
        {
          symbol: "AAPL",
          name: "Apple",
          move: -200,
          changePercent: -1,
          contributionPp: -0.3,
          weightPercent: 30,
        },
      ],
      holdingsWeights: [
        { symbol: "BTC", name: "Bitcoin", weightPercent: 52 },
        { symbol: "AAPL", name: "Apple", weightPercent: 30 },
        { symbol: "CASH", name: "Euro cash", weightPercent: 18 },
      ],
      exposure: null,
      news: null,
      goals: null,
      attentionItems: [],
      dataNotes: [],
    };
    const q1 = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [apple, btc, cash],
    });
    const q2 = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [apple, btc, cash],
      intelligence,
      goal,
      hasSavedGoal: true,
      resilienceProfile: buildResilienceProfile({
        holdings: [apple, btc, cash],
        goal,
        hasSavedGoal: true,
      }),
      avoidDailyDriverSymbol: "BTC",
    });
    expect(q2.answer.toLowerCase()).toMatch(/concentration|weight|attention/);
    const q1Meaning = q1.expandItems.find((row) => row.id === "trace-meaning")?.detail ?? "";
    const q2Meaning = q2.expandItems.find((row) => row.id === "trace-meaning")?.detail ?? "";
    expect(q1Meaning).not.toBe(q2Meaning);
  });

  it("does not render recent pace 0.0% when history is insufficient", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 200_000,
      goal,
      hasSavedGoal: true,
    });
    const q3 = buildAmIOnTrackQuestion({
      scope: "complete",
      progress,
      goal,
      realityCheck: {
        available: true,
        expectedAnnualReturnPercent: 20,
        comparableAnnualPercent: 0,
        comparableKind: "recent_annualized_pace",
        periodId: "1W",
        sourcePeriodLabel: "the last week",
        yearsRepresented: 0.02,
        gapPp: -20,
        historyQuality: "short",
        conclusion: "Too little history.",
        qualityNote: "Short.",
        methodologyNote: "Constant-holdings EOD.",
        disclaimer: "Not a forecast.",
      },
    });
    expect(q3.support).toMatch(/saved 20% growth assumption/i);
    expect(q3.support).toMatch(/isn’t yet sufficient|isn't yet sufficient/i);
    expect(q3.support).not.toMatch(/recent pace 0\.0%/i);
  });

  it("uses a human-readable pace comparison when history is meaningful", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 200_000,
      goal,
      hasSavedGoal: true,
    });
    const q3 = buildAmIOnTrackQuestion({
      scope: "complete",
      progress,
      goal,
      realityCheck: {
        available: true,
        expectedAnnualReturnPercent: 20,
        comparableAnnualPercent: 8.4,
        comparableKind: "last_12_months",
        periodId: "1Y",
        sourcePeriodLabel: "the last 12 months",
        yearsRepresented: 1,
        gapPp: -11.6,
        historyQuality: "strong",
        conclusion:
          "Your planning assumption is 11.6 percentage points above your last 12-month return.",
        qualityNote: null,
        methodologyNote: "Constant-holdings EOD.",
        disclaimer: "Not a forecast.",
      },
    });
    expect(q3.support).toMatch(/Based on your saved 20% growth assumption/);
    expect(q3.support).toContain("last 12-month return");
    expect(q3.support).not.toMatch(/recent pace /i);
  });

  it("Free does not receive the full Complete interpretation", () => {
    const complete = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [apple, btc],
    });
    const free = applyFourQuestionsIntelligenceDepth(
      {
        scope: "complete",
        intelligenceDepth: "complete",
        questions: [complete],
      },
      "free",
    ).questions[0]!;
    expect(free.expandItems.some((row) => row.id === "trace-meaning")).toBe(false);
    expect(free.expandItems.some((row) => row.id === "complete-preview")).toBe(true);
    const preview = free.expandItems.find((row) => row.id === "complete-preview");
    expect(preview?.detail).toMatch(/deeper insight/i);
    expect(preview?.href).toBe(complete.explore.href);
    expect(preview?.bullets?.join(" ")).not.toMatch(/because/i);
  });

  it("introduces no new fetches in Four Questions intelligence builders", () => {
    const files = [
      "lib/services/intelligenceTrace/selectRelevantContext.ts",
      "lib/services/fourQuestions/buildFourQuestions.ts",
      "lib/services/intelligenceTrace/buildWhatHappenedTrace.ts",
      "lib/services/intelligenceTrace/buildWhatMattersTrace.ts",
      "lib/services/fourQuestions/buildAmIOnTrack.ts",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/openai|anthropic|setInterval|addEventListener\(\s*['"]scroll/i);
    }
  });
});
