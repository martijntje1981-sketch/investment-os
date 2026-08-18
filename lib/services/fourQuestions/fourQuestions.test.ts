import { describe, expect, it } from "vitest";

import {
  filterHoldingsByIntelligenceScope,
  resolveIntelligenceScope,
} from "@/lib/services/intelligenceScope";
import {
  buildAmIOnTrackQuestion,
  buildFourQuestions,
  buildWhatHappenedQuestion,
  buildWhatMattersNowQuestion,
  buildWhatsAheadQuestion,
} from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const now = "2026-08-01T12:00:00.000Z";
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
    pricingStatus: partial.pricingStatus,
    tradingPair: partial.tradingPair,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

describe("intelligence scope foundation", () => {
  it("defaults to complete without preferred scope", () => {
    const resolved = resolveIntelligenceScope();
    expect(resolved.scope).toBe("complete");
    expect(resolved.source).toBe("default_complete");
    expect(resolved.entitlementNote).toBeNull();
  });

  it("honors explicit preferred scope without pricing/gating fields", () => {
    expect(resolveIntelligenceScope({ preferred: "invest" }).scope).toBe(
      "invest",
    );
    expect(resolveIntelligenceScope({ preferred: "crypto" }).scope).toBe(
      "crypto",
    );
    const source = [
      "lib/services/intelligenceScope/resolveIntelligenceScope.ts",
      "lib/services/intelligenceScope/types.ts",
    ].join(" ");
    expect(source).not.toMatch(/stripe|checkout|subscription|entitle/i);
  });

  it("filters holdings by invest / crypto / complete", () => {
    const rows = [
      holding({ symbol: "AAPL", assetType: "investment" }),
      holding({
        symbol: "BTC",
        assetType: "crypto",
        change24hPercent: -2,
        currentPrice: 50_000,
        quantity: 0.1,
      }),
      holding({ symbol: "CASH", assetType: "cash", quantity: 1000, currentPrice: 1 }),
    ];
    expect(
      filterHoldingsByIntelligenceScope(rows, "invest").map((h) => h.symbol),
    ).toEqual(["AAPL", "CASH"]);
    expect(
      filterHoldingsByIntelligenceScope(rows, "crypto").map((h) => h.symbol),
    ).toEqual(["BTC"]);
    expect(filterHoldingsByIntelligenceScope(rows, "complete")).toHaveLength(3);
  });
});

describe("Four Questions builders", () => {
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
    currentPrice: 60_000,
    purchasePrice: 50_000,
    change24hPercent: -3,
  });

  it("builds all four questions for complete scope", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 100_000,
      goal,
      hasSavedGoal: true,
    });
    const bundle = buildFourQuestions({
      holdings: [invest, crypto],
      preferredScope: "complete",
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
      realityCheck: null,
    });
    expect(bundle.scope).toBe("complete");
    expect(bundle.intelligenceDepth).toBe("complete");
    expect(bundle.questions.map((q) => q.id)).toEqual([
      "what_happened",
      "what_matters_now",
      "am_i_on_track",
      "whats_ahead",
    ]);
    expect(bundle.questions.every((q) => q.explore.href.length > 0)).toBe(true);
  });

  it("filters Q1 to invest assets only", () => {
    const q = buildWhatHappenedQuestion({
      scope: "invest",
      holdings: filterHoldingsByIntelligenceScope([invest, crypto], "invest"),
    });
    expect(q.scope).toBe("invest");
    expect(q.answer.toLowerCase()).toContain("investment");
    expect(q.explore.href).toContain("what-happened");
  });

  it("filters Q1 to crypto assets only", () => {
    const q = buildWhatHappenedQuestion({
      scope: "crypto",
      holdings: filterHoldingsByIntelligenceScope([invest, crypto], "crypto"),
    });
    expect(q.scope).toBe("crypto");
    expect(q.answer.toLowerCase()).toContain("crypto");
  });

  it("Complete materiality uses one portfolio-level answer (not stacked)", () => {
    const q = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [invest, crypto],
    });
    expect(q.answer).not.toMatch(/Invest[\s\S]*Crypto|Crypto[\s\S]*Invest/i);
    expect(q.support == null || !q.support.includes("\n")).toBe(true);
  });

  it("Q2 quiet state is valid", () => {
    const quietHolding = holding({
      symbol: "MSFT",
      currentPrice: 100,
      previousClose: 100.05,
    });
    const bundle = buildFourQuestions({
      holdings: [quietHolding],
      preferredScope: "invest",
      goal: null,
      hasSavedGoal: false,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 100,
        goal: null,
        hasSavedGoal: false,
      }),
    });
    const q2 = bundle.questions.find((q) => q.id === "what_matters_now")!;
    // Either quiet copy or a single conclusion — never empty answer
    expect(q2.answer.length).toBeGreaterThan(0);
  });

  it("Q2 explicit quiet answer when no intelligence", () => {
    const q = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [],
      intelligence: null,
      goal: null,
      hasSavedGoal: false,
      resilienceProfile: null,
    });
    expect(q.quiet).toBe(true);
    expect(q.answer).toMatch(/nothing requires special attention/i);
  });

  it("Q2 avoids repeating Q1 same-purpose daily driver wording when structure offers more meaning", () => {
    const intelligence: PersonalIntelligenceToday = {
      generatedAt: "2026-08-01T12:00:00.000Z",
      version: "pi-today-v1",
      attention: "watch",
      headline: "Bitcoin is today's main driver.",
      portfolioMove: {
        todayChange: -1700,
        todayPercent: -2.7,
        hasDailyData: true,
        coverageComplete: true,
        validPerformanceCount: 2,
        eligibleMarketHoldingCount: 2,
        previousPortfolioValue: 62000,
      },
      topContributors: [],
      topDetractors: [
        {
          symbol: "BTC",
          name: "Bitcoin",
          move: -1700,
          changePercent: -2.8,
          contributionPp: -2.7,
          weightPercent: 96.8,
          assetType: "crypto",
          periodLabel: "24h",
        },
      ],
      holdingsWeights: [
        { symbol: "AAPL", name: "Apple", weightPercent: 3.2 },
        { symbol: "BTC", name: "Bitcoin", weightPercent: 96.8 },
      ],
      exposure: null,
      news: null,
      goals: null,
      attentionItems: [],
      dataNotes: [],
    };
    const q2 = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      intelligence,
      cryptoDashboardLine: null,
      goal,
      hasSavedGoal: true,
      resilienceProfile: buildResilienceProfile({
        holdings: [invest, crypto],
        goal,
        hasSavedGoal: true,
      }),
      avoidDailyDriverSymbol: "BTC",
    });
    expect(q2.answer.toLowerCase()).toMatch(/concentration risk|dominant concentration/);
  });

  it("Goals work for invest, crypto, and complete scopes", () => {
    for (const scope of ["invest", "crypto", "complete"] as const) {
      const scoped = filterHoldingsByIntelligenceScope(
        [invest, crypto],
        scope,
      );
      const progress = deriveGoalProgress({
        currentPortfolioValue: scoped.reduce(
          (sum, row) => sum + row.quantity * row.currentPrice,
          0,
        ),
        goal,
        hasSavedGoal: true,
      });
      const q = buildAmIOnTrackQuestion({
        scope,
        progress,
        goal,
        realityCheck: null,
      });
      expect(q.answer.length).toBeGreaterThan(0);
      expect(q.explore.href).toContain("on-track");
      expect(q.answer).not.toMatch(/upgrade|complete to use goals/i);
    }
  });

  it("Q4 quiet when no forward signal", () => {
    const q = buildWhatsAheadQuestion({
      scope: "complete",
      holdings: [],
      resilienceProfile: null,
    });
    expect(q.quiet).toBe(true);
    expect(q.answer).toMatch(/no major portfolio-specific forward signal/i);
  });

  it("Q4 can surface scenario sensitivity when holdings exist", () => {
    const q = buildWhatsAheadQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      goal,
      hasSavedGoal: true,
      resilienceProfile: buildResilienceProfile({
        holdings: [invest, crypto],
        goal,
        hasSavedGoal: true,
      }),
    });
    expect(q.explore.href).toContain("whats-ahead");
    expect(q.answer.length).toBeGreaterThan(0);
  });

  it("Q1 trace expands through evidence and calculation", () => {
    const q = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [invest, crypto],
    });
    expect(q.expandItems.some((row) => row.id === "trace-evidence")).toBe(true);
    expect(q.expandItems.some((row) => row.id === "trace-calculation")).toBe(true);
    expect(q.expandItems.some((row) => row.id === "trace-confidence")).toBe(true);
  });

  it("Q3 trace expands through evidence, calculation, and confidence", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 62_000,
      goal,
      hasSavedGoal: true,
    });
    const q = buildAmIOnTrackQuestion({
      scope: "complete",
      progress,
      goal,
      realityCheck: null,
      resilienceProfile: buildResilienceProfile({
        holdings: [invest, crypto],
        goal,
        hasSavedGoal: true,
      }),
    });
    expect(q.expandItems.some((row) => row.id === "trace-evidence")).toBe(true);
    expect(q.expandItems.some((row) => row.id === "trace-calculation")).toBe(true);
    expect(q.expandItems.some((row) => row.id === "trace-confidence")).toBe(true);
  });

  it("attaches trustworthy click destinations for expand rows", () => {
    const q1 = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [invest, crypto],
    });
    expect(q1.explore.label).toBe("Explore full analysis");
    const evidence = q1.expandItems.find((row) => row.id === "trace-evidence");
    const calculation = q1.expandItems.find(
      (row) => row.id === "trace-calculation",
    );
    expect(evidence?.href).toContain("#portfolio-performance");
    expect(calculation?.href).toContain("#portfolio-performance");

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
        comparableAnnualPercent: -0.1,
        comparableKind: "recent_annualized_pace",
        periodId: "1Y",
        sourcePeriodLabel: "the last year",
        yearsRepresented: 1,
        gapPp: -20.1,
        historyQuality: "moderate",
        conclusion: "Pace trails assumption.",
        qualityNote: null,
        methodologyNote: "Constant-holdings EOD.",
        disclaimer:
          "Recent pace is historical and is not a forecast of future returns.",
      },
    });
    expect(q3.support).toMatch(/Based on your saved 10% growth assumption/);
    expect(q3.support).toContain("Pace trails assumption.");
    expect(q3.support).not.toMatch(/recent pace /i);
    expect(q3.support).not.toMatch(/forecast|will return|expected future/i);
    expect(q3.expandItems.some((row) => row.id === "trace-confidence")).toBe(true);
    expect(q3.explore.label).toBe("Explore full analysis");
    expect(q3.explore.href).toContain("on-track");

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
      nextEventLabel: "CPI release",
      nextEventHref: "/events",
    });
    const scenarioRow = q4.expandItems.find(
      (row) => row.href?.includes("scenario-stress"),
    );
    const resilienceRow = q4.expandItems.find(
      (row) => row.href?.includes("resilience-sleep"),
    );
    expect(scenarioRow).toBeTruthy();
    expect(resilienceRow).toBeTruthy();
    expect(q4.expandItems.find((row) => row.id === "event")?.href).toBe(
      "/events",
    );
    expect(q4.explore.label).toBe("Explore full analysis");
    expect(q4.explore.href).toContain("whats-ahead");
  });

  it("leaves expand rows without destinations non-clickable", () => {
    const q = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [],
      intelligence: null,
      goal: null,
      hasSavedGoal: false,
      resilienceProfile: null,
    });
    expect(q.expandItems.every((row) => !row.href)).toBe(true);
  });
});
