/**
 * Momentum Score — recent breadth, consistency, and strength of portfolio movement.
 * Uses real 1W/1M portfolio returns + 1D holding breadth when available.
 * Never fabricates history or reuses 1D as 1W/1M.
 */

import {
  MOMENTUM_BANDS,
  PORTFOLIO_SCORECARD_VERSION,
} from "@/lib/services/portfolio/scorecard/config";
import {
  availableScore,
  clampScore,
  confidenceFromLevel,
  interpolateAnchors,
  unavailableScore,
} from "@/lib/services/portfolio/scorecard/math";
import type { PortfolioScore } from "@/lib/services/portfolio/scorecard/types";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

export type MomentumPeriodSnapshot = {
  period: "1W" | "1M";
  returnPercent: number | null;
  available: boolean;
  coveredHoldingCount?: number;
  skippedHoldingCount?: number;
};

export type MomentumBreadthSnapshot = {
  /** Valued non-cash holdings with a usable daily move. */
  measuredCount: number;
  positiveCount: number;
  /** Largest absolute contributor share of measured moves 0–100, when known. */
  topContributorSharePercent: number | null;
  topContributorSymbol: string | null;
};

export type BuildMomentumScoreInput = {
  week: MomentumPeriodSnapshot | null;
  month: MomentumPeriodSnapshot | null;
  breadth: MomentumBreadthSnapshot | null;
  calculatedAt?: string;
};

export function buildMomentumScore(
  input: BuildMomentumScoreInput,
): PortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const weekOk =
    input.week?.available &&
    input.week.returnPercent != null &&
    Number.isFinite(input.week.returnPercent);
  const monthOk =
    input.month?.available &&
    input.month.returnPercent != null &&
    Number.isFinite(input.month.returnPercent);

  if (!weekOk && !monthOk) {
    return unavailableScore({
      id: "momentum",
      version: `${PORTFOLIO_SCORECARD_VERSION}-momentum`,
      label: "Momentum",
      shortLabel: "Momentum",
      reason: "More history needed",
      calculatedAt,
      href: DASHBOARD_DEEP_LINKS.scorecardMomentum,
    });
  }

  const weekPct = weekOk ? input.week!.returnPercent! : null;
  const monthPct = monthOk ? input.month!.returnPercent! : null;

  // Strength from returns (soft sigmoid-like interpolation)
  const scoreFromReturn = (pct: number) =>
    interpolateAnchors(pct, [
      { at: -8, score: 12 },
      { at: -3, score: 28 },
      { at: -1, score: 42 },
      { at: 0, score: 52 },
      { at: 1, score: 62 },
      { at: 3, score: 76 },
      { at: 6, score: 88 },
      { at: 12, score: 95 },
    ]);

  let strength = 50;
  if (weekPct != null && monthPct != null) {
    strength =
      scoreFromReturn(weekPct) * 0.55 + scoreFromReturn(monthPct) * 0.45;
  } else if (weekPct != null) {
    strength = scoreFromReturn(weekPct);
  } else if (monthPct != null) {
    strength = scoreFromReturn(monthPct);
  }

  // Consistency: same sign week/month
  let consistency = 70;
  if (weekPct != null && monthPct != null) {
    const sameSign =
      (weekPct >= 0 && monthPct >= 0) || (weekPct < 0 && monthPct < 0);
    const nearFlat = Math.abs(weekPct) < 0.3 && Math.abs(monthPct) < 0.5;
    consistency = sameSign ? (nearFlat ? 72 : 88) : 42;
  }

  // Breadth from 1D movers (supporting, not a substitute for 1W/1M)
  let breadthScore = 60;
  const breadth = input.breadth;
  if (breadth && breadth.measuredCount >= 2) {
    const positiveShare = (breadth.positiveCount / breadth.measuredCount) * 100;
    breadthScore = interpolateAnchors(positiveShare, [
      { at: 10, score: 22 },
      { at: 35, score: 42 },
      { at: 50, score: 58 },
      { at: 70, score: 78 },
      { at: 90, score: 92 },
    ]);
    if (
      breadth.topContributorSharePercent != null &&
      breadth.topContributorSharePercent >= 70 &&
      breadth.measuredCount >= 3
    ) {
      breadthScore = clampScore(breadthScore - 14);
    }
  }

  // Volatility / single-driver dampener: large week move + narrow breadth
  if (
    weekPct != null &&
    Math.abs(weekPct) >= 5 &&
    breadth &&
    breadth.measuredCount >= 3 &&
    breadth.positiveCount <= 1 &&
    weekPct > 0
  ) {
    strength = clampScore(strength - 10);
  }

  const raw = clampScore(
    strength * 0.5 + consistency * 0.25 + breadthScore * 0.25,
  );

  const evidence = [];
  if (weekPct != null) {
    evidence.push({
      id: "week-return",
      label: "1W portfolio return",
      value: Number(weekPct.toFixed(2)),
      explanation: `Portfolio ${weekPct >= 0 ? "gained" : "declined"} ${Math.abs(weekPct).toFixed(1)}% over one week.`,
    });
  }
  if (monthPct != null) {
    evidence.push({
      id: "month-return",
      label: "1M portfolio return",
      value: Number(monthPct.toFixed(2)),
      explanation: `Portfolio ${monthPct >= 0 ? "gained" : "declined"} ${Math.abs(monthPct).toFixed(1)}% over one month.`,
    });
  }
  if (breadth && breadth.measuredCount > 0) {
    evidence.push({
      id: "breadth",
      label: "Holding breadth (latest session)",
      value: breadth.positiveCount,
      explanation: `${breadth.positiveCount} of ${breadth.measuredCount} valued holdings contributed positively in the latest measured session.`,
    });
    if (
      breadth.topContributorSymbol &&
      breadth.topContributorSharePercent != null &&
      breadth.topContributorSharePercent >= 50
    ) {
      evidence.push({
        id: "concentrated-move",
        label: "Move concentration",
        value: breadth.topContributorSharePercent,
        explanation: `Most of the latest move is concentrated in ${breadth.topContributorSymbol}.`,
      });
    }
  }
  if (weekPct != null && monthPct != null) {
    const mixed =
      (weekPct >= 0 && monthPct < 0) || (weekPct < 0 && monthPct >= 0);
    evidence.push({
      id: "consistency",
      label: "Weekly vs monthly",
      explanation: mixed
        ? "Weekly and monthly direction are mixed."
        : "Weekly and monthly direction broadly agree.",
    });
  }

  const limited = !weekOk || !monthOk || (breadth?.measuredCount ?? 0) < 2;

  return availableScore({
    id: "momentum",
    version: `${PORTFOLIO_SCORECARD_VERSION}-momentum`,
    value: raw,
    label: "Momentum",
    shortLabel: "Momentum",
    bands: MOMENTUM_BANDS,
    confidence: confidenceFromLevel(limited ? "moderate" : "high"),
    summary:
      MOMENTUM_BANDS.find((b) => raw >= b.min && raw <= b.max)?.label ??
      "Recent momentum",
    evidence,
    strengths:
      raw >= 70
        ? ["Recent portfolio movement is constructive on available windows"]
        : [],
    attentionPoints:
      raw < 55
        ? ["Recent momentum is mixed or weak on available windows"]
        : breadth?.topContributorSharePercent != null &&
            breadth.topContributorSharePercent >= 70
          ? ["Latest move is concentrated in one holding"]
          : [],
    calculatedAt,
    href: DASHBOARD_DEEP_LINKS.scorecardMomentum,
  });
}
