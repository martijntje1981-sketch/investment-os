import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveProductAccess } from "@/lib/services/productAccess";
import { DEFERRED_SCENARIO_NOTES } from "@/lib/services/scenarioEngine";
import {
  buildContributionWhatIfPresets,
  buildPlanningAssumptionPresets,
  buildWhatIfScenario,
  WHAT_IF_DISCLAIMER,
  WHAT_IF_PROHIBITED_PATTERNS,
} from "@/lib/services/whatIf";
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
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
  };
}

function goal(overrides: Partial<GoalSettings> = {}): GoalSettings {
  return {
    targetValue: overrides.targetValue ?? 1_000_000,
    targetYear: overrides.targetYear ?? 2040,
    monthlyContribution: overrides.monthlyContribution ?? 500,
    expectedAnnualReturn: overrides.expectedAnnualReturn ?? 8,
    name: overrides.name,
  };
}

/** Bitcoin-heavy diversified book: €120,000 with 48% BTC. */
const bitcoinHeavyHoldings: StoredPortfolioHolding[] = [
  holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    providerSymbol: "BTC-EUR.CC",
    quantity: 1,
    currentPrice: 57_600,
  }),
  holding({
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    providerSymbol: "VWCE.XETRA",
    quantity: 400,
    currentPrice: 100,
  }),
  holding({
    symbol: "EUR",
    name: "Euro cash",
    assetType: "cash",
    quantity: 22_400,
    currentPrice: 1,
  }),
];

const completeAccess = resolveProductAccess({ exampleKind: "converted" });
const freeAccess = resolveProductAccess({ exampleKind: "none" });
const trialAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "personal",
  expiresAt: "2099-01-01T00:00:00.000Z",
  daysRemaining: 11,
});
const demoAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "demo",
  expiresAt: "2099-01-01T00:00:00.000Z",
  daysRemaining: 5,
});

function readWhatIfSources(): string {
  const files = [
    "lib/services/whatIf/buildWhatIfScenario.ts",
    "lib/services/whatIf/types.ts",
    "lib/services/whatIf/wording.ts",
    "lib/services/whatIf/access.ts",
    "lib/services/whatIf/options.ts",
    "components/goals/WhatIfExplorer.tsx",
  ];
  return files
    .map((relative) =>
      readFileSync(path.resolve(process.cwd(), relative), "utf8"),
    )
    .join("\n");
}

describe("What-if Intelligence — canonical model", () => {
  it("1. models Bitcoin −20% portfolio impact", () => {
    const saved = Object.freeze(goal());
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: saved,
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      access: completeAccess,
    });

    expect(result.status).toBe("modeled");
    expect(result.affectedPortfolioWeightPercent).toBe(48);
    expect(result.portfolioImpactPercent).toBe(-9.6);
    expect(result.portfolioImpactAmount).toBe(-11_520);
    expect(result.current.portfolioValue).toBe(120_000);
    expect(result.whatIf.portfolioValue).toBe(108_480);
    expect(result.disclaimer).toBe(WHAT_IF_DISCLAIMER);
  });

  it("2. models equity scenario portfolio impact", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "global_equities_minus_20" },
      access: completeAccess,
    });

    expect(result.status).toBe("modeled");
    expect(result.affectedPortfolioWeightPercent).toBe(33.3);
    expect(result.portfolioImpactPercent).toBe(-6.7);
    expect(result.portfolioImpactAmount).toBe(-8_000);
    expect(result.whatIf.portfolioValue).toBe(112_000);
  });

  it("3. compares current vs stressed goal progress", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ targetValue: 1_000_000 }),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      access: completeAccess,
    });

    expect(result.current.goalProgressPercent).toBe(12);
    expect(result.whatIf.goalProgressPercent).toBe(10.8);
    expect(result.progressDelta).toBe(-1.2);
    expect(
      result.comparison.some((row) => row.id === "goal_progress"),
    ).toBe(true);
  });

  it("4. contribution increase improves modeled goal path where supported", () => {
    const baseline = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ monthlyContribution: 500, targetValue: 250_000 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      access: completeAccess,
    });
    const increased = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ monthlyContribution: 500, targetValue: 250_000 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      contributionOverride: 1_000,
      access: completeAccess,
    });

    expect(baseline.currentContribution).toBe(500);
    expect(increased.whatIfContribution).toBe(1_000);
    expect(baseline.current.estimatedCompletionDate).toBeTruthy();
    expect(increased.whatIf.estimatedCompletionDate).toBeTruthy();
    expect(
      Date.parse(increased.whatIf.estimatedCompletionDate!),
    ).toBeLessThan(Date.parse(baseline.current.estimatedCompletionDate!));
  });

  it("5. contribution decrease worsens modeled path", () => {
    const baseline = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ monthlyContribution: 500, targetValue: 250_000 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      access: completeAccess,
    });
    const decreased = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ monthlyContribution: 500, targetValue: 250_000 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      contributionOverride: 250,
      access: completeAccess,
    });

    expect(decreased.whatIfContribution).toBe(250);
    expect(
      Date.parse(decreased.whatIf.estimatedCompletionDate!),
    ).toBeGreaterThan(Date.parse(baseline.current.estimatedCompletionDate!));
  });

  it("6–7. planning assumption uses only saved/user-entered value with no hidden 10% default", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ expectedAnnualReturn: 8 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      planningAssumptionOverride: 5,
      access: completeAccess,
    });

    expect(result.currentPlanningAssumption).toBe(8);
    expect(result.whatIfPlanningAssumption).toBe(5);
    expect(result.currentPlanningAssumption).not.toBe(10);
    expect(result.whatIfPlanningAssumption).not.toBe(10);

    const untouched = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ expectedAnnualReturn: 8 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      access: completeAccess,
    });
    expect(untouched.currentPlanningAssumption).toBe(8);
    expect(untouched.whatIfPlanningAssumption).toBe(8);

    const source = readFileSync(
      path.resolve(process.cwd(), "lib/services/whatIf/buildWhatIfScenario.ts"),
      "utf8",
    );
    expect(source).not.toContain("GOAL_FORM_DEFAULT");
    expect(source).not.toMatch(/expectedAnnualReturn:\s*10/);
    expect(buildPlanningAssumptionPresets(8)).toContain(8);
    expect(buildPlanningAssumptionPresets(8)).not.toContain(10);
    expect(buildPlanningAssumptionPresets(null)).toEqual([]);
  });

  it("8. missing goal is handled honestly", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: null,
      hasSavedGoal: false,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      access: completeAccess,
    });

    expect(result.status).toBe("modeled");
    expect(result.current.goalProgressPercent).toBeNull();
    expect(result.whatIf.goalProgressPercent).toBeNull();
    expect(result.progressDelta).toBeNull();
    expect(result.currentContribution).toBeNull();
    expect(result.headline).toMatch(/Add a goal|Estimated portfolio impact/i);
  });

  it("9. unavailable portfolio value does not become zero", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 0,
      portfolioValueAvailable: false,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      access: completeAccess,
    });

    expect(result.status).toBe("unavailable_portfolio_value");
    expect(result.current.portfolioValue).toBeNull();
    expect(result.whatIf.portfolioValue).toBeNull();
    expect(result.portfolioImpactAmount).toBeNull();
    expect(result.headline).toMatch(/unavailable/i);
    expect(result.headline).not.toMatch(/€0/);
  });

  it("10. unsupported fixed-income rate scenario does not produce fake impact", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "unsupported", scenarioId: "rates_plus_1" },
      access: completeAccess,
    });

    expect(result.status).toBe("educational_only");
    expect(result.scenarioModeled).toBe(false);
    expect(result.portfolioImpactAmount).toBeNull();
    expect(result.portfolioImpactPercent).toBeNull();
    expect(result.headline).toMatch(/duration data is unavailable/i);
    expect(DEFERRED_SCENARIO_NOTES.some((note) => note.id === "rates_plus_1")).toBe(
      true,
    );
  });

  it("11. what-if changes do not persist into real goal state", () => {
    const saved = Object.freeze(
      goal({ monthlyContribution: 500, expectedAnnualReturn: 8 }),
    );
    buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: saved,
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      contributionOverride: 1_000,
      planningAssumptionOverride: 5,
      access: completeAccess,
    });

    expect(saved.monthlyContribution).toBe(500);
    expect(saved.expectedAnnualReturn).toBe(8);

    const explorer = readFileSync(
      path.resolve(process.cwd(), "components/goals/WhatIfExplorer.tsx"),
      "utf8",
    );
    expect(explorer).not.toContain("persistGoal");
    expect(explorer).not.toContain("onPersistGoal");
    expect(explorer).not.toContain("saveUserGoal");
  });

  it("12. Free gets limited preview", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      contributionOverride: 1_000,
      planningAssumptionOverride: 5,
      access: freeAccess,
    });

    expect(result.accessMode).toBe("free_preview");
    expect(result.explorer).toBe("preview");
    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.portfolioImpactPercent).toBe(-9.6);
    expect(result.portfolioImpactAmount).toBeNull();
    expect(result.current.portfolioValue).toBeNull();
    expect(result.whatIf.portfolioValue).toBeNull();
    expect(result.progressDelta).toBeNull();
    expect(result.whatIfContribution).toBe(500);
    expect(result.whatIfPlanningAssumption).toBe(8);
    expect(result.comparison).toEqual([]);
  });

  it("13. Complete gets full explorer", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      contributionOverride: 750,
      access: completeAccess,
    });

    expect(result.accessMode).toBe("complete");
    expect(result.explorer).toBe("full");
    expect(result.current.portfolioValue).toBe(120_000);
    expect(result.whatIf.portfolioValue).toBe(108_480);
    expect(result.whatIfContribution).toBe(750);
    expect(result.comparison.length).toBeGreaterThan(0);
  });

  it("14. Complete trial is allowed", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      access: trialAccess,
    });

    expect(trialAccess.isCompleteTrial).toBe(true);
    expect(result.accessMode).toBe("complete");
    expect(result.explorer).toBe("full");
    expect(result.whatIf.portfolioValue).toBe(108_480);
  });

  it("15. Demo stays isolated and does not persist", () => {
    const saved = Object.freeze(goal());
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: saved,
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      contributionOverride: 1_000,
      access: demoAccess,
    });

    expect(demoAccess.isDemo).toBe(true);
    expect(result.accessMode).toBe("demo");
    expect(result.explorer).toBe("full");
    expect(result.persistedGoalUnchanged).toBe(true);
    expect(saved.monthlyContribution).toBe(500);
  });

  it("16–17. no advice or prediction/probability wording", () => {
    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled", scenarioId: "bitcoin_minus_20" },
      contributionOverride: 750,
      planningAssumptionOverride: 5,
      access: completeAccess,
    });
    const blob = [
      result.headline,
      result.disclaimer,
      ...result.whatChanged,
      ...result.whatStayedConstant,
      ...result.calculationBullets,
      ...result.assumptions,
      ...result.limitations,
    ].join("\n");

    for (const pattern of WHAT_IF_PROHIBITED_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
    expect(result.disclaimer).toMatch(/not a forecast/i);
    expect(blob.toLowerCase()).not.toContain("tobailey expected return");
  });

  it("18. introduces no new EODHD / OpenAI / polling path", () => {
    const source = readWhatIfSources();
    expect(source).not.toMatch(/eodhd|EODHD|openai|OpenAI|fetch\(|setInterval|cron/i);
  });

  it("19. mobile-safe control structure", () => {
    const explorer = readFileSync(
      path.resolve(process.cwd(), "components/goals/WhatIfExplorer.tsx"),
      "utf8",
    );
    expect(explorer).toContain("min-h-11");
    expect(explorer).toContain('data-testid="what-if-explorer"');
    expect(explorer).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });

  it("20. same input produces the same output", () => {
    const input = {
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal(),
      hasSavedGoal: true,
      selection: { kind: "modeled" as const, scenarioId: "bitcoin_minus_20" as const },
      contributionOverride: 750,
      planningAssumptionOverride: 6,
      access: completeAccess,
    };
    const first = buildWhatIfScenario(input);
    const second = buildWhatIfScenario(input);
    expect(second).toEqual(first);
  });

  it("does not assume a contribution when none is saved", () => {
    const presets = buildContributionWhatIfPresets(null);
    expect(presets.presets).toEqual([]);
    expect(presets.hasSavedPositiveContribution).toBe(false);

    const result = buildWhatIfScenario({
      holdings: bitcoinHeavyHoldings,
      currentPortfolioValue: 120_000,
      portfolioValueAvailable: true,
      goal: goal({ monthlyContribution: 0 }),
      hasSavedGoal: true,
      selection: { kind: "none" },
      access: completeAccess,
    });
    expect(result.currentContribution).toBe(0);
    expect(result.whatIfContribution).toBe(0);
    expect(result.hasSavedContribution).toBe(true);
  });
});
