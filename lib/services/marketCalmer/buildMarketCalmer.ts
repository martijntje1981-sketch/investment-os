/**
 * Phase 2D — build Market Calmer result from Personal Intelligence + Phase 2A–2C.
 */

import {
  classifyHoldingExposure,
  EQUITY_EXPOSURE_GROUP_ID_SET,
  isBitcoinHolding,
} from "@/lib/services/classification";
import {
  ATTRIBUTION_MATERIAL_MIN_PP,
  dominantMaterialDriverShare,
} from "@/lib/services/personalIntelligence/attribution";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence/types";
import {
  formatSignedPercent,
  resolveMarketCalmerActivation,
  resolveMarketCalmerDirection,
} from "@/lib/services/marketCalmer/activation";
import {
  MARKET_CALMER_ASSUMPTIONS,
  MARKET_CALMER_LIMITATIONS,
} from "@/lib/services/marketCalmer/config";
import type {
  MarketCalmerMainDriver,
  MarketCalmerResult,
  MarketCalmerScenarioContext,
} from "@/lib/services/marketCalmer/types";
import { assertNoAdvisoryLanguage } from "@/lib/services/marketCalmer/wording";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { ScenarioId, ScenarioResult } from "@/lib/services/scenarioEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/** Similarity band: within 20% relative of scenario |impact|, or 0.4pp absolute. */
const SIMILAR_RELATIVE = 0.2;
const SIMILAR_ABSOLUTE = 0.4;

function inactiveResult(notes: string[]): MarketCalmerResult {
  const result: MarketCalmerResult = {
    version: "market-calmer-v1",
    activation: "inactive",
    direction: "flat",
    portfolioMovePercent: null,
    headline: null,
    supportingFacts: [],
    mainDriver: null,
    scenarioContext: null,
    resilienceContext: null,
    goalContext: null,
    dataNotes: notes,
    assumptions: [...MARKET_CALMER_ASSUMPTIONS],
    limitations: [...MARKET_CALMER_LIMITATIONS],
  };
  assertNoAdvisoryLanguage([
    ...result.dataNotes,
    ...result.assumptions,
    ...result.limitations,
  ]);
  return result;
}

function selectMainDriver(
  intelligence: PersonalIntelligenceToday,
): MarketCalmerMainDriver {
  const ranked = [
    ...intelligence.topContributors,
    ...intelligence.topDetractors,
  ];
  const dominant = dominantMaterialDriverShare(ranked);
  if (
    dominant &&
    Math.abs(dominant.contributionPp) >= ATTRIBUTION_MATERIAL_MIN_PP
  ) {
    return {
      symbol: dominant.symbol,
      name: dominant.name,
      contributionPp: dominant.contributionPp,
      summary: `${dominant.name} accounts for most of today’s material portfolio movement.`,
    };
  }

  const fallback = ranked
    .filter((row) => row.contributionPp !== null)
    .sort(
      (left, right) =>
        Math.abs(right.contributionPp ?? 0) - Math.abs(left.contributionPp ?? 0),
    )[0];

  if (!fallback) return null;

  return {
    symbol: fallback.symbol,
    name: fallback.name,
    contributionPp: fallback.contributionPp,
    summary: `${fallback.name} is the largest attributed driver among today’s contributors.`,
  };
}

function matchScenarioIdForDriver(
  holdings: StoredPortfolioHolding[],
  symbol: string | null,
): ScenarioId | null {
  if (!symbol) return null;
  const holding = holdings.find(
    (row) => row.symbol.trim().toUpperCase() === symbol.trim().toUpperCase(),
  );
  if (!holding) return null;

  const classification = classifyHoldingExposure(holding);
  if (
    classification.normalizedGroupId === "crypto" &&
    isBitcoinHolding(holding)
  ) {
    return "bitcoin_minus_20";
  }
  if (classification.normalizedGroupId === "crypto") {
    return "crypto_minus_20";
  }
  if (EQUITY_EXPOSURE_GROUP_ID_SET.has(classification.normalizedGroupId)) {
    return "global_equities_minus_20";
  }
  return null;
}

function pickScenarioForComparison(input: {
  scenarioResults: ScenarioResult[];
  preferredId: ScenarioId | null;
  mostSensitiveId: ScenarioId | null;
}): ScenarioResult | null {
  const usable = input.scenarioResults.filter(
    (row) =>
      row.status === "ok" &&
      row.estimatedPortfolioImpactPercent !== null &&
      Number.isFinite(row.estimatedPortfolioImpactPercent),
  );
  if (usable.length === 0) return null;

  if (input.preferredId) {
    const preferred = usable.find((row) => row.scenarioId === input.preferredId);
    if (preferred) return preferred;
  }
  if (input.mostSensitiveId) {
    const sensitive = usable.find(
      (row) => row.scenarioId === input.mostSensitiveId,
    );
    if (sensitive) return sensitive;
  }

  return usable.reduce((best, row) =>
    Math.abs(row.estimatedPortfolioImpactPercent ?? 0) >
    Math.abs(best.estimatedPortfolioImpactPercent ?? 0)
      ? row
      : best,
  );
}

function buildScenarioContext(input: {
  todayPercent: number;
  scenario: ScenarioResult;
}): MarketCalmerScenarioContext {
  const scenarioImpact = input.scenario.estimatedPortfolioImpactPercent!;
  const portfolioMoveAbsPercent = Math.abs(input.todayPercent);
  const scenarioAbs = Math.abs(scenarioImpact);

  let comparison: MarketCalmerScenarioContext extends null
    ? never
    : NonNullable<MarketCalmerScenarioContext>["comparison"];

  if (
    Math.abs(portfolioMoveAbsPercent - scenarioAbs) <= SIMILAR_ABSOLUTE ||
    (scenarioAbs > 0 &&
      Math.abs(portfolioMoveAbsPercent - scenarioAbs) / scenarioAbs <=
        SIMILAR_RELATIVE)
  ) {
    comparison = "similar_to_scenario";
  } else if (portfolioMoveAbsPercent < scenarioAbs) {
    comparison = "smaller_than_scenario";
  } else {
    comparison = "larger_than_scenario";
  }

  const summary =
    comparison === "smaller_than_scenario"
      ? `Today’s move (${formatSignedPercent(input.todayPercent)}) is smaller than the estimated impact of the ${input.scenario.scenarioName} stress scenario (${formatSignedPercent(scenarioImpact)}).`
      : comparison === "larger_than_scenario"
        ? `Today’s move (${formatSignedPercent(input.todayPercent)}) is larger than the estimated impact of the ${input.scenario.scenarioName} stress scenario (${formatSignedPercent(scenarioImpact)}).`
        : `Today’s move (${formatSignedPercent(input.todayPercent)}) is similar in size to the estimated impact of the ${input.scenario.scenarioName} stress scenario (${formatSignedPercent(scenarioImpact)}).`;

  return {
    scenarioId: input.scenario.scenarioId,
    scenarioName: input.scenario.scenarioName,
    scenarioImpactPercent: scenarioImpact,
    portfolioMoveAbsPercent,
    comparison,
    summary: `${summary} This is a size comparison only — not a claim that today’s move was caused by that scenario.`,
  };
}

function buildHeadline(input: {
  activation: "notable" | "high_stress";
  direction: "positive" | "negative" | "flat";
  todayPercent: number;
}): string {
  const move = formatSignedPercent(input.todayPercent);
  if (input.direction === "positive") {
    return input.activation === "high_stress"
      ? `Your portfolio is moving strongly today (${move}).`
      : `Your portfolio moved ${move} today — a larger-than-usual positive move.`;
  }
  if (input.direction === "negative") {
    return input.activation === "high_stress"
      ? `Today is a larger-than-usual move for your portfolio (${move}).`
      : `Your portfolio moved ${move} today — a notable move worth putting in context.`;
  }
  return `Your portfolio moved ${move} today.`;
}

/**
 * Build Market Calmer context for the Dashboard Personal Intelligence surface.
 */
export function buildMarketCalmer(input: {
  intelligence: PersonalIntelligenceToday;
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}): MarketCalmerResult {
  const move = input.intelligence.portfolioMove;
  const activation = resolveMarketCalmerActivation(
    move?.todayPercent,
    Boolean(move?.hasDailyData),
  );

  if (activation === "inactive" || !move) {
    const notes: string[] = [];
    if (!move?.hasDailyData) {
      notes.push("Market Calmer stays inactive without usable daily performance.");
    } else {
      notes.push(
        "Market Calmer stays inactive when the absolute portfolio day move is below the notable threshold.",
      );
    }
    return inactiveResult(notes);
  }

  const todayPercent = move.todayPercent;
  const direction = resolveMarketCalmerDirection(todayPercent);
  const mainDriver = selectMainDriver(input.intelligence);
  const resilience = buildResilienceProfile({
    holdings: input.holdings,
    goal: input.goal ?? null,
    hasSavedGoal: Boolean(input.hasSavedGoal && input.goal),
  });

  const preferredScenarioId = matchScenarioIdForDriver(
    input.holdings,
    mainDriver?.symbol ?? null,
  );
  const scenario = pickScenarioForComparison({
    scenarioResults: resilience.scenarioResults,
    preferredId: preferredScenarioId,
    mostSensitiveId: resilience.mostSensitive?.scenarioId ?? null,
  });

  const scenarioContext = scenario
    ? buildScenarioContext({ todayPercent, scenario })
    : null;

  const resilienceContext =
    resilience.status === "ok"
      ? {
          mostSensitiveScenarioName:
            resilience.mostSensitive?.scenarioName ?? null,
          primaryDriverLabel:
            resilience.factors.find((factor) => factor.id === resilience.primaryDriver)
              ?.label ?? null,
          summary: resilience.mostSensitive
            ? `${resilience.mostSensitive.scenarioName} is currently the largest modeled resilience sensitivity among supported scenarios.`
            : (resilience.primaryDriverExplanation ??
              "Resilience context is available from the current portfolio structure."),
        }
      : null;

  const goalContext =
    activation === "high_stress" && resilience.goalContext
      ? { summary: resilience.goalContext.summary }
      : activation === "notable" && Boolean(input.hasSavedGoal && input.goal)
        ? {
            summary:
              "One trading day does not by itself redefine your long-term goal assumptions.",
          }
        : null;

  const supportingFacts: string[] = [
    `Portfolio day move: ${formatSignedPercent(todayPercent)}.`,
  ];
  if (mainDriver) supportingFacts.push(mainDriver.summary);
  if (scenarioContext) supportingFacts.push(scenarioContext.summary);
  if (resilienceContext) supportingFacts.push(resilienceContext.summary);
  if (goalContext) supportingFacts.push(goalContext.summary);
  supportingFacts.push(
    "Review the context before drawing conclusions from one trading day.",
  );

  const dataNotes = [...input.intelligence.dataNotes];
  if (!move.coverageComplete) {
    dataNotes.push(
      "Daily performance coverage is incomplete — treat the day move as partial.",
    );
  }
  if (!scenarioContext) {
    dataNotes.push(
      "No reliable Phase 2A scenario comparison was available for today’s move.",
    );
  }

  const result: MarketCalmerResult = {
    version: "market-calmer-v1",
    activation,
    direction,
    portfolioMovePercent: todayPercent,
    headline: buildHeadline({
      activation,
      direction,
      todayPercent,
    }),
    supportingFacts,
    mainDriver,
    scenarioContext,
    resilienceContext,
    goalContext,
    dataNotes,
    assumptions: [...MARKET_CALMER_ASSUMPTIONS],
    limitations: [...MARKET_CALMER_LIMITATIONS],
  };

  assertNoAdvisoryLanguage([
    result.headline ?? "",
    ...result.supportingFacts,
    result.mainDriver?.summary ?? "",
    result.scenarioContext?.summary ?? "",
    result.resilienceContext?.summary ?? "",
    result.goalContext?.summary ?? "",
    ...result.dataNotes,
    ...result.assumptions,
    ...result.limitations,
  ]);

  return result;
}

/** Symbols Market Calmer already explained — for Action Plan Understand suppression. */
export function marketCalmerDriverSymbols(
  calmer: MarketCalmerResult,
): string[] {
  if (calmer.activation === "inactive" || !calmer.mainDriver) return [];
  return [calmer.mainDriver.symbol];
}
