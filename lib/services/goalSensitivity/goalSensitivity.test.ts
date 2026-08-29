import { describe, expect, it } from "vitest";

import {
  buildContributionSensitivity,
  buildGoalSensitivityFromScenario,
  buildTargetYearSensitivity,
  GOAL_SENSITIVITY_PROHIBITED_PATTERNS,
} from "@/lib/services/goalSensitivity";
import { runPortfolioScenario } from "@/lib/services/scenarioEngine";
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
    targetValue: overrides.targetValue ?? 100_000,
    targetYear: overrides.targetYear ?? 2035,
    monthlyContribution: overrides.monthlyContribution ?? 500,
    expectedAnnualReturn: overrides.expectedAnnualReturn ?? 7,
    name: overrides.name,
    passiveIncomeTarget: overrides.passiveIncomeTarget,
  };
}

const mixedHoldings = [
  holding({
    symbol: "VWCE",
    providerSymbol: "VWCE.XETRA",
    quantity: 400,
    currentPrice: 100,
  }),
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
    quantity: 20_000,
    currentPrice: 1,
  }),
];

describe("buildGoalSensitivityFromScenario", () => {
  it("computes goal impact for an active goal with a market scenario", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "bitcoin_minus_20");
    const saved = goal({ targetValue: 200_000, monthlyContribution: 800 });
    const frozen = Object.freeze({ ...saved });

    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: frozen,
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.hypotheticalPortfolioValue).toBe(
      scenario.portfolioTotalValue +
        (scenario.estimatedPortfolioImpactAmount ?? 0),
    );
    expect(result.currentGap).toBeLessThan(result.stressedGap ?? 0);
    expect(result.gapChange).toBeGreaterThan(0);
    expect(result.currentProgressPercent).toBeGreaterThan(
      result.stressedProgressPercent ?? 0,
    );
    expect(result.progressChangePercent).toBeLessThan(0);
    expect(frozen.monthlyContribution).toBe(800);
    expect(frozen.targetValue).toBe(200_000);
  });

  it("returns no_goal when the user has no saved goal", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "crypto_minus_20");
    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: null,
      hasSavedGoal: false,
    });

    expect(result.status).toBe("no_goal");
    expect(result.explanation).toMatch(/Add a goal/i);
    expect(result.currentGap).toBeNull();
    expect(result.stressedGap).toBeNull();
  });

  it("handles a goal already reached", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "global_equities_minus_20");
    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal({
        targetValue: 10_000,
        monthlyContribution: 0,
        expectedAnnualReturn: 0,
      }),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.currentGoal?.goalReached).toBe(true);
    expect(result.currentGap).toBe(0);
  });

  it("surfaces behind-schedule status for a distant underfunded goal", () => {
    const scenario = runPortfolioScenario(
      [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 10,
          currentPrice: 100,
        }),
      ],
      "global_equities_minus_20",
    );

    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal({
        targetValue: 1_000_000,
        targetYear: 2027,
        monthlyContribution: 50,
        expectedAnnualReturn: 3,
      }),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.currentGoal?.status).toMatch(/Behind|Slightly behind/);
    expect(result.gapChange).toBeGreaterThan(0);
  });

  it("keeps positive and negative gap arithmetic consistent with portfolio impact", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "bitcoin_minus_20");
    expect(scenario.estimatedPortfolioImpactAmount).toBeLessThan(0);

    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal({ targetValue: 500_000 }),
      hasSavedGoal: true,
    });

    expect(result.hypotheticalPortfolioValue).toBe(
      roundMoney(
        scenario.portfolioTotalValue +
          (scenario.estimatedPortfolioImpactAmount ?? 0),
      ),
    );
    expect(result.gapChange).toBe(
      roundMoney((result.stressedGap ?? 0) - (result.currentGap ?? 0)),
    );
  });

  it("does not mutate the provided goal object", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "crypto_minus_20");
    const saved = goal({
      monthlyContribution: 333,
      targetYear: 2040,
      expectedAnnualReturn: 6.5,
    });
    const before = { ...saved };

    buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: saved,
      hasSavedGoal: true,
    });

    expect(saved).toEqual(before);
  });

  it("only exposes projected dates when the goal engine provides them", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "bitcoin_minus_20");
    const withProjection = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal({
        targetValue: 150_000,
        monthlyContribution: 1_000,
        expectedAnnualReturn: 8,
      }),
      hasSavedGoal: true,
    });

    if (withProjection.currentProjectedDate) {
      expect(withProjection.currentProjectedLabel).toBeTruthy();
      expect(withProjection.stressedProjectedDate).toBeTruthy();
    } else {
      expect(withProjection.estimatedDelayMonths).toBeNull();
    }

    // Zero contribution + zero return can still project linearly via month loop
    // when contribution and return are zero but value > 0 may never reach — then null.
    const noPath = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal({
        targetValue: 10_000_000,
        monthlyContribution: 0,
        expectedAnnualReturn: 0,
      }),
      hasSavedGoal: true,
    });
    expect(noPath.currentProjectedDate).toBeNull();
    expect(noPath.estimatedDelayMonths).toBeNull();
  });

  it("returns scenario_unavailable for insufficient scenario data", () => {
    const scenario = runPortfolioScenario([], "bitcoin_minus_20");
    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal(),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("scenario_unavailable");
    expect(result.hypotheticalPortfolioValue).toBeNull();
  });

  it("avoids advisory wording", () => {
    const scenario = runPortfolioScenario(mixedHoldings, "global_equities_minus_20");
    const result = buildGoalSensitivityFromScenario({
      scenarioResult: scenario,
      goal: goal(),
      hasSavedGoal: true,
    });

    const text = [
      result.explanation,
      ...result.assumptions,
      ...result.limitations,
    ].join("\n");

    for (const pattern of GOAL_SENSITIVITY_PROHIBITED_PATTERNS) {
      expect(text).not.toMatch(pattern);
    }
  });
});

describe("buildContributionSensitivity", () => {
  it("builds illustrative contribution rows including current and zero floor", () => {
    const result = buildContributionSensitivity({
      currentPortfolioValue: 50_000,
      goal: goal({ monthlyContribution: 50 }),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.rows.map((row) => row.deltaEuro)).toEqual([
      -100, 0, 100, 200,
    ]);
    const reduced = result.rows.find((row) => row.deltaEuro === -100);
    expect(reduced?.monthlyContribution).toBe(0);
    const plus200 = result.rows.find((row) => row.deltaEuro === 200);
    expect(plus200?.monthlyContribution).toBe(250);
  });

  it("supports a zero baseline monthly contribution", () => {
    const result = buildContributionSensitivity({
      currentPortfolioValue: 20_000,
      goal: goal({ monthlyContribution: 0 }),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.baselineMonthlyContribution).toBe(0);
    expect(result.explanation).toMatch(/€0/);
  });

  it("returns no_goal when contribution data has no saved goal", () => {
    const result = buildContributionSensitivity({
      currentPortfolioValue: 20_000,
      goal: null,
      hasSavedGoal: false,
    });
    expect(result.status).toBe("no_goal");
  });

  it("does not mutate stored contribution on the goal object", () => {
    const saved = goal({ monthlyContribution: 400 });
    const before = saved.monthlyContribution;
    buildContributionSensitivity({
      currentPortfolioValue: 40_000,
      goal: saved,
      hasSavedGoal: true,
    });
    expect(saved.monthlyContribution).toBe(before);
  });
});

describe("buildTargetYearSensitivity", () => {
  it("compares current target year with +1 year illustratively", () => {
    const result = buildTargetYearSensitivity({
      currentPortfolioValue: 40_000,
      goal: goal({ targetYear: 2030, monthlyContribution: 700 }),
      hasSavedGoal: true,
    });

    expect(result.status).toBe("ok");
    expect(result.currentTargetYear).toBe(2030);
    expect(result.illustrativeTargetYear).toBe(2031);
    expect(result.current?.remainingAmount).toBe(
      result.withExtraYear?.remainingAmount,
    );
  });
});

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
