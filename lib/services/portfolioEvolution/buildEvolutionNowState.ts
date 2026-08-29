/**
 * Current (NOW) evolution state from live holdings. Not historical.
 */

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { isBitcoinHolding } from "@/lib/services/classification";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification/buildPortfolioExposureAllocation";
import { EXPOSURE_GROUP_LABELS } from "@/lib/services/classification/types";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calendarDateUtc(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}

export function buildEvolutionNowState(input: {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  asOfDate?: string;
  goalProgressPercent?: number | null;
}): EvolutionNowState {
  const asOfDate = input.asOfDate ?? calendarDateUtc();
  const analysis = buildPortfolioAnalysis(input.holdings);
  const exposure = buildPortfolioExposureAllocation(input.holdings);
  const resilience =
    input.holdings.length > 0
      ? buildResilienceProfile({
          holdings: input.holdings,
          goal: input.goal,
          hasSavedGoal: input.hasSavedGoal,
        })
      : null;
  const largest = analysis.largestPosition;
  const bitcoinDependent = Boolean(
    largest &&
      isBitcoinHolding(largest.holding) &&
      largest.weightPercent >= 20,
  );

  return {
    asOfDate,
    portfolioValue: analysis.totalValue > 0 ? analysis.totalValue : null,
    portfolioValueAvailable: analysis.valuedPositions.length > 0,
    exposure: exposure.groups
      .filter((group) => group.rawPercent > 0)
      .map((group) => ({
        groupId: group.groupId,
        displayLabel: EXPOSURE_GROUP_LABELS[group.groupId],
        weightPercent: round1(group.rawPercent),
      })),
    largestHoldingSymbol: largest?.holding.symbol ?? null,
    largestHoldingName: largest?.holding.name ?? null,
    largestHoldingWeightPercent:
      largest != null ? round1(largest.weightPercent) : null,
    bitcoinDependent,
    scenarioId: resilience?.mostSensitive?.scenarioId ?? null,
    scenarioName: resilience?.mostSensitive?.scenarioName ?? null,
    scenarioImpactPercent:
      resilience?.mostSensitive?.estimatedPortfolioImpactPercent ?? null,
    resilienceScore: resilience?.score ?? null,
    goalProgressPercent: input.goalProgressPercent ?? null,
  };
}
