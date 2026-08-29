/**
 * Phase 12 — canonical What-if composer.
 * Reuses Scenario Engine + Goal Progress Engine. Pure / ephemeral.
 */

import {
  getExpectedReturnAssumption,
  isValidExpectedAnnualReturnInput,
} from "@/lib/client/expectedReturnAssumption";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import {
  round1,
  roundMoney,
  toGoalSnapshot,
} from "@/lib/services/goalSensitivity/snapshots";
import {
  DEFERRED_SCENARIO_NOTES,
  getScenarioDefinition,
  runPortfolioScenario,
  type ScenarioId,
} from "@/lib/services/scenarioEngine";
import { resolveWhatIfAccessMode } from "@/lib/services/whatIf/access";
import { readSavedMonthlyContribution } from "@/lib/services/whatIf/options";
import type {
  WhatIfComparisonRow,
  WhatIfPathSnapshot,
  WhatIfScenarioInput,
  WhatIfScenarioResult,
  WhatIfUnsupportedScenarioId,
} from "@/lib/services/whatIf/types";
import {
  assertNoWhatIfAdvisoryLanguage,
  FIXED_INCOME_UNAVAILABLE_REASON,
  WHAT_IF_DISCLAIMER,
  WHAT_IF_SHARED_ASSUMPTIONS,
  WHAT_IF_SHARED_LIMITATIONS,
} from "@/lib/services/whatIf/wording";

const STABLE_GENERATED_AT = "1970-01-01T00:00:00.000Z";

function emptyPath(): WhatIfPathSnapshot {
  return {
    portfolioValue: null,
    goalProgressPercent: null,
    monthlyContribution: null,
    planningAssumptionPercent: null,
    estimatedCompletionLabel: null,
    estimatedCompletionDate: null,
  };
}

function formatEurPlain(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentPlain(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatShock(value: number): string {
  const rounded = round1(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function unsupportedNote(
  scenarioId: WhatIfUnsupportedScenarioId,
): { name: string; reason: string } {
  const found = DEFERRED_SCENARIO_NOTES.find((note) => note.id === scenarioId);
  if (found) return { name: found.name, reason: found.reason };
  return {
    name: "Interest rates",
    reason: FIXED_INCOME_UNAVAILABLE_REASON,
  };
}

function finalize(result: WhatIfScenarioResult): WhatIfScenarioResult {
  assertNoWhatIfAdvisoryLanguage([
    result.headline,
    result.disclaimer,
    ...result.whatChanged,
    ...result.whatStayedConstant,
    ...result.calculationBullets,
    ...result.assumptions,
    ...result.limitations,
    ...result.comparison.map((row) => `${row.label} ${row.current} ${row.whatIf}`),
  ]);
  return result;
}

function redactForFreePreview(
  result: WhatIfScenarioResult,
): WhatIfScenarioResult {
  if (result.accessMode !== "free_preview") return result;

  const impact =
    result.portfolioImpactPercent != null
      ? `Modeled portfolio impact about ${formatPercentPlain(result.portfolioImpactPercent)}.`
      : result.status === "educational_only"
        ? result.headline
        : "A modeled scenario preview is available.";

  return finalize({
    ...result,
    explorer: "preview",
    current: {
      ...result.current,
      portfolioValue: null,
      goalProgressPercent: null,
      estimatedCompletionLabel: null,
      estimatedCompletionDate: null,
    },
    whatIf: {
      ...result.whatIf,
      portfolioValue: null,
      goalProgressPercent: null,
      monthlyContribution: result.current.monthlyContribution,
      planningAssumptionPercent: result.current.planningAssumptionPercent,
      estimatedCompletionLabel: null,
      estimatedCompletionDate: null,
    },
    portfolioImpactAmount: null,
    progressDelta: null,
    whatIfContribution: result.currentContribution,
    whatIfPlanningAssumption: result.currentPlanningAssumption,
    comparison: [],
    headline: `${result.scenarioName}. ${impact}`,
    whatChanged: [],
    calculationBullets: [
      "Free preview shows one modeled scenario headline.",
      "Exact current vs what-if values are part of Complete.",
    ],
  });
}

function buildComparison(input: {
  current: WhatIfPathSnapshot;
  whatIf: WhatIfPathSnapshot;
  includePath: boolean;
}): WhatIfComparisonRow[] {
  const rows: WhatIfComparisonRow[] = [];
  if (
    input.current.portfolioValue != null &&
    input.whatIf.portfolioValue != null
  ) {
    rows.push({
      id: "portfolio_value",
      label: "Portfolio value",
      current: formatEurPlain(input.current.portfolioValue),
      whatIf: formatEurPlain(input.whatIf.portfolioValue),
    });
  }
  if (
    input.current.goalProgressPercent != null &&
    input.whatIf.goalProgressPercent != null
  ) {
    rows.push({
      id: "goal_progress",
      label: "Goal progress",
      current: formatPercentPlain(input.current.goalProgressPercent),
      whatIf: formatPercentPlain(input.whatIf.goalProgressPercent),
    });
  }
  if (
    input.current.monthlyContribution != null &&
    input.whatIf.monthlyContribution != null &&
    input.current.monthlyContribution !== input.whatIf.monthlyContribution
  ) {
    rows.push({
      id: "monthly_contribution",
      label: "Monthly contribution",
      current: formatEurPlain(input.current.monthlyContribution),
      whatIf: formatEurPlain(input.whatIf.monthlyContribution),
    });
  }
  if (
    input.current.planningAssumptionPercent != null &&
    input.whatIf.planningAssumptionPercent != null &&
    input.current.planningAssumptionPercent !==
      input.whatIf.planningAssumptionPercent
  ) {
    rows.push({
      id: "planning_assumption",
      label: "Planning assumption",
      current: `${input.current.planningAssumptionPercent}%`,
      whatIf: `${input.whatIf.planningAssumptionPercent}%`,
    });
  }
  if (
    input.includePath &&
    input.current.estimatedCompletionLabel &&
    input.whatIf.estimatedCompletionLabel
  ) {
    rows.push({
      id: "estimated_goal_path",
      label: "Estimated goal path",
      current: input.current.estimatedCompletionLabel,
      whatIf: input.whatIf.estimatedCompletionLabel,
    });
  }
  return rows;
}

function stabilizeCompletionDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  ).toISOString();
}

function pathFromGoal(input: {
  portfolioValue: number;
  goal: import("@/lib/types/portfolioStorage").GoalSettings;
  contribution: number;
  assumption: number | null;
}): WhatIfPathSnapshot {
  const progress = buildGoalProgressEngine({
    currentPortfolioValue: input.portfolioValue,
    portfolioValueAvailable: true,
    goal: {
      ...input.goal,
      monthlyContribution: input.contribution,
      expectedAnnualReturn:
        input.assumption ?? input.goal.expectedAnnualReturn,
    },
    hasSavedGoal: true,
    generatedAt: STABLE_GENERATED_AT,
  });
  const snapshot = toGoalSnapshot(progress);
  return {
    portfolioValue: roundMoney(input.portfolioValue),
    goalProgressPercent: snapshot.progressPercent,
    monthlyContribution: input.contribution,
    planningAssumptionPercent: input.assumption,
    estimatedCompletionLabel: snapshot.estimatedCompletionLabel,
    estimatedCompletionDate: stabilizeCompletionDate(
      snapshot.estimatedCompletionDate,
    ),
  };
}

/**
 * Deterministic What-if result. Does not mutate `goal` or holdings.
 */
export function buildWhatIfScenario(
  input: WhatIfScenarioInput,
): WhatIfScenarioResult {
  const accessMode = resolveWhatIfAccessMode(input.access);
  const canExplore = accessMode !== "free_preview";
  const savedContribution = readSavedMonthlyContribution(
    input.goal,
    input.hasSavedGoal,
  );
  const savedAssumption = getExpectedReturnAssumption(input.goal);
  const hasSavedContribution = savedContribution != null;
  const hasSavedPlanningAssumption = savedAssumption != null;

  const contributionOverride =
    canExplore &&
    input.contributionOverride != null &&
    Number.isFinite(input.contributionOverride) &&
    input.contributionOverride >= 0
      ? input.contributionOverride
      : null;
  const assumptionOverride =
    canExplore &&
    input.planningAssumptionOverride != null &&
    isValidExpectedAnnualReturnInput(input.planningAssumptionOverride)
      ? input.planningAssumptionOverride
      : null;

  const assumptions = [...WHAT_IF_SHARED_ASSUMPTIONS];
  const limitations = [...WHAT_IF_SHARED_LIMITATIONS];

  const base = {
    accessMode,
    explorer: canExplore ? ("full" as const) : ("preview" as const),
    persistedGoalUnchanged: true as const,
    goal: input.goal,
    hasSavedContribution,
    hasSavedPlanningAssumption,
    disclaimer: WHAT_IF_DISCLAIMER,
    assumptions,
    limitations,
  };

  if (input.selection.kind === "unsupported") {
    const note = unsupportedNote(input.selection.scenarioId);
    const educationalReason =
      input.selection.scenarioId === "rates_plus_1" ||
      input.selection.scenarioId === "rates_minus_1"
        ? FIXED_INCOME_UNAVAILABLE_REASON
        : note.reason;

    return redactForFreePreview(
      finalize({
        ...base,
        status: "educational_only",
        scenarioId: input.selection.scenarioId,
        scenarioName: note.name,
        scenarioModeled: false,
        shockPercent: null,
        current: emptyPath(),
        whatIf: emptyPath(),
        portfolioImpactAmount: null,
        portfolioImpactPercent: null,
        progressDelta: null,
        affectedPortfolioWeightPercent: null,
        currentContribution: savedContribution,
        whatIfContribution: savedContribution,
        currentPlanningAssumption: savedAssumption,
        whatIfPlanningAssumption: savedAssumption,
        comparison: [],
        headline: educationalReason,
        whatChanged: [],
        whatStayedConstant: [
          "No numeric shock is applied because the required inputs are not available.",
        ],
        calculationBullets: [educationalReason],
        confidence: "insufficient",
        scenarioResult: null,
        limitations: [...limitations, educationalReason],
      }),
    );
  }

  if (!input.portfolioValueAvailable) {
    const scenarioName =
      input.selection.kind === "modeled"
        ? getScenarioDefinition(input.selection.scenarioId).name
        : "What if";
    return redactForFreePreview(
      finalize({
        ...base,
        status: "unavailable_portfolio_value",
        scenarioId:
          input.selection.kind === "modeled" ? input.selection.scenarioId : null,
        scenarioName,
        scenarioModeled: input.selection.kind === "modeled",
        shockPercent:
          input.selection.kind === "modeled"
            ? getScenarioDefinition(input.selection.scenarioId).shockPercent
            : null,
        current: emptyPath(),
        whatIf: emptyPath(),
        portfolioImpactAmount: null,
        portfolioImpactPercent: null,
        progressDelta: null,
        affectedPortfolioWeightPercent: null,
        currentContribution: savedContribution,
        whatIfContribution: savedContribution,
        currentPlanningAssumption: savedAssumption,
        whatIfPlanningAssumption: savedAssumption,
        comparison: [],
        headline:
          "Portfolio value is unavailable, so this scenario cannot be valued.",
        whatChanged: [],
        whatStayedConstant: ["Saved goal settings are unchanged."],
        calculationBullets: [
          "Unavailable portfolio value is not treated as €0.",
        ],
        confidence: "insufficient",
        scenarioResult: null,
      }),
    );
  }

  const scenarioResult =
    input.selection.kind === "modeled"
      ? runPortfolioScenario(input.holdings, input.selection.scenarioId)
      : null;

  const resolvedCurrentValue =
    input.currentPortfolioValue != null &&
    Number.isFinite(input.currentPortfolioValue)
      ? input.currentPortfolioValue
      : (scenarioResult?.portfolioTotalValue ?? null);

  if (
    resolvedCurrentValue == null ||
    !Number.isFinite(resolvedCurrentValue) ||
    resolvedCurrentValue < 0
  ) {
    return redactForFreePreview(
      finalize({
        ...base,
        status: "unavailable_portfolio_value",
        scenarioId:
          input.selection.kind === "modeled" ? input.selection.scenarioId : null,
        scenarioName: scenarioResult?.scenarioName ?? "What if",
        scenarioModeled: Boolean(scenarioResult),
        shockPercent: scenarioResult?.shockPercent ?? null,
        current: emptyPath(),
        whatIf: emptyPath(),
        portfolioImpactAmount: null,
        portfolioImpactPercent: null,
        progressDelta: null,
        affectedPortfolioWeightPercent: null,
        currentContribution: savedContribution,
        whatIfContribution: savedContribution,
        currentPlanningAssumption: savedAssumption,
        whatIfPlanningAssumption: savedAssumption,
        comparison: [],
        headline:
          "Portfolio value is unavailable, so this scenario cannot be valued.",
        whatChanged: [],
        whatStayedConstant: ["Saved goal settings are unchanged."],
        calculationBullets: [
          "Unavailable portfolio value is not treated as €0.",
        ],
        confidence: "insufficient",
        scenarioResult,
      }),
    );
  }

  const marketImpactAmount =
    scenarioResult?.status === "ok"
      ? scenarioResult.estimatedPortfolioImpactAmount
      : null;
  const marketImpactPercent =
    scenarioResult?.status === "ok"
      ? scenarioResult.estimatedPortfolioImpactPercent
      : null;
  const stressedValue =
    marketImpactAmount != null
      ? roundMoney(Math.max(0, resolvedCurrentValue + marketImpactAmount))
      : roundMoney(resolvedCurrentValue);

  const scenarioName =
    scenarioResult?.scenarioName ??
    (input.selection.kind === "none" ? "Current path" : "What if");
  const scenarioId: ScenarioId | WhatIfUnsupportedScenarioId | null =
    input.selection.kind === "modeled" ? input.selection.scenarioId : null;
  const shockPercent = scenarioResult?.shockPercent ?? null;
  const affectedWeight =
    scenarioResult?.status === "ok"
      ? scenarioResult.affectedPortfolioWeightPercent
      : null;

  const whatIfContribution = contributionOverride ?? savedContribution;
  const whatIfAssumption = assumptionOverride ?? savedAssumption;

  let status: WhatIfScenarioResult["status"] = "modeled";
  if (scenarioResult && scenarioResult.status !== "ok") {
    status = "insufficient_data";
  }

  let currentPath = emptyPath();
  let whatIfPath = emptyPath();
  currentPath = {
    ...currentPath,
    portfolioValue: roundMoney(resolvedCurrentValue),
    monthlyContribution: savedContribution,
    planningAssumptionPercent: savedAssumption,
  };
  whatIfPath = {
    ...whatIfPath,
    portfolioValue: stressedValue,
    monthlyContribution: whatIfContribution,
    planningAssumptionPercent: whatIfAssumption,
  };

  if (!input.hasSavedGoal || !input.goal) {
    const withoutGoal: WhatIfScenarioResult = {
      ...base,
      status: marketImpactAmount != null ? "modeled" : "unavailable_no_goal",
      scenarioId,
      scenarioName,
      scenarioModeled: Boolean(scenarioResult && scenarioResult.status === "ok"),
      shockPercent,
      current: currentPath,
      whatIf: whatIfPath,
      portfolioImpactAmount: marketImpactAmount,
      portfolioImpactPercent: marketImpactPercent,
      progressDelta: null,
      affectedPortfolioWeightPercent: affectedWeight,
      currentContribution: savedContribution,
      whatIfContribution: whatIfContribution,
      currentPlanningAssumption: savedAssumption,
      whatIfPlanningAssumption: whatIfAssumption,
      comparison: buildComparison({
        current: currentPath,
        whatIf: whatIfPath,
        includePath: false,
      }),
      headline:
        marketImpactPercent != null
          ? `${scenarioName}. Estimated portfolio impact ${formatShock(marketImpactPercent)}.`
          : "Add a goal to compare goal progress under a what-if path.",
      whatChanged:
        marketImpactAmount != null
          ? [`Selected market scenario: ${scenarioName}`]
          : [],
      whatStayedConstant: [
        "No saved goal is applied, so goal progress is omitted.",
        "All other holdings stay constant in this scenario.",
      ],
      calculationBullets: buildCalculationBullets({
        scenarioName,
        shockPercent,
        affectedWeight,
        impactPercent: marketImpactPercent,
      }),
      confidence: mapConfidence(scenarioResult?.dataQuality, false),
      scenarioResult,
    };
    return redactForFreePreview(finalize(withoutGoal));
  }

  const currentGoalPath = pathFromGoal({
    portfolioValue: resolvedCurrentValue,
    goal: input.goal,
    contribution: savedContribution ?? 0,
    assumption: savedAssumption,
  });
  const whatIfGoalPath = pathFromGoal({
    portfolioValue: stressedValue,
    goal: input.goal,
    contribution: whatIfContribution ?? 0,
    assumption: whatIfAssumption,
  });

  currentPath = {
    ...currentGoalPath,
    monthlyContribution: savedContribution,
    planningAssumptionPercent: savedAssumption,
  };
  whatIfPath = {
    ...whatIfGoalPath,
    monthlyContribution: whatIfContribution,
    planningAssumptionPercent: whatIfAssumption,
  };

  const progressDelta =
    currentPath.goalProgressPercent != null &&
    whatIfPath.goalProgressPercent != null
      ? round1(
          whatIfPath.goalProgressPercent - currentPath.goalProgressPercent,
        )
      : null;

  const includePath = Boolean(
    currentPath.estimatedCompletionLabel &&
      whatIfPath.estimatedCompletionLabel,
  );

  const whatChanged: string[] = [];
  if (input.selection.kind === "modeled") {
    whatChanged.push(`Selected market scenario: ${scenarioName}`);
  }
  if (
    contributionOverride != null &&
    savedContribution != null &&
    contributionOverride !== savedContribution
  ) {
    whatChanged.push(
      `Monthly contribution explored at ${formatEurPlain(contributionOverride)} instead of the saved ${formatEurPlain(savedContribution)}.`,
    );
  }
  if (
    assumptionOverride != null &&
    savedAssumption != null &&
    assumptionOverride !== savedAssumption
  ) {
    whatChanged.push(
      `Planning assumption explored at ${assumptionOverride}% instead of the saved ${savedAssumption}%.`,
    );
  }
  if (whatChanged.length === 0) {
    whatChanged.push("No exploratory override is applied beyond the selected scenario.");
  }

  const whatStayedConstant = [
    "Saved holdings, goal, contribution, and planning assumption are not modified.",
    "All other holdings are held constant in this scenario.",
  ];
  if (contributionOverride == null) {
    whatStayedConstant.push("Saved monthly contribution stays at the current setting.");
  }
  if (assumptionOverride == null) {
    whatStayedConstant.push(
      "Saved planning assumption stays at the current user-entered value.",
    );
  }

  const headlineParts: string[] = [];
  if (marketImpactPercent != null) {
    headlineParts.push(
      `${scenarioName}. Estimated impact ${formatShock(marketImpactPercent)}.`,
    );
  } else if (input.selection.kind === "none") {
    headlineParts.push("Contribution and planning-assumption exploration only.");
  }
  if (
    currentPath.goalProgressPercent != null &&
    whatIfPath.goalProgressPercent != null
  ) {
    headlineParts.push(
      `Goal progress ${formatPercentPlain(currentPath.goalProgressPercent)} → ${formatPercentPlain(whatIfPath.goalProgressPercent)}.`,
    );
  }

  const result: WhatIfScenarioResult = {
    ...base,
    status,
    scenarioId,
    scenarioName,
    scenarioModeled: Boolean(scenarioResult && scenarioResult.status === "ok"),
    shockPercent,
    current: currentPath,
    whatIf: whatIfPath,
    portfolioImpactAmount: marketImpactAmount,
    portfolioImpactPercent: marketImpactPercent,
    progressDelta,
    affectedPortfolioWeightPercent: affectedWeight,
    currentContribution: savedContribution,
    whatIfContribution: whatIfContribution,
    currentPlanningAssumption: savedAssumption,
    whatIfPlanningAssumption: whatIfAssumption,
    comparison: buildComparison({
      current: currentPath,
      whatIf: whatIfPath,
      includePath,
    }),
    headline: headlineParts.join(" ") || scenarioName,
    whatChanged,
    whatStayedConstant,
    calculationBullets: buildCalculationBullets({
      scenarioName,
      shockPercent,
      affectedWeight,
      impactPercent: marketImpactPercent,
    }),
    confidence: mapConfidence(
      scenarioResult?.dataQuality,
      Boolean(input.hasSavedGoal),
    ),
    scenarioResult,
  };

  return redactForFreePreview(finalize(result));
}

function buildCalculationBullets(input: {
  scenarioName: string;
  shockPercent: number | null;
  affectedWeight: number | null;
  impactPercent: number | null;
}): string[] {
  const bullets: string[] = ["How Tobailey calculated this"];
  if (input.affectedWeight != null) {
    bullets.push(
      `Affected portfolio weight: ${formatPercentPlain(input.affectedWeight)}`,
    );
  }
  if (input.shockPercent != null) {
    bullets.push(`Modeled shock: ${formatShock(input.shockPercent)}`);
  }
  if (input.impactPercent != null) {
    bullets.push(
      `Estimated direct portfolio impact: ${formatShock(input.impactPercent)}`,
    );
  }
  bullets.push("All other holdings held constant in this scenario");
  return bullets;
}

function mapConfidence(
  quality: "high" | "medium" | "low" | "insufficient" | undefined,
  hasGoal: boolean,
): WhatIfScenarioResult["confidence"] {
  if (!quality) return hasGoal ? "medium" : "low";
  if (quality === "insufficient") return "insufficient";
  return quality;
}
