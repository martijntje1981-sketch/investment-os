import { describe, expect, it } from "vitest";

import {
  buildMarketCalmer,
  marketCalmerDriverSymbols,
  MARKET_CALMER_HIGH_STRESS_MIN_PERCENT,
  MARKET_CALMER_NOTABLE_MIN_PERCENT,
  MARKET_CALMER_PROHIBITED_PATTERNS,
  resolveMarketCalmerActivation,
} from "@/lib/services/marketCalmer";
import {
  buildPersonalActionPlan,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence/types";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
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
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    changePercent: overrides.changePercent,
    change24hPercent: overrides.change24hPercent,
  };
}

function goal(overrides: Partial<GoalSettings> = {}): GoalSettings {
  return {
    targetValue: overrides.targetValue ?? 200_000,
    targetYear: overrides.targetYear ?? 2035,
    monthlyContribution: overrides.monthlyContribution ?? 500,
    expectedAnnualReturn: overrides.expectedAnnualReturn ?? 7,
  };
}

function intelligence(input: {
  todayPercent: number;
  hasDailyData?: boolean;
  coverageComplete?: boolean;
  driver?: {
    symbol: string;
    name: string;
    contributionPp: number;
  } | null;
}): PersonalIntelligenceToday {
  const driver = input.driver;
  const contrib = driver
    ? {
        symbol: driver.symbol,
        name: driver.name,
        move: driver.contributionPp * 100,
        changePercent: driver.contributionPp > 0 ? 5 : -5,
        contributionPp: driver.contributionPp,
        weightPercent: 40,
        assetType: "crypto",
        periodLabel: "24h",
      }
    : null;

  return {
    generatedAt: "2026-08-16T12:00:00.000Z",
    version: "pi-today-v1",
    attention: "watch",
    headline: "Test headline",
    portfolioMove: {
      todayChange: input.todayPercent * 100,
      todayPercent: input.todayPercent,
      hasDailyData: input.hasDailyData ?? true,
      coverageComplete: input.coverageComplete ?? true,
      validPerformanceCount: 2,
      eligibleMarketHoldingCount: 2,
      previousPortfolioValue: 10_000,
    },
    topContributors:
      contrib && contrib.contributionPp > 0 ? [contrib] : [],
    topDetractors:
      contrib && contrib.contributionPp < 0 ? [contrib] : [],
    holdingsWeights: driver
      ? [{ symbol: driver.symbol, name: driver.name, weightPercent: 40 }]
      : [],
    exposure: null,
    news: null,
    goals: null,
    attentionItems: [],
    dataNotes: [],
  };
}

const btcHoldings = [
  holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    quantity: 1,
    currentPrice: 40_000,
  }),
  holding({
    symbol: "EUR",
    name: "Euro cash",
    assetType: "cash",
    quantity: 60_000,
    currentPrice: 1,
  }),
];

function assertNoAdvisory(calmer: ReturnType<typeof buildMarketCalmer>) {
  const text = [
    calmer.headline ?? "",
    ...calmer.supportingFacts,
    calmer.mainDriver?.summary ?? "",
    calmer.scenarioContext?.summary ?? "",
    calmer.resilienceContext?.summary ?? "",
    calmer.goalContext?.summary ?? "",
    ...calmer.dataNotes,
    ...calmer.assumptions,
    ...calmer.limitations,
  ].join("\n");
  for (const pattern of MARKET_CALMER_PROHIBITED_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

describe("resolveMarketCalmerActivation", () => {
  it("uses centralized thresholds", () => {
    expect(MARKET_CALMER_NOTABLE_MIN_PERCENT).toBe(0.35);
    expect(MARKET_CALMER_HIGH_STRESS_MIN_PERCENT).toBe(1.5);
    expect(resolveMarketCalmerActivation(0.2, true)).toBe("inactive");
    expect(resolveMarketCalmerActivation(0.35, true)).toBe("notable");
    expect(resolveMarketCalmerActivation(1.49, true)).toBe("notable");
    expect(resolveMarketCalmerActivation(1.5, true)).toBe("high_stress");
    expect(resolveMarketCalmerActivation(-1.5, true)).toBe("high_stress");
    expect(resolveMarketCalmerActivation(2, false)).toBe("inactive");
  });
});

describe("buildMarketCalmer", () => {
  it("stays inactive on a normal day", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({ todayPercent: 0.2 }),
      holdings: btcHoldings,
    });
    expect(calmer.activation).toBe("inactive");
    expect(calmer.headline).toBeNull();
  });

  it("activates notable negative day", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -0.8,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -0.6 },
      }),
      holdings: btcHoldings,
    });
    expect(calmer.activation).toBe("notable");
    expect(calmer.direction).toBe("negative");
    expect(calmer.headline).toMatch(/notable move/i);
    expect(calmer.mainDriver?.symbol).toBe("BTC");
    assertNoAdvisory(calmer);
  });

  it("activates high-stress negative day", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -2.4,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -1.8 },
      }),
      holdings: btcHoldings,
    });
    expect(calmer.activation).toBe("high_stress");
    expect(calmer.direction).toBe("negative");
    expect(calmer.headline).toMatch(/larger-than-usual/i);
  });

  it("activates notable and high-stress positive days", () => {
    const notable = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: 0.9,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: 0.7 },
      }),
      holdings: btcHoldings,
    });
    expect(notable.activation).toBe("notable");
    expect(notable.direction).toBe("positive");

    const high = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: 2.1,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: 1.5 },
      }),
      holdings: btcHoldings,
    });
    expect(high.activation).toBe("high_stress");
    expect(high.direction).toBe("positive");
    expect(high.headline).toMatch(/moving strongly/i);
  });

  it("stays inactive when daily performance is missing", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -3,
        hasDailyData: false,
      }),
      holdings: btcHoldings,
    });
    expect(calmer.activation).toBe("inactive");
  });

  it("includes main driver when available and handles missing driver", () => {
    const withDriver = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -1,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -0.8 },
      }),
      holdings: btcHoldings,
    });
    expect(withDriver.mainDriver?.name).toBe("Bitcoin");

    const without = buildMarketCalmer({
      intelligence: intelligence({ todayPercent: -1, driver: null }),
      holdings: btcHoldings,
    });
    expect(without.mainDriver).toBeNull();
  });

  it("builds a scenario comparison against Bitcoin stress when defensible", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -2,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -1.5 },
      }),
      holdings: btcHoldings,
    });
    expect(calmer.scenarioContext).not.toBeNull();
    expect(calmer.scenarioContext?.scenarioId).toBe("bitcoin_minus_20");
    expect(calmer.scenarioContext?.summary).toMatch(/size comparison only/i);
    // |−2%| < |−8%| bitcoin sleeve impact on 40% weight
    expect(calmer.scenarioContext?.comparison).toBe("smaller_than_scenario");
  });

  it("notes when scenario comparison is unavailable", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({ todayPercent: -1 }),
      holdings: [],
    });
    expect(calmer.activation).toBe("notable");
    expect(calmer.dataNotes.join(" ")).toMatch(/scenario comparison/i);
  });

  it("includes resilience context on active days", () => {
    const calmer = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -1.2,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -0.9 },
      }),
      holdings: btcHoldings,
    });
    expect(calmer.resilienceContext?.summary).toMatch(/resilience|scenario/i);
  });

  it("omits goal context without a goal and includes it when relevant", () => {
    const noGoal = buildMarketCalmer({
      intelligence: intelligence({ todayPercent: -2 }),
      holdings: btcHoldings,
      hasSavedGoal: false,
    });
    expect(noGoal.goalContext).toBeNull();

    const withGoal = buildMarketCalmer({
      intelligence: intelligence({
        todayPercent: -2,
        driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -1.5 },
      }),
      holdings: btcHoldings,
      goal: goal(),
      hasSavedGoal: true,
    });
    expect(withGoal.goalContext?.summary).toBeTruthy();
  });

  it("suppresses Action Plan Understand when Calmer already names the driver", () => {
    const pi = intelligence({
      todayPercent: -2,
      driver: { symbol: "BTC", name: "Bitcoin", contributionPp: -1.6 },
    });
    // Ensure Understand would otherwise fire: dominant share high
    pi.topDetractors = [
      {
        symbol: "BTC",
        name: "Bitcoin",
        move: -160,
        changePercent: -4,
        contributionPp: -1.6,
        weightPercent: 40,
        assetType: "crypto",
      },
    ];

    const calmer = buildMarketCalmer({
      intelligence: pi,
      holdings: btcHoldings,
    });
    expect(marketCalmerDriverSymbols(calmer)).toEqual(["BTC"]);

    const plan = buildPersonalActionPlan(pi, {
      suppressUnderstandForSymbols: marketCalmerDriverSymbols(calmer),
    });
    expect(
      plan.items.some((item) => item.id === "action-understand-driver"),
    ).toBe(false);

    const unsuppressed = buildPersonalActionPlan(pi);
    expect(
      unsuppressed.items.some((item) => item.id === "action-understand-driver"),
    ).toBe(true);
  });

  it("does not mutate holdings or goal", () => {
    const holdings = [...btcHoldings];
    const saved = goal({ monthlyContribution: 250 });
    const beforeGoal = { ...saved };
    const beforeHoldings = holdings.map((row) => ({ ...row }));

    buildMarketCalmer({
      intelligence: intelligence({ todayPercent: -2 }),
      holdings,
      goal: saved,
      hasSavedGoal: true,
    });

    expect(saved).toEqual(beforeGoal);
    expect(holdings).toEqual(beforeHoldings);
  });
});
