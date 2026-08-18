import { describe, expect, it } from "vitest";

import { buildResilienceProfile } from "@/lib/services/resilience";
import { buildResilienceTrace } from "@/lib/services/intelligenceTrace";
import { buildOnTrackTrace } from "@/lib/services/intelligenceTrace";
import { buildWhatMattersTrace } from "@/lib/services/intelligenceTrace/buildWhatMattersTrace";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
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
    pricingStatus: partial.pricingStatus ?? "live",
    tradingPair: partial.tradingPair,
  };
}

function baseIntelligence(): PersonalIntelligenceToday {
  return {
    generatedAt: "2026-08-01T12:00:00.000Z",
    version: "pi-today-v1",
    attention: "watch",
    headline: "Today is a larger-than-usual move for your portfolio (-2.7%).",
    portfolioMove: {
      todayChange: -1700,
      todayPercent: -2.7,
      hasDailyData: true,
      coverageComplete: true,
      validPerformanceCount: 2,
      eligibleMarketHoldingCount: 2,
      previousPortfolioValue: 62000,
    },
    topContributors: [
      {
        symbol: "AAPL",
        name: "Apple",
        move: 100,
        changePercent: 5.3,
        contributionPp: 0.2,
        weightPercent: 3.2,
      },
    ],
    topDetractors: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        move: -1800,
        changePercent: -3,
        contributionPp: -2.9,
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
    attentionItems: [
      {
        id: "aapl",
        kind: "contributor",
        label: "Apple",
        detail: "Apple is today's positive contributor.",
        materiality: "medium",
        source: "portfolio",
      },
    ],
    dataNotes: [],
  };
}

function viewWithDriver(symbol: string, name: string): ThirtySecondsBriefingView {
  return {
    title: "Today",
    headline: `${name} is today's main driver.`,
    isQuiet: false,
    moveSummary: null,
    drivers: [
      {
        name,
        symbol,
        contributionLabel: symbol === "BTC" ? "-2.9 pp" : "+0.2 pp",
        periodLabel: null,
        tone: symbol === "BTC" ? "negative" : "positive",
      },
    ],
    attentionItems: [],
    periodNote: null,
    coverageNote: null,
    supportingQuietLine: null,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

describe("Phase 7A intelligence trace quality", () => {
  const apple = holding({
    symbol: "AAPL",
    name: "Apple",
    quantity: 10,
    currentPrice: 200,
    previousClose: 190,
  });
  const btc = holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    quantity: 1,
    currentPrice: 60_000,
    purchasePrice: 50_000,
    previousClose: 61_800,
    change24hPercent: -3,
  });

  it("Q2 evidence matches a portfolio-move insight subject", () => {
    const trace = buildWhatMattersTrace({
      insight: "Today is a larger-than-usual move for your portfolio (-2.7%).",
      intelligence: baseIntelligence(),
      view: viewWithDriver("AAPL", "Apple"),
      holdings: [apple, btc],
      resilienceProfile: buildResilienceProfile({
        holdings: [apple, btc],
        goal,
        hasSavedGoal: true,
      }),
      goal: goal,
      hasSavedGoal: false,
    });

    const evidence = trace?.layers.find((layer) => layer.id === "evidence");
    expect(evidence?.detail).toMatch(/portfolio-level move/i);
    expect(evidence?.bullets?.join(" ")).toContain("Today's portfolio move");
    expect(evidence?.bullets?.join(" ")).not.toContain("Apple portfolio weight");
  });

  it("omits unrelated sensitivity when the Q2 subject and scenario do not match", () => {
    const trace = buildWhatMattersTrace({
      insight: "Apple is today's main driver.",
      intelligence: baseIntelligence(),
      view: viewWithDriver("AAPL", "Apple"),
      holdings: [apple, btc],
      resilienceProfile: buildResilienceProfile({
        holdings: [apple, btc],
        goal,
        hasSavedGoal: true,
      }),
      goal,
      hasSavedGoal: false,
    });

    expect(trace?.layers.some((layer) => layer.id === "sensitivity")).toBe(false);
  });

  it("allows related sensitivity when the Q2 subject matches the supported scenario", () => {
    const intelligence = baseIntelligence();
    intelligence.attentionItems = [
      {
        id: "btc",
        kind: "contributor",
        label: "Bitcoin",
        detail: "Bitcoin is today's main driver.",
        materiality: "high",
        source: "portfolio",
      },
    ];

    const trace = buildWhatMattersTrace({
      insight: "Bitcoin is today's main driver.",
      intelligence,
      view: viewWithDriver("BTC", "Bitcoin"),
      holdings: [apple, btc],
      resilienceProfile: buildResilienceProfile({
        holdings: [apple, btc],
        goal,
        hasSavedGoal: true,
      }),
      goal,
      hasSavedGoal: false,
    });

    const sensitivity = trace?.layers.find((layer) => layer.id === "sensitivity");
    expect(sensitivity?.detail).toContain("Bitcoin");
    expect(sensitivity?.href).toContain("scenario-stress");
  });

  it("does not truncate percentages in resilience evidence", () => {
    const profile = buildResilienceProfile({
      holdings: [apple, btc],
      goal,
      hasSavedGoal: true,
    });
    const trace = buildResilienceTrace({
      profile,
      insight: "Your portfolio is most sensitive to Bitcoin −20%.",
    });

    const evidence = trace?.layers.find((layer) => layer.id === "evidence");
    const blob = `${evidence?.detail ?? ""} ${(evidence?.bullets ?? []).join(" ")}`;
    expect(blob).toContain("96.8%");
    expect(blob).not.toContain("represents 96. of the portfolio");
  });

  it("includes all four weighted factors and reconciles to the engine score", () => {
    const profile = buildResilienceProfile({
      holdings: [btc],
      goal,
      hasSavedGoal: true,
    });
    const trace = buildResilienceTrace({
      profile,
      insight: "Your portfolio is most sensitive to Bitcoin −20%.",
    });

    const calculation = trace?.layers.find((layer) => layer.id === "calculation");
    const bullets = calculation?.bullets ?? [];

    expect(bullets.some((b) => b.startsWith("Concentration:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Diversification:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Cash buffer:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Scenario sensitivity:"))).toBe(true);

    const master = bullets.find((b) => b.startsWith("Master score:"));
    expect(master).toContain(`→ ${profile.score}/100`);

    const expectedWeighted = profile.factors
      .filter((factor) => factor.applicable && factor.score !== null)
      .reduce((sum, factor) => {
        const weights = {
          concentration: 0.3,
          diversification: 0.25,
          cash_buffer: 0.2,
          scenario_sensitivity: 0.25,
        } as const;
        return sum + (factor.score ?? 0) * weights[factor.id];
      }, 0);

    expect(master).toContain(expectedWeighted.toFixed(1));
    expect(calculation?.detail).toContain(`${profile.score}/100`);
  });

  it("omits planning-assumption wording when no reliable saved assumption exists", () => {
    const progress = {
      currentProgressPercent: 20,
      currentValue: 200_000,
      targetValue: 1_000_000,
      remainingAmount: 800_000,
      estimatedCompletionDate: null,
      estimatedCompletionLabel: "Insufficient history",
      requiredMonthlyGrowth: null,
      currentTrajectory: "Unknown",
      status: "Unknown",
      summary: "Goal progress is available, but recent pace cannot yet be compared reliably.",
      generatedAt: "2026-08-01T12:00:00.000Z",
      hasGoal: true,
      goalReached: false,
      portfolioValueAvailable: true,
    } as const;
    const trace = buildOnTrackTrace({
      insight: "On track",
      progress,
      goal: {
        ...goal,
        expectedAnnualReturn: Number.NaN,
      } as GoalSettings,
      realityCheck: null,
      resilienceProfile: null,
    });

    const calculation = trace?.layers.find((layer) => layer.id === "calculation");
    const blob = `${calculation?.detail ?? ""} ${(calculation?.bullets ?? []).join(" ")}`;
    expect(blob).not.toMatch(/saved planning assumption|expected return assumption/i);
  });
});
