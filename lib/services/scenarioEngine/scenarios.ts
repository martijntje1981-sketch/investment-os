/**
 * Predefined Phase 2A scenarios — only those with reliable direct exposure data.
 */

import type {
  DeferredScenarioNote,
  ScenarioDefinition,
  ScenarioId,
} from "@/lib/services/scenarioEngine/types";

export const SCENARIO_DEFINITIONS: readonly ScenarioDefinition[] = [
  {
    id: "global_equities_minus_20",
    name: "Global equities −20%",
    shortLabel: "Equities −20%",
    shockPercent: -20,
    shockKind: "equity_classified",
    description:
      "Hypothetical −20% move applied to classified equity and equity-like holdings.",
  },
  {
    id: "bitcoin_minus_20",
    name: "Bitcoin −20%",
    shortLabel: "Bitcoin −20%",
    shockPercent: -20,
    shockKind: "bitcoin_direct",
    description:
      "Hypothetical −20% move applied only to direct / Bitcoin-classified exposure.",
  },
  {
    id: "crypto_minus_20",
    name: "Crypto −20%",
    shortLabel: "Crypto −20%",
    shockPercent: -20,
    shockKind: "crypto_classified",
    description:
      "Hypothetical −20% move applied to classified crypto exposure (including Bitcoin).",
  },
] as const;

export const SCENARIO_DEFINITION_BY_ID: Record<
  ScenarioId,
  ScenarioDefinition
> = Object.fromEntries(
  SCENARIO_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<ScenarioId, ScenarioDefinition>;

/**
 * Not implemented in Phase 2A — listing / duration data is not portfolio-reliable.
 * Do not surface fabricated FX or rates impacts.
 */
export const DEFERRED_SCENARIO_NOTES: readonly DeferredScenarioNote[] = [
  {
    id: "eur_plus_10_vs_usd",
    name: "EUR +10% vs USD",
    reason:
      "Economic currency exposure cannot be determined reliably from listing currency without ETF look-through.",
  },
  {
    id: "rates_plus_1",
    name: "Interest rates +1%",
    reason:
      "No reliable duration is available, so a precise bond-price impact is not calculated.",
  },
  {
    id: "rates_minus_1",
    name: "Interest rates −1%",
    reason:
      "No reliable duration is available, so a precise bond-price impact is not calculated.",
  },
  {
    id: "credit_spreads_widen",
    name: "Credit spreads widen",
    reason:
      "Credit quality is not reliably known for current fixed-income holdings, so a spread-widening impact is not calculated.",
  },
  {
    id: "inflation_shock",
    name: "Inflation shock",
    reason:
      "Inflation-linked coverage is only identified from conservative metadata, and no inflation beta is modeled.",
  },
] as const;

export function getScenarioDefinition(
  scenarioId: ScenarioId,
): ScenarioDefinition {
  return SCENARIO_DEFINITION_BY_ID[scenarioId];
}
