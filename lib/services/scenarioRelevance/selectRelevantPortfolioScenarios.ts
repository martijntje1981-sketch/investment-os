/**
 * Adaptive Portfolio Scenarios — relevance selection over modeled Scenario Engine outputs.
 * Pure presentation/selection; does not invent shocks or duration math.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  buildPortfolioExposureAllocation,
  classifyHoldingExposure,
  EQUITY_EXPOSURE_GROUP_ID_SET,
  isBitcoinHolding,
} from "@/lib/services/classification";
import {
  DEFERRED_SCENARIO_NOTES,
  getScenarioDefinition,
  runPortfolioScenario,
  SCENARIO_DEFINITIONS,
  type ScenarioId,
  type ScenarioResult,
} from "@/lib/services/scenarioEngine";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/** Minimum affected weight (%) to treat a modeled scenario as relevant. */
export const SCENARIO_RELEVANCE_MIN_WEIGHT_PERCENT = 1;

/** Preferred primary count on Analysis. */
export const SCENARIO_RELEVANCE_MAX_PRIMARY = 3;

export type ScenarioRelevanceAvailability = "modeled" | "unavailable";

export type RelevantModeledScenario = {
  scenarioId: ScenarioId;
  scenarioName: string;
  shortLabel: string;
  relevanceScore: number;
  affectedWeightPercent: number;
  reason: string;
  availability: "modeled";
  dataQuality: ScenarioResult["dataQuality"];
  result: ScenarioResult;
};

export type RelevantUnavailableScenario = {
  id: string;
  name: string;
  relevanceScore: number;
  affectedWeightPercent: number | null;
  reason: string;
  availability: "unavailable";
  dataQuality: "insufficient";
};

export type PortfolioScenarioExposureProfile = {
  equityWeightPercent: number;
  bitcoinWeightPercent: number;
  cryptoWeightPercent: number;
  cashWeightPercent: number;
  unclassifiedWeightPercent: number;
  totalValue: number;
};

export type RelevantPortfolioScenarios = {
  profile: PortfolioScenarioExposureProfile;
  modeled: RelevantModeledScenario[];
  unavailableRelevant: RelevantUnavailableScenario[];
  /** Default scenario for UI selection — top modeled, else first definition. */
  defaultScenarioId: ScenarioId;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildPortfolioScenarioExposureProfile(
  holdings: StoredPortfolioHolding[],
): PortfolioScenarioExposureProfile {
  let total = 0;
  let equity = 0;
  let bitcoin = 0;
  let crypto = 0;
  let cash = 0;
  let unclassified = 0;

  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding);
    if (value === null || !(value > 0)) continue;
    total += value;
    const classification = classifyHoldingExposure(holding);
    if (holding.assetType === "cash" || classification.normalizedGroupId === "cash") {
      cash += value;
      continue;
    }
    if (classification.normalizedGroupId === "crypto") {
      crypto += value;
      if (isBitcoinHolding(holding)) bitcoin += value;
      continue;
    }
    if (EQUITY_EXPOSURE_GROUP_ID_SET.has(classification.normalizedGroupId)) {
      equity += value;
      continue;
    }
    unclassified += value;
  }

  const pct = (part: number) => (total > 0 ? round1((part / total) * 100) : 0);

  return {
    equityWeightPercent: pct(equity),
    bitcoinWeightPercent: pct(bitcoin),
    cryptoWeightPercent: pct(crypto),
    cashWeightPercent: pct(cash),
    unclassifiedWeightPercent: pct(unclassified),
    totalValue: total,
  };
}

function relevanceReason(
  scenarioId: ScenarioId,
  weight: number,
  profile: PortfolioScenarioExposureProfile,
): string {
  switch (scenarioId) {
    case "bitcoin_minus_20":
      return `Bitcoin represents about ${weight}% of your portfolio.`;
    case "crypto_minus_20":
      return profile.bitcoinWeightPercent >= weight * 0.85
        ? `Crypto exposure is about ${weight}% (largely Bitcoin).`
        : `Classified crypto represents about ${weight}% of your portfolio.`;
    case "global_equities_minus_20":
      return `Classified equities represent about ${weight}% of your portfolio.`;
    default:
      return `Affects about ${weight}% of your portfolio.`;
  }
}

/**
 * Rank modeled scenarios for this portfolio and surface unavailable-but-relevant notes.
 * Gold / commodity shocks are not offered — classification cannot support them yet.
 * Rates stress is listed as unavailable (no duration) only when fixed-income exposure
 * cannot be proven; currently never auto-promoted without a reliable bond sleeve.
 */
export function selectRelevantPortfolioScenarios(
  holdings: StoredPortfolioHolding[],
): RelevantPortfolioScenarios {
  const profile = buildPortfolioScenarioExposureProfile(holdings);
  const exposure = buildPortfolioExposureAllocation(holdings);

  const modeledCandidates: RelevantModeledScenario[] = [];

  for (const definition of SCENARIO_DEFINITIONS) {
    const result = runPortfolioScenario(holdings, definition.id);
    const weight = result.affectedPortfolioWeightPercent ?? 0;
    if (weight < SCENARIO_RELEVANCE_MIN_WEIGHT_PERCENT) {
      continue;
    }
    if (result.status !== "ok" && weight < SCENARIO_RELEVANCE_MIN_WEIGHT_PERCENT) {
      continue;
    }

    // Relevance score: weight dominates; slight boost for higher data quality.
    const qualityBoost =
      result.dataQuality === "high"
        ? 3
        : result.dataQuality === "medium"
          ? 1.5
          : 0;
    const relevanceScore = round1(weight + qualityBoost);

    modeledCandidates.push({
      scenarioId: definition.id,
      scenarioName: definition.name,
      shortLabel: definition.shortLabel,
      relevanceScore,
      affectedWeightPercent: round1(weight),
      reason: relevanceReason(definition.id, round1(weight), profile),
      availability: "modeled",
      dataQuality: result.dataQuality,
      result,
    });
  }

  // Prefer distinct sleeves: when Bitcoin ≈ full crypto sleeve, keep Bitcoin first.
  modeledCandidates.sort((left, right) => {
    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }
    // Stable preference: bitcoin before crypto when tied closely.
    const order: Record<ScenarioId, number> = {
      bitcoin_minus_20: 0,
      crypto_minus_20: 1,
      global_equities_minus_20: 2,
    };
    return order[left.scenarioId] - order[right.scenarioId];
  });

  // Suppress redundant crypto when bitcoin already covers ≥95% of crypto weight
  // and bitcoin scenario is selected — still allow crypto if weight gap is material.
  let filtered = modeledCandidates;
  const bitcoin = modeledCandidates.find((row) => row.scenarioId === "bitcoin_minus_20");
  const crypto = modeledCandidates.find((row) => row.scenarioId === "crypto_minus_20");
  if (
    bitcoin &&
    crypto &&
    profile.cryptoWeightPercent > 0 &&
    profile.bitcoinWeightPercent / profile.cryptoWeightPercent >= 0.95 &&
    crypto.affectedWeightPercent - bitcoin.affectedWeightPercent < 2
  ) {
    // Keep Bitcoin; drop near-duplicate Crypto to avoid redundant slots.
    filtered = modeledCandidates.filter((row) => row.scenarioId !== "crypto_minus_20");
  }

  const modeled = filtered.slice(0, SCENARIO_RELEVANCE_MAX_PRIMARY);

  const unavailableRelevant: RelevantUnavailableScenario[] = [];

  // Rates: only when research/classification someday marks fixed income.
  // Current taxonomy has no reliable bond sleeve — do not invent relevance.
  void exposure;
  void DEFERRED_SCENARIO_NOTES;
  void getScenarioDefinition;

  const defaultScenarioId =
    modeled[0]?.scenarioId ?? SCENARIO_DEFINITIONS[0]!.id;

  return {
    profile,
    modeled,
    unavailableRelevant,
    defaultScenarioId,
  };
}

/**
 * Scenario results limited to the adaptive relevant modeled set (for Resilience).
 */
export function runRelevantPortfolioScenarios(
  holdings: StoredPortfolioHolding[],
): ScenarioResult[] {
  const selected = selectRelevantPortfolioScenarios(holdings);
  return selected.modeled.map((row) => row.result);
}
