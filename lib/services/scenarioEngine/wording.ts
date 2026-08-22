/**
 * Educational copy helpers and advisory-language guards for Scenario Engine.
 */

import type { ScenarioDefinition } from "@/lib/services/scenarioEngine/types";

export const SCENARIO_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\byou should\b/i,
  /\byou need to\b/i,
  /\bbest action\b/i,
  /\bwill lose\b/i,
  /\bwill happen\b/i,
  /\bguaranteed\b/i,
];

const SHARED_ASSUMPTIONS: string[] = [
  "Hypothetical scenario based on current portfolio composition.",
  "Estimated impact uses direct whole-instrument exposure only (no ETF look-through).",
  "Does not model correlations, second-order effects, recovery, or rebalancing.",
];

const SHARED_LIMITATIONS: string[] = [
  "Illustrative estimate — not a prediction of future returns.",
  "Unvalued holdings are excluded from the calculation.",
];

export function sleeveLabel(definition: ScenarioDefinition): string {
  switch (definition.shockKind) {
    case "equity_classified":
      return "classified equity / equity-like";
    case "bitcoin_direct":
      return "Bitcoin";
    case "crypto_classified":
      return "classified crypto";
    default: {
      const _exhaustive: never = definition.shockKind;
      return _exhaustive;
    }
  }
}

export function buildExplanation(input: {
  definition: ScenarioDefinition;
  affectedWeightPercent: number;
}): string {
  const sleeve = sleeveLabel(input.definition);
  return `Approximately ${input.affectedWeightPercent}% of your current portfolio is classified as ${sleeve} exposure. A hypothetical ${formatShock(input.definition.shockPercent)} move on that sleeve is applied as an educational estimate.`;
}

export function buildZeroExposureExplanation(
  definition: ScenarioDefinition,
): string {
  const sleeve = sleeveLabel(definition);
  return `None of your current valued portfolio is classified as ${sleeve} exposure, so the estimated direct impact of this hypothetical scenario is 0%.`;
}

export function buildCoverageNote(input: {
  definition: ScenarioDefinition;
  affectedWeightPercent: number;
  unclassifiedHoldingCount: number;
  excludedHoldingCount: number;
}): string {
  const parts: string[] = [
    `Estimated using ${input.affectedWeightPercent}% of portfolio value with ${sleeveLabel(input.definition)} exposure.`,
  ];

  if (
    input.definition.shockKind === "equity_classified" &&
    input.unclassifiedHoldingCount > 0
  ) {
    parts.push(
      `${input.unclassifiedHoldingCount} holding${input.unclassifiedHoldingCount === 1 ? "" : "s"} unclassified and not included in this equity estimate.`,
    );
  }

  if (input.excludedHoldingCount > 0) {
    parts.push(
      `${input.excludedHoldingCount} holding${input.excludedHoldingCount === 1 ? "" : "s"} without usable value excluded.`,
    );
  }

  if (input.definition.shockKind === "bitcoin_direct") {
    parts.push(
      "Bitcoin scenario is a subset of crypto exposure; it is not intended to be stacked with the Crypto −20% scenario.",
    );
  }

  return parts.join(" ");
}

export function buildAssumptions(definition: ScenarioDefinition): string[] {
  const assumptions = [...SHARED_ASSUMPTIONS];
  if (definition.shockKind === "equity_classified") {
    assumptions.push(
      "Equity ETFs classified as equity participate as a whole instrument.",
    );
  }
  if (definition.shockKind === "bitcoin_direct") {
    assumptions.push(
      "Bitcoin exposure uses crypto classification plus Bitcoin symbol/name identity.",
    );
  }
  return assumptions;
}

export function buildLimitations(definition: ScenarioDefinition): string[] {
  const limitations = [...SHARED_LIMITATIONS];
  if (definition.shockKind === "equity_classified") {
    limitations.push(
      "Unclassified investments are not treated as equity in this estimate.",
    );
  }
  if (definition.shockKind === "crypto_classified") {
    limitations.push(
      "All classified crypto is shocked equally — altcoins are not modelled separately from Bitcoin in this scenario.",
    );
  }
  return limitations;
}

export function formatShock(shockPercent: number): string {
  const rounded = Math.round(shockPercent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function assertNoAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of SCENARIO_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `Scenario Engine advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
