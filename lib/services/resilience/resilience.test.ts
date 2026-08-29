import { describe, expect, it } from "vitest";

import {
  bandFromScore,
  buildResilienceProfile,
  RESILIENCE_BANDS,
  RESILIENCE_FACTOR_WEIGHTS,
  RESILIENCE_PROHIBITED_PATTERNS,
} from "@/lib/services/resilience";
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

function assertNoAdvisory(profile: ReturnType<typeof buildResilienceProfile>) {
  const text = [
    profile.summary,
    profile.primaryDriverExplanation ?? "",
    profile.mostSensitive?.note ?? "",
    profile.goalContext?.summary ?? "",
    ...profile.assumptions,
    ...profile.limitations,
    ...profile.factors.map((factor) => factor.explanation),
  ].join("\n");
  for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

describe("buildResilienceProfile", () => {
  it("scores a highly concentrated single-holding portfolio as more sensitive", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 100_000,
      }),
    ];

    const profile = buildResilienceProfile({ holdings });
    expect(profile.status).toBe("ok");
    expect(profile.score).not.toBeNull();
    expect(profile.score!).toBeLessThan(55);
    expect(profile.mostSensitive?.scenarioId).toBe("bitcoin_minus_20");
    expect(profile.mostSensitive?.estimatedPortfolioImpactPercent).toBe(-20);
    expect(
      profile.factors.find((factor) => factor.id === "concentration")?.score,
    ).toBeLessThan(20);
    assertNoAdvisory(profile);
  });

  it("scores a diversified equity + cash mix higher than a single crypto holding", () => {
    const diversified = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 300,
        currentPrice: 100,
      }),
      holding({
        symbol: "NUKL",
        providerSymbol: "NUKL.XETRA",
        quantity: 100,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 20_000,
        currentPrice: 1,
      }),
    ];
    const concentrated = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 100_000,
      }),
    ];

    const diversifiedProfile = buildResilienceProfile({ holdings: diversified });
    const concentratedProfile = buildResilienceProfile({
      holdings: concentrated,
    });

    expect(diversifiedProfile.score!).toBeGreaterThan(
      concentratedProfile.score!,
    );
    expect(diversifiedProfile.factors.find((f) => f.id === "cash_buffer")?.score)
      .toBeGreaterThan(60);
  });

  it("recognizes a cash-heavy portfolio buffer", () => {
    const holdings = [
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 30_000,
        currentPrice: 1,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 700,
        currentPrice: 100,
      }),
    ];

    const profile = buildResilienceProfile({ holdings });
    const cash = profile.factors.find((factor) => factor.id === "cash_buffer");
    expect(cash?.score).toBeGreaterThan(70);
    expect(cash?.explanation).toMatch(/cash/i);
    expect(profile.mostSensitive?.scenarioId).toBe("global_equities_minus_20");
  });

  it("ranks crypto-heavy portfolios toward crypto/bitcoin scenarios", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 60_000,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        quantity: 20,
        currentPrice: 2_000,
      }),
    ];

    const profile = buildResilienceProfile({ holdings });
    expect(["bitcoin_minus_20", "crypto_minus_20"]).toContain(
      profile.mostSensitive?.scenarioId,
    );
    // Full crypto sleeve → crypto -20% is at least as large as bitcoin-only
    expect(profile.mostSensitive?.scenarioId).toBe("crypto_minus_20");
  });

  it("ranks equity-heavy portfolios toward global equities scenario", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 500,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 5_000,
        currentPrice: 1,
      }),
    ];

    const profile = buildResilienceProfile({ holdings });
    expect(profile.mostSensitive?.scenarioId).toBe("global_equities_minus_20");
  });

  it("handles no cash explicitly", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 100,
        currentPrice: 100,
      }),
    ];
    const profile = buildResilienceProfile({ holdings });
    const cash = profile.factors.find((factor) => factor.id === "cash_buffer");
    expect(cash?.explanation).toMatch(/No cash/i);
  });

  it("omits goal context when no goal is saved", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
      }),
    ];
    const profile = buildResilienceProfile({
      holdings,
      goal: null,
      hasSavedGoal: false,
    });
    expect(profile.goalContext).toBeNull();
  });

  it("includes goal context for an active goal using Phase 2B", () => {
    const holdings = [
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
    const saved = goal({ targetValue: 200_000 });
    const before = { ...saved };

    const profile = buildResilienceProfile({
      holdings,
      goal: saved,
      hasSavedGoal: true,
    });

    expect(profile.goalContext).not.toBeNull();
    expect(profile.goalContext?.summary).toMatch(/goal progress would move from/i);
    expect(saved).toEqual(before);
  });

  it("handles incomplete / missing data", () => {
    const profile = buildResilienceProfile({ holdings: [] });
    expect(profile.status).toBe("insufficient_data");
    expect(profile.score).toBeNull();
    expect(profile.mostSensitive).toBeNull();
  });

  it("notes unclassified holdings without inventing equity coverage", () => {
    const holdings = [
      holding({
        symbol: "AAPL",
        name: "Apple Inc",
        quantity: 50,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 50_000,
        currentPrice: 1,
      }),
    ];
    const profile = buildResilienceProfile({ holdings });
    expect(profile.status).toBe("ok");
    // Unclassified equity is not shocked by global equities scenario
    expect(profile.mostSensitive?.estimatedPortfolioImpactPercent ?? 0).toBe(0);
  });

  it("does not mutate holdings arrays", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
    ];
    const before = holdings.map((row) => ({ ...row }));
    buildResilienceProfile({ holdings });
    expect(holdings).toEqual(before);
  });

  it("uses centralized band thresholds", () => {
    expect(bandFromScore(80).id).toBe("strong");
    expect(bandFromScore(65).id).toBe("balanced");
    expect(bandFromScore(45).id).toBe("moderate");
    expect(bandFromScore(25).id).toBe("sensitive");
    expect(bandFromScore(0).id).toBe("highly_sensitive");
    expect(RESILIENCE_BANDS[0]?.minScore).toBe(80);
    const weightSum = Object.values(RESILIENCE_FACTOR_WEIGHTS).reduce(
      (sum, value) => sum + value,
      0,
    );
    expect(weightSum).toBeCloseTo(1, 5);
  });
});
