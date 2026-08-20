/**
 * Map a stored intelligence snapshot onto EvolutionNowState.
 * Uses captured payload only — never backfills from current holdings.
 */

import { EXPOSURE_GROUP_LABELS } from "@/lib/services/classification/types";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function looksLikeBitcoin(symbol: string | null, name: string | null): boolean {
  const text = `${symbol ?? ""} ${name ?? ""}`.toUpperCase();
  return /\bBTC\b/.test(text) || text.includes("BITCOIN");
}

export function snapshotToEvolutionState(
  snapshot: IntelligenceStateSnapshot,
): EvolutionNowState {
  const payload = snapshot.payload;
  const largestSymbol = payload.concentration.largestHoldingSymbol;
  const largestName = payload.concentration.largestHoldingName;
  const largestWeight = payload.concentration.largestHoldingWeightPercent;
  const sensitive = payload.resilience?.mostSensitive ?? null;

  return {
    asOfDate: snapshot.periodEnd,
    portfolioValue: payload.portfolio.totalValue,
    portfolioValueAvailable: payload.portfolio.coverage.portfolioValueAvailable,
    exposure: payload.exposure.groups.map((group) => ({
      groupId: group.groupId,
      displayLabel: group.displayLabel || EXPOSURE_GROUP_LABELS[group.groupId],
      weightPercent: round1(group.weightPercent),
    })),
    largestHoldingSymbol: largestSymbol,
    largestHoldingName: largestName,
    largestHoldingWeightPercent:
      largestWeight != null ? round1(largestWeight) : null,
    bitcoinDependent: Boolean(
      looksLikeBitcoin(largestSymbol, largestName) &&
        largestWeight != null &&
        largestWeight >= 20,
    ),
    scenarioId: sensitive?.scenarioId ?? null,
    scenarioName: sensitive?.scenarioName ?? null,
    scenarioImpactPercent: sensitive?.estimatedPortfolioImpactPercent ?? null,
    resilienceScore: payload.resilience?.score ?? null,
    goalProgressPercent: payload.goal?.progressPercent ?? null,
  };
}
