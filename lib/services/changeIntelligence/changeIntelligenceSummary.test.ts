import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "path";

import {
  applyFourQuestionsIntelligenceDepth,
  buildAmIOnTrackQuestion,
  buildFourQuestions,
  buildWhatMattersNowQuestion,
  buildWhatsAheadQuestion,
} from "@/lib/services/fourQuestions";
import {
  buildChangeIntelligenceSummary,
  resolveIntelligenceSnapshotCapturePlan,
  summarizeStoredChangeIntelligence,
} from "@/lib/services/changeIntelligence";
import { CHANGE_INTELLIGENCE_COMPLETE_TEASE } from "@/lib/services/changeIntelligence/config";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  partial: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const now = "2026-08-18T12:00:00.000Z";
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

const goal: GoalSettings = {
  targetValue: 750_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 20,
};

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 2,
        valuedHoldingCount: 2,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 47,
      hhi: 0.35,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: 11.3,
      monthlyContribution: 500,
      expectedAnnualReturnPercent: 20,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 68,
      bandId: "balanced",
      bandLabel: "Balanced",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 40 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin drawdown",
        estimatedPortfolioImpactPercent: 18,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload> & {
      concentration?: Partial<IntelligenceStatePayload["concentration"]>;
      goal?: IntelligenceStatePayload["goal"];
      resilience?: IntelligenceStatePayload["resilience"];
      holdings?: IntelligenceStatePayload["holdings"];
      exposure?: IntelligenceStatePayload["exposure"];
    };
  },
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  const payload: IntelligenceStatePayload = {
    ...base,
    ...overrides.payload,
    portfolio: overrides.payload?.portfolio ?? base.portfolio,
    holdings: overrides.payload?.holdings ?? base.holdings,
    exposure: overrides.payload?.exposure ?? base.exposure,
    concentration: {
      ...base.concentration,
      ...overrides.payload?.concentration,
    },
    goal:
      overrides.payload && "goal" in overrides.payload
        ? overrides.payload.goal ?? null
        : base.goal,
    resilience:
      overrides.payload && "resilience" in overrides.payload
        ? overrides.payload.resilience ?? null
        : base.resilience,
    scorecard: overrides.payload?.scorecard ?? base.scorecard,
  };
  return {
    id: overrides.id ?? "snap-1",
    userId: overrides.userId ?? "user-1",
    portfolioId: overrides.portfolioId ?? "port-1",
    schemaVersion: 1,
    capturedAt: overrides.capturedAt ?? "2026-08-17T08:00:00.000Z",
    snapshotKind: overrides.snapshotKind ?? "monthly",
    periodKey: overrides.periodKey ?? "2026-07",
    periodStart: overrides.periodStart ?? "2026-07-01",
    periodEnd: overrides.periodEnd ?? "2026-07-31",
    timezone: overrides.timezone ?? "Europe/Amsterdam",
    payload,
  };
}

const btcHolding = {
  id: "btc",
  symbol: "BTC",
  name: "Bitcoin",
  quantity: 1,
  value: 47_000,
  weightPercent: 47,
  assetType: "crypto" as const,
  providerSymbol: "BTC-USD",
};

const previous = snapshot({
  payload: {
    holdings: [btcHolding],
    exposure: {
      groups: [{ groupId: "crypto", displayLabel: "Crypto", weightPercent: 47 }],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
  },
});

const current = snapshot({
  id: "snap-2",
  periodKey: "2026-08",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  capturedAt: "2026-09-02T08:00:00.000Z",
  payload: {
    concentration: { largestHoldingWeightPercent: 52 },
    goal: {
      goalId: "goal-1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: 12,
      monthlyContribution: 500,
      expectedAnnualReturnPercent: 20,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 61,
      bandId: "moderate",
      bandLabel: "Moderate",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 32 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin drawdown",
        estimatedPortfolioImpactPercent: 22,
      },
    },
    holdings: [{ ...btcHolding, value: 52_000, weightPercent: 52 }],
    exposure: {
      groups: [{ groupId: "crypto", displayLabel: "Crypto", weightPercent: 52 }],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
  },
});

const btcIntelligence: PersonalIntelligenceToday = {
  generatedAt: "2026-08-18T12:00:00.000Z",
  version: "pi-today-v1",
  attention: "watch",
  headline: "Bitcoin remains your largest concentration.",
  portfolioMove: {
    todayChange: -400,
    todayPercent: -0.4,
    hasDailyData: true,
    coverageComplete: true,
    validPerformanceCount: 2,
    eligibleMarketHoldingCount: 2,
    previousPortfolioValue: 100_000,
  },
  topContributors: [],
  topDetractors: [
    {
      symbol: "BTC",
      name: "Bitcoin",
      move: -400,
      changePercent: -0.8,
      contributionPp: -0.4,
      weightPercent: 52,
      assetType: "crypto",
      periodLabel: "24h",
    },
  ],
  holdingsWeights: [
    { symbol: "BTC", name: "Bitcoin", weightPercent: 52 },
    { symbol: "AAPL", name: "Apple", weightPercent: 48 },
  ],
  exposure: null,
  news: null,
  goals: null,
  attentionItems: [],
  dataNotes: [],
};

const invest = holding({
  symbol: "AAPL",
  name: "Apple",
  quantity: 10,
  currentPrice: 200,
  previousClose: 190,
});
const crypto = holding({
  symbol: "BTC",
  name: "Bitcoin",
  assetType: "crypto",
  quantity: 1,
  currentPrice: 52_000,
  purchasePrice: 47_000,
  change24hPercent: -0.8,
});

describe("Phase 8B ChangeIntelligenceSummary", () => {
  it("1. no previous snapshot → no fabricated change story", () => {
    const summary = buildChangeIntelligenceSummary({ previous: null, current });
    expect(summary.status).toBe("insufficient_history");
    expect(summary.primaryStory).toBeNull();
    expect(summary.freeHeadline).toBeNull();
    expect(summary.goalChange).toBeNull();
    expect(summary.resilienceChange).toBeNull();
  });

  it("2. Bitcoin 47 → 52 can prefer change over static concentration in Q2", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    const q2 = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      intelligence: btcIntelligence,
      goal,
      hasSavedGoal: true,
      resilienceProfile: buildResilienceProfile({
        holdings: [invest, crypto],
        goal,
        hasSavedGoal: true,
      }),
      changeIntelligence: summary,
      intelligenceDepth: "complete",
    });
    expect(q2.answer).toMatch(/Bitcoin concentration increased from 47% to 52%/i);
    expect(q2.answer).not.toMatch(/remains your largest/i);
    expect(q2.expandItems.some((row) => row.id === "trace-change")).toBe(true);
  });

  it("3. concentration + crypto exposure → one primary story, not duplicate headlines", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    expect(summary.primaryStory?.category).toBe("concentration");
    expect(summary.supportingStories.some((row) => row.category === "exposure")).toBe(
      false,
    );
    expect(summary.primaryStory?.relatedLines.join(" ")).toMatch(/Crypto exposure also/i);
    const blob = [
      summary.primaryStory?.headline,
      ...(summary.supportingStories.map((row) => row.headline) ?? []),
    ].join("\n");
    expect(blob.match(/Crypto exposure increased/g) ?? []).toHaveLength(0);
  });

  it("4. resilience 68 → 61 is valid Q4 change context", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    const q4 = buildWhatsAheadQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      goal,
      hasSavedGoal: true,
      resilienceProfile: buildResilienceProfile({
        holdings: [invest, crypto],
        goal,
        hasSavedGoal: true,
      }),
      changeIntelligence: summary,
      intelligenceDepth: "complete",
    });
    expect(q4.answer).toMatch(/more sensitive to Bitcoin drawdown/i);
    expect(summary.resilienceChange).not.toBeNull();
  });

  it("5. goal 11.3 → 12.0 with unchanged goal is valid Q3 change", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    const progress = deriveGoalProgress({
      currentPortfolioValue: 90_000,
      goal,
      hasSavedGoal: true,
    });
    const q3 = buildAmIOnTrackQuestion({
      scope: "complete",
      progress,
      goal,
      realityCheck: null,
      changeIntelligence: summary,
      intelligenceDepth: "complete",
    });
    expect(q3.answer).toMatch(/Goal progress improved from 11\.3% to 12/i);
    expect(summary.goalChange?.goalDefinitionChanged).toBe(false);
  });

  it("6. goal target changed → progress narrative suppressed/flagged", () => {
    const summary = buildChangeIntelligenceSummary({
      previous,
      current: snapshot({
        periodKey: "2026-08",
        payload: {
          goal: {
            goalId: "goal-1",
            targetValue: 1_000_000,
            targetYear: 2035,
            progressPercent: 12,
            monthlyContribution: 500,
            expectedAnnualReturnPercent: 20,
            portfolioValueAvailable: true,
          },
        },
      }),
    });
    expect(summary.goalChange?.goalDefinitionChanged).toBe(true);
    const progress = deriveGoalProgress({
      currentPortfolioValue: 90_000,
      goal: { ...goal, targetValue: 1_000_000 },
      hasSavedGoal: true,
    });
    const q3 = buildAmIOnTrackQuestion({
      scope: "complete",
      progress,
      goal: { ...goal, targetValue: 1_000_000 },
      realityCheck: null,
      changeIntelligence: summary,
      intelligenceDepth: "complete",
    });
    expect(q3.answer).not.toMatch(/Goal progress improved from/i);
    expect(`${q3.answer} ${q3.support}`).toMatch(/goal definition changed/i);
  });

  it("7. quantity changed → no buy/sell causal wording", () => {
    const summary = buildChangeIntelligenceSummary({
      previous,
      current: snapshot({
        periodKey: "2026-08",
        payload: {
          concentration: { largestHoldingWeightPercent: 52 },
          holdings: [{ ...btcHolding, quantity: 1.2, weightPercent: 52 }],
        },
      }),
    });
    expect(summary.primaryStory?.quantityChanged).toBe(true);
    const blob = [
      summary.primaryStory?.headline,
      summary.primaryStory?.meaning,
      summary.primaryStory?.relatedLines.join(" "),
      summary.primaryStory?.limitations.join(" "),
    ].join("\n");
    expect(blob).not.toMatch(/\bbought\b|\bsold\b|\bbuy\b|\bsell\b|\brebalance\b/i);
    expect(blob).toMatch(/quantity also changed/i);
  });

  it("8. Free → concise headline only / limited depth", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    const q2 = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      intelligence: btcIntelligence,
      goal,
      hasSavedGoal: true,
      resilienceProfile: null,
      changeIntelligence: summary,
      intelligenceDepth: "free",
    });
    expect(q2.answer).toBe("Your portfolio became more concentrated this month.");
    expect(q2.answer).not.toMatch(/47%|52%/);
    const free = applyFourQuestionsIntelligenceDepth(
      {
        scope: "complete",
        intelligenceDepth: "complete",
        questions: [q2],
      },
      "free",
    ).questions[0]!;
    expect(free.expandItems.some((row) => row.id === "trace-change")).toBe(false);
    expect(free.expandItems.some((row) => row.id === "complete-preview")).toBe(true);
    expect(free.expandItems.map((row) => row.detail).join(" ")).toMatch(
      /See what changed and why it matters/,
    );
    expect(summary.completeTease).toBe(CHANGE_INTELLIGENCE_COMPLETE_TEASE);
  });

  it("9. Complete → exact delta + deeper trace available", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    expect(summary.primaryStory?.headline).toMatch(/from 47% to 52%/);
    expect(summary.primaryStory?.supportingLine).toMatch(/47.*52/);
    expect(summary.primaryStory?.whyAvailable).toMatch(/two stored monthly/i);
    const q2 = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      intelligence: btcIntelligence,
      goal,
      hasSavedGoal: true,
      resilienceProfile: null,
      changeIntelligence: summary,
      intelligenceDepth: "complete",
    });
    expect(q2.expandItems.some((row) => row.id === "trace-change")).toBe(true);
    expect(q2.expandItems.some((row) => row.id === "trace-meaning")).toBe(true);
    expect(q2.expandItems.some((row) => row.id === "trace-confidence")).toBe(true);
  });

  it("10. first weekly/monthly snapshot → insufficient-history behavior", () => {
    expect(summarizeStoredChangeIntelligence([current], "monthly").status).toBe(
      "insufficient_history",
    );
    expect(summarizeStoredChangeIntelligence([current], "weekly").status).toBe(
      "insufficient_history",
    );
    const review = read("components/companion/WhatChangedSection.tsx");
    expect(review).toContain("FIRST_HISTORY_COPY");
  });

  it("11. capture plan is idempotent at the review gate and skips demo", () => {
    const valued = [crypto, invest];
    const ready = resolveIntelligenceSnapshotCapturePlan({
      isDemo: false,
      holdings: valued,
      weeklyReady: true,
      monthlyReady: true,
      monthlyPeriodKind: "calendar_month",
    });
    expect(ready.kinds).toEqual(["weekly", "monthly"]);
    const demo = resolveIntelligenceSnapshotCapturePlan({
      isDemo: true,
      holdings: valued,
      weeklyReady: true,
      monthlyReady: true,
      monthlyPeriodKind: "calendar_month",
    });
    expect(demo.kinds).toEqual([]);
    expect(demo.skipReason).toBe("demo");
    const mtd = resolveIntelligenceSnapshotCapturePlan({
      isDemo: false,
      holdings: valued,
      weeklyReady: true,
      monthlyReady: true,
      monthlyPeriodKind: "month_to_date",
    });
    expect(mtd.kinds).toEqual(["weekly"]);
  });

  it("12. Demo snapshots are not compared or captured into user history", () => {
    const demoCurrent = snapshot({
      payload: { isDemo: true, concentration: { largestHoldingWeightPercent: 52 } },
    });
    const summary = buildChangeIntelligenceSummary({ previous, current: demoCurrent });
    expect(summary.status).toBe("insufficient_history");
    const capture = read("lib/client/captureIntelligenceSnapshots.ts");
    expect(capture).toContain("isDemo: false");
    expect(read("app/api/intelligence/snapshots/route.ts")).toContain(
      "Demo snapshots are not saved",
    );
  });

  it("13. same raw input → deterministic same summary", () => {
    const first = buildChangeIntelligenceSummary({ previous, current });
    const second = buildChangeIntelligenceSummary({ previous, current });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const blob = JSON.stringify(first);
    for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
    expect(blob).not.toMatch(/\bcaused\b/i);
  });
});

describe("Phase 8B Four Questions briefing hierarchy", () => {
  it("keeps Q1 on the day while Q2/Q3/Q4 use stored change", () => {
    const summary = buildChangeIntelligenceSummary({ previous, current });
    const progress = deriveGoalProgress({
      currentPortfolioValue: 90_000,
      goal,
      hasSavedGoal: true,
    });
    const bundle = buildFourQuestions({
      holdings: [
        holding({
          symbol: "NUKL",
          name: "VanEck Uranium and Nuclear ETF",
          quantity: 100,
          currentPrice: 40,
          previousClose: 48,
        }),
        crypto,
      ],
      preferredScope: "complete",
      intelligenceDepth: "complete",
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
      changeIntelligence: summary,
    });
    const q1 = bundle.questions.find((row) => row.id === "what_happened")!;
    const q2 = bundle.questions.find((row) => row.id === "what_matters_now")!;
    const q3 = bundle.questions.find((row) => row.id === "am_i_on_track")!;
    const q4 = bundle.questions.find((row) => row.id === "whats_ahead")!;
    expect(q1.answer).not.toMatch(/concentration increased from 47%/i);
    expect(q2.answer).toMatch(/Bitcoin concentration increased from 47% to 52%/i);
    expect(q3.answer).toMatch(/Goal progress improved from 11\.3% to 12/i);
    expect(q4.answer).toMatch(/more sensitive to Bitcoin drawdown/i);
  });
});

describe("Phase 8B capture cost safety", () => {
  it("does not add EODHD, OpenAI, polling, or a new cron", () => {
    const files = [
      "lib/services/changeIntelligence/buildChangeIntelligenceSummary.ts",
      "lib/client/captureIntelligenceSnapshots.ts",
      "lib/client/useChangeIntelligence.ts",
      "app/api/intelligence/snapshots/route.ts",
      "components/companion/CompanionReviewPage.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|anthropic/i);
    }
    expect(read("vercel.json")).not.toMatch(/intelligence\/snapshots/);
    expect(read("app/dashboard/page.tsx")).not.toContain(
      "captureIntelligenceSnapshotsFromReview",
    );
  });
});
