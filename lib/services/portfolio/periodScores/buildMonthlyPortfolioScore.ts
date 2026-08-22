/**
 * Monthly Portfolio Score (mps-v2).
 * Answers: is the portfolio structurally improving over ~1M?
 * Uses verified 1M history plus optional resilience / concentration / goal context.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  MONTHLY_PORTFOLIO_SCORE_VERSION,
  MONTHLY_PULSE_WEIGHTS,
  MONTHLY_SCORE_BANDS,
  MONTHLY_STRUCTURE_RESILIENCE_BLEND,
} from "@/lib/services/portfolio/periodScores/config";
import {
  availableDynamicScore,
  clampScore,
  interpolateAnchors,
  unavailableDynamicScore,
} from "@/lib/services/portfolio/periodScores/math";
import type {
  DynamicPortfolioScore,
  DynamicScoreEvidence,
} from "@/lib/services/portfolio/periodScores/types";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";

export type BuildMonthlyPortfolioScoreInput = {
  month: PortfolioPerformanceHistoryApiResponse | null;
  week?: PortfolioPerformanceHistoryApiResponse | null;
  /** Optional Resilience master score (0–100) for structural weight. */
  resilienceScore?: number | null;
  /** Largest holding weight % when known. */
  largestHoldingWeightPercent?: number | null;
  goalStatus?: string | null;
  hasSavedGoal?: boolean;
  calculatedAt?: string;
  href?: string;
};

function monthAvailable(
  month: PortfolioPerformanceHistoryApiResponse | null,
): month is PortfolioPerformanceHistoryApiResponse & {
  investmentReturnPercent: number;
} {
  return Boolean(
    month &&
      month.success &&
      month.period === "1M" &&
      month.investmentReturnPercent != null &&
      Number.isFinite(month.investmentReturnPercent) &&
      month.dataAvailability !== "unavailable",
  );
}

function weekReturn(
  week: PortfolioPerformanceHistoryApiResponse | null | undefined,
): number | null {
  if (
    !week ||
    !week.success ||
    week.period !== "1W" ||
    week.investmentReturnPercent == null ||
    !Number.isFinite(week.investmentReturnPercent) ||
    week.dataAvailability === "unavailable"
  ) {
    return null;
  }
  return week.investmentReturnPercent;
}

function structureFromConcentration(weight: number | null | undefined): number | null {
  if (weight == null || !Number.isFinite(weight)) return null;
  return interpolateAnchors(weight, [
    { at: 25, score: 88 },
    { at: 40, score: 72 },
    { at: 55, score: 52 },
    { at: 70, score: 34 },
    { at: 85, score: 18 },
  ]);
}

/**
 * Monthly Pulse — structural improvement over ~1 month.
 * Weights (product heuristics): strength 45%, consistency 20%, structure 35%.
 */
export function buildMonthlyPortfolioScore(
  input: BuildMonthlyPortfolioScoreInput,
): DynamicPortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const href = input.href ?? DASHBOARD_DEEP_LINKS.resilienceSleep;
  const version = MONTHLY_PORTFOLIO_SCORE_VERSION;
  const timingContext =
    "Monthly Pulse blends verified 1M performance with structural context where available.";

  if (!monthAvailable(input.month)) {
    return unavailableDynamicScore({
      id: "monthly",
      version,
      reason: "More history needed",
      calculatedAt,
      timingContext,
      href,
      evidence: [
        {
          id: "month-history",
          label: "1M history",
          explanation:
            "A Monthly Pulse needs a successful 1M portfolio return series.",
        },
      ],
    });
  }

  const monthPct = input.month.investmentReturnPercent;
  const weekPct = weekReturn(input.week);

  const strength = interpolateAnchors(monthPct, [
    { at: -12, score: 14 },
    { at: -6, score: 28 },
    { at: -2, score: 42 },
    { at: 0, score: 52 },
    { at: 2, score: 64 },
    { at: 6, score: 78 },
    { at: 12, score: 90 },
    { at: 20, score: 96 },
  ]);

  let consistency: number | null = null;
  if (weekPct != null) {
    const sameSign =
      (monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0);
    const nearFlat = Math.abs(monthPct) < 1 && Math.abs(weekPct) < 0.5;
    consistency = sameSign ? (nearFlat ? 70 : 86) : 44;
  }

  let structure = structureFromConcentration(
    input.largestHoldingWeightPercent,
  );
  if (
    input.resilienceScore != null &&
    Number.isFinite(input.resilienceScore)
  ) {
    structure =
      structure == null
        ? clampScore(input.resilienceScore)
        : clampScore(
            input.resilienceScore * MONTHLY_STRUCTURE_RESILIENCE_BLEND.resilience +
              structure * MONTHLY_STRUCTURE_RESILIENCE_BLEND.concentration,
          );
  }

  let goalAdj = 0;
  if (input.hasSavedGoal && input.goalStatus) {
    if (
      input.goalStatus === "Slightly behind" ||
      input.goalStatus === "Behind schedule"
    ) {
      goalAdj = -6;
    } else if (
      input.goalStatus === "On track" ||
      input.goalStatus === "Ahead of schedule"
    ) {
      goalAdj = 3;
    }
  }

  let volAdj = 0;
  if (Math.abs(monthPct) >= 15) {
    volAdj -= 4;
  }
  if (weekPct != null && Math.abs(monthPct) >= 8) {
    const sameSign =
      (monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0);
    if (!sameSign) volAdj -= 5;
  }

  let coveragePenalty = 0;
  const covered = input.month.coveredHoldingCount ?? 0;
  const skipped = input.month.skippedHoldingCount ?? 0;
  const total = covered + skipped;
  if (total > 0 && skipped > 0) {
    const coverageRatio = covered / total;
    coveragePenalty = interpolateAnchors(coverageRatio, [
      { at: 0.3, score: 10 },
      { at: 0.6, score: 5 },
      { at: 0.85, score: 2 },
      { at: 1, score: 0 },
    ]);
  }

  // Renormalize when consistency/structure inputs are missing — never invent filler scores.
  let wStrength = MONTHLY_PULSE_WEIGHTS.strength;
  let wConsistency =
    consistency != null ? MONTHLY_PULSE_WEIGHTS.consistency : 0;
  let wStructure = structure != null ? MONTHLY_PULSE_WEIGHTS.structure : 0;
  const weightSum = wStrength + wConsistency + wStructure;
  if (weightSum <= 0) {
    return unavailableDynamicScore({
      id: "monthly",
      version,
      reason: "More context needed",
      calculatedAt,
      timingContext,
      href,
      evidence: [
        {
          id: "month-history",
          label: "1M history",
          explanation:
            "Monthly Pulse needs verified month return plus structural context.",
        },
      ],
    });
  }
  wStrength /= weightSum;
  wConsistency /= weightSum;
  wStructure /= weightSum;

  const raw = clampScore(
    strength * wStrength +
      (consistency ?? 0) * wConsistency +
      (structure ?? 0) * wStructure +
      volAdj +
      goalAdj -
      coveragePenalty,
  );

  const evidence: DynamicScoreEvidence[] = [
    {
      id: "month-return",
      label: "1M return",
      value: Number(monthPct.toFixed(2)),
      explanation: `Portfolio ${monthPct >= 0 ? "gained" : "declined"} ${Math.abs(monthPct).toFixed(1)}% over one month.`,
      impact: monthPct >= 0 ? "positive" : "limiting",
    },
  ];

  if (structure != null) {
    evidence.push({
      id: "structure",
      label: "Structure",
      value:
        input.resilienceScore != null
          ? Math.round(input.resilienceScore)
          : input.largestHoldingWeightPercent != null
            ? `${Math.round(input.largestHoldingWeightPercent)}%`
            : null,
      explanation:
        input.resilienceScore != null
          ? `Resilience score ${Math.round(input.resilienceScore)} informs structural weight.`
          : input.largestHoldingWeightPercent != null
            ? `Largest holding is about ${Math.round(input.largestHoldingWeightPercent)}% of the portfolio.`
            : "Structural context available for this Monthly Pulse.",
      impact:
        structure >= 60 ? "positive" : structure < 45 ? "limiting" : "neutral",
    });
  }

  if (weekPct != null) {
    const sameSign =
      (monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0);
    evidence.push({
      id: "week-return-context",
      label: "Consistency",
      value: Number(weekPct.toFixed(2)),
      explanation: `One-week return ${weekPct >= 0 ? "is" : "was"} ${Math.abs(weekPct).toFixed(1)}% for consistency.`,
      impact: sameSign ? "positive" : "limiting",
    });
  }

  if (input.hasSavedGoal && input.goalStatus) {
    evidence.push({
      id: "goal-status",
      label: "Goal",
      value: input.goalStatus,
      explanation: `Saved goal status: ${input.goalStatus}.`,
      impact: goalAdj >= 0 ? "positive" : "limiting",
    });
  }

  const preview = availableDynamicScore({
    id: "monthly",
    version,
    value: raw,
    bands: MONTHLY_SCORE_BANDS,
    summary: "",
    evidence,
    calculatedAt,
    timingContext,
    href,
  });
  const bandLabel = preview.band?.label ?? "Balanced";

  const summary =
    input.resilienceScore != null
      ? `${bandLabel}: 1M performance with Resilience ${Math.round(input.resilienceScore)} as structural context.`
      : weekPct != null &&
          ((monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0))
        ? `${bandLabel}: monthly trend and weekly direction are aligned.`
        : `${bandLabel}: based on verified 1M history and portfolio structure.`;

  return availableDynamicScore({
    id: "monthly",
    version,
    value: raw,
    bands: MONTHLY_SCORE_BANDS,
    summary,
    evidence,
    calculatedAt,
    timingContext,
    href,
  });
}
