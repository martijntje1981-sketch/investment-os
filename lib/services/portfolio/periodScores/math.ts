/**
 * Shared helpers for dynamic period scores.
 */

import { resolveBand } from "@/lib/services/portfolio/scorecard/config";
import type { ScoreBandDefinition } from "@/lib/services/portfolio/scorecard/config";
import {
  clampScore,
  interpolateAnchors,
  roundScore,
} from "@/lib/services/portfolio/scorecard/math";
import type {
  DynamicPortfolioScore,
  DynamicPortfolioScoreId,
  DynamicScoreBand,
  DynamicScoreEvidence,
} from "@/lib/services/portfolio/periodScores/types";

export { clampScore, interpolateAnchors, roundScore };

export function bandFromValue(
  value: number,
  bands: ScoreBandDefinition[],
): DynamicScoreBand {
  const band = resolveBand(value, bands);
  return { id: band.id, label: band.label, tone: band.tone };
}

export function availableDynamicScore(input: {
  id: DynamicPortfolioScoreId;
  version: string;
  value: number;
  bands: ScoreBandDefinition[];
  summary: string;
  evidence: DynamicScoreEvidence[];
  calculatedAt: string;
  timingContext: string;
  href: string;
}): DynamicPortfolioScore {
  const value = roundScore(input.value);
  return {
    id: input.id,
    version: input.version,
    value,
    available: true,
    band: bandFromValue(value, input.bands),
    summary: input.summary,
    evidence: input.evidence,
    calculatedAt: input.calculatedAt,
    timingContext: input.timingContext,
    href: input.href,
  };
}

export function unavailableDynamicScore(input: {
  id: DynamicPortfolioScoreId;
  version: string;
  reason: string;
  calculatedAt: string;
  timingContext: string;
  href: string;
  evidence?: DynamicScoreEvidence[];
}): DynamicPortfolioScore {
  return {
    id: input.id,
    version: input.version,
    value: null,
    available: false,
    unavailableReason: input.reason,
    band: null,
    summary: input.reason,
    evidence: input.evidence ?? [
      {
        id: `${input.id}-unavailable`,
        label: "Availability",
        explanation: input.reason,
      },
    ],
    calculatedAt: input.calculatedAt,
    timingContext: input.timingContext,
    href: input.href,
  };
}
