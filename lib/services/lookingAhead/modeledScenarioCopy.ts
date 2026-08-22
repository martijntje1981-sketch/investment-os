/**
 * Modeled-if copy for Looking Ahead.
 * Maps every supported scenario — never assumes Bitcoin.
 */

import { SCENARIO_DEFINITION_BY_ID } from "@/lib/services/scenarioEngine";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export const LOOKING_AHEAD_MODELED_BADGE = "Modeled scenario · not forecast";

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const abs = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${abs}%`;
  if (rounded < 0) return `−${abs}%`;
  return "0%";
}

function shockSubject(scenarioId: ScenarioId): string {
  const definition = SCENARIO_DEFINITION_BY_ID[scenarioId];
  if (definition.shockKind === "bitcoin_direct") return "Bitcoin";
  if (definition.shockKind === "crypto_classified") return "crypto";
  return "classified equities";
}

export function formatModeledIfImpact(input: {
  scenarioId: ScenarioId;
  estimatedPortfolioImpactPercent: number;
}): string {
  const definition = SCENARIO_DEFINITION_BY_ID[input.scenarioId];
  const shock = Math.abs(definition.shockPercent);
  const impact = formatSignedPercent(input.estimatedPortfolioImpactPercent);
  return `If ${shockSubject(input.scenarioId)} fell ${shock}%, the modeled portfolio impact would be approximately ${impact}.`;
}
