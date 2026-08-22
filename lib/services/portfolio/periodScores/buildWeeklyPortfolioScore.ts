/**
 * Weekly Portfolio Score (wps-v2).
 * Answers: is short-term direction improving or weakening?
 * Uses real 1W history — never substitutes 1D returns for weekly calculations.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  WEEKLY_PORTFOLIO_SCORE_VERSION,
  WEEKLY_PULSE_WEIGHTS_RETURN_ONLY,
  WEEKLY_PULSE_WEIGHTS_WITH_BREADTH,
  WEEKLY_SCORE_BANDS,
} from "@/lib/services/portfolio/periodScores/config";
import {
  availableDynamicScore,
  clampScore,
  interpolateAnchors,
  unavailableDynamicScore,
} from "@/lib/services/portfolio/periodScores/math";
import type { DynamicPortfolioScore } from "@/lib/services/portfolio/periodScores/types";
import type { DynamicScoreEvidence } from "@/lib/services/portfolio/periodScores/types";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";

export type WeeklyHoldingBreadth = {
  measuredCount: number;
  positiveCount: number;
  topContributorSharePercent: number | null;
  topContributorSymbol: string | null;
};

export type BuildWeeklyPortfolioScoreInput = {
  week: PortfolioPerformanceHistoryApiResponse | null;
  month?: PortfolioPerformanceHistoryApiResponse | null;
  /**
   * Optional holding-level weekly breadth when a future series provides it.
   * Must not be derived from 1D movers.
   */
  weeklyBreadth?: WeeklyHoldingBreadth | null;
  benchmarkReturnPercent?: number | null;
  benchmarkLabel?: string | null;
  calculatedAt?: string;
  href?: string;
};

function weekAvailable(
  week: PortfolioPerformanceHistoryApiResponse | null,
): week is PortfolioPerformanceHistoryApiResponse & {
  investmentReturnPercent: number;
} {
  return Boolean(
    week &&
      week.success &&
      week.period === "1W" &&
      week.investmentReturnPercent != null &&
      Number.isFinite(week.investmentReturnPercent) &&
      week.dataAvailability !== "unavailable",
  );
}

function monthReturn(
  month: PortfolioPerformanceHistoryApiResponse | null | undefined,
): number | null {
  if (
    !month ||
    !month.success ||
    month.period !== "1M" ||
    month.investmentReturnPercent == null ||
    !Number.isFinite(month.investmentReturnPercent) ||
    month.dataAvailability === "unavailable"
  ) {
    return null;
  }
  return month.investmentReturnPercent;
}

export function buildWeeklyPortfolioScore(
  input: BuildWeeklyPortfolioScoreInput,
): DynamicPortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const href =
    input.href ?? DASHBOARD_DEEP_LINKS.portfolioPerformance;
  const version = WEEKLY_PORTFOLIO_SCORE_VERSION;
  const timingContext =
    "Weekly score uses verified 1W portfolio history; 1M is trend context only.";

  if (!weekAvailable(input.week)) {
    return unavailableDynamicScore({
      id: "weekly",
      version,
      reason: "More history needed",
      calculatedAt,
      timingContext,
      href,
      evidence: [
        {
          id: "week-history",
          label: "1W history",
          explanation:
            "A Weekly Score needs a successful 1W portfolio return series. 1D movers are not used as a substitute.",
        },
      ],
    });
  }

  const weekPct = input.week.investmentReturnPercent;
  const monthPct = monthReturn(input.month);

  const strength = interpolateAnchors(weekPct, [
    { at: -8, score: 12 },
    { at: -4, score: 26 },
    { at: -1.5, score: 40 },
    { at: 0, score: 52 },
    { at: 1.5, score: 66 },
    { at: 4, score: 80 },
    { at: 8, score: 92 },
    { at: 14, score: 96 },
  ]);

  let consistency = 68;
  if (monthPct != null) {
    const sameSign =
      (weekPct >= 0 && monthPct >= 0) || (weekPct < 0 && monthPct < 0);
    const nearFlat = Math.abs(weekPct) < 0.4 && Math.abs(monthPct) < 0.8;
    consistency = sameSign ? (nearFlat ? 70 : 88) : 40;
  }

  // Volatility adjustment from weekly magnitude + month disagreement.
  let volAdj = 0;
  if (Math.abs(weekPct) >= 6) {
    volAdj -= 4;
  }
  if (monthPct != null && Math.abs(weekPct) >= 4) {
    const sameSign =
      (weekPct >= 0 && monthPct >= 0) || (weekPct < 0 && monthPct < 0);
    if (!sameSign) volAdj -= 6;
  }

  let breadthScore = 62;
  let concentrationPenalty = 0;
  const breadth = input.weeklyBreadth;
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
      breadth.topContributorSharePercent >= 70
    ) {
      concentrationPenalty = interpolateAnchors(
        breadth.topContributorSharePercent,
        [
          { at: 70, score: 10 },
          { at: 85, score: 16 },
          { at: 95, score: 22 },
        ],
      );
    }
  } else if (breadth && breadth.measuredCount === 1) {
    breadthScore = 55;
    concentrationPenalty = 6;
  }

  // Coverage quality from history series.
  let coveragePenalty = 0;
  const covered = input.week.coveredHoldingCount ?? 0;
  const skipped = input.week.skippedHoldingCount ?? 0;
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

  let relativeAdj = 0;
  if (
    input.benchmarkReturnPercent != null &&
    Number.isFinite(input.benchmarkReturnPercent)
  ) {
    const gap = weekPct - input.benchmarkReturnPercent;
    relativeAdj = interpolateAnchors(gap, [
      { at: -4, score: -6 },
      { at: -1, score: -2 },
      { at: 0, score: 0 },
      { at: 1, score: 2 },
      { at: 4, score: 6 },
    ]);
  }

  const useBreadthWeight = Boolean(breadth && breadth.measuredCount >= 1);
  const raw = clampScore(
    useBreadthWeight
      ? strength * WEEKLY_PULSE_WEIGHTS_WITH_BREADTH.strength +
          consistency * WEEKLY_PULSE_WEIGHTS_WITH_BREADTH.consistency +
          breadthScore * WEEKLY_PULSE_WEIGHTS_WITH_BREADTH.breadth +
          relativeAdj +
          volAdj -
          concentrationPenalty -
          coveragePenalty
      : strength * WEEKLY_PULSE_WEIGHTS_RETURN_ONLY.strength +
          consistency * WEEKLY_PULSE_WEIGHTS_RETURN_ONLY.consistency +
          relativeAdj +
          volAdj -
          coveragePenalty,
  );

  const evidence: DynamicScoreEvidence[] = [
    {
      id: "week-return",
      label: "Trend",
      value: Number(weekPct.toFixed(2)),
      explanation: `Portfolio ${weekPct >= 0 ? "gained" : "declined"} ${Math.abs(weekPct).toFixed(1)}% over one week.`,
      impact: weekPct >= 0 ? "positive" : "limiting",
    },
  ];

  if (monthPct != null) {
    const sameSign =
      (weekPct >= 0 && monthPct >= 0) || (weekPct < 0 && monthPct < 0);
    evidence.push({
      id: "month-return",
      label: "Consistency",
      value: Number(monthPct.toFixed(2)),
      explanation: `One-month return ${monthPct >= 0 ? "is" : "was"} ${Math.abs(monthPct).toFixed(1)}% for direction context.`,
      impact: sameSign ? "positive" : "limiting",
    });
  }

  if (breadth && breadth.measuredCount > 0) {
    const positiveShare =
      (breadth.positiveCount / breadth.measuredCount) * 100;
    evidence.push({
      id: "weekly-breadth",
      label: "Breadth",
      value: `${breadth.positiveCount}/${breadth.measuredCount}`,
      explanation:
        breadth.measuredCount === 1
          ? "The weekly move is fully concentrated in one holding."
          : `${breadth.positiveCount} of ${breadth.measuredCount} holdings were positive over the week.`,
      impact:
        positiveShare >= 55
          ? "positive"
          : positiveShare <= 45
            ? "limiting"
            : "neutral",
    });
    if (breadth.topContributorSharePercent != null) {
      evidence.push({
        id: "weekly-concentration",
        label: "Concentration",
        value: Number(breadth.topContributorSharePercent.toFixed(1)),
        explanation: breadth.topContributorSymbol
          ? `${breadth.topContributorSymbol} contributed about ${breadth.topContributorSharePercent.toFixed(0)}% of absolute weekly moves.`
          : `Top holding contributed about ${breadth.topContributorSharePercent.toFixed(0)}% of absolute weekly moves.`,
        impact:
          breadth.topContributorSharePercent >= 70 ? "limiting" : "neutral",
      });
    }
  } else {
    evidence.push({
      id: "weekly-breadth",
      label: "Breadth",
      explanation:
        "Holding-level weekly breadth is not available yet; this score uses portfolio return and 1M consistency.",
      impact: "neutral",
    });
  }

  if (total > 0) {
    evidence.push({
      id: "history-coverage",
      label: "History coverage",
      value: `${covered}/${total}`,
      explanation: `1W series covered ${covered} of ${total} holdings.`,
    });
  }

  const preview = availableDynamicScore({
    id: "weekly",
    version,
    value: raw,
    bands: WEEKLY_SCORE_BANDS,
    summary: "",
    evidence,
    calculatedAt,
    timingContext,
    href,
  });
  const bandLabel = preview.band?.label ?? "Mixed week";

  const concentrated =
    breadth &&
    ((breadth.measuredCount === 1) ||
      (breadth.topContributorSharePercent != null &&
        breadth.topContributorSharePercent >= 70));

  const summary = concentrated
    ? `${bandLabel}: the recent week is concentrated in few holdings.`
    : monthPct != null &&
        ((weekPct >= 0 && monthPct >= 0) || (weekPct < 0 && monthPct < 0))
      ? `${bandLabel}: weekly and monthly direction are aligned.`
      : monthPct != null
        ? `${bandLabel}: weekly and monthly direction differ.`
        : `${bandLabel}: based on verified 1W portfolio history.`;

  return availableDynamicScore({
    id: "weekly",
    version,
    value: raw,
    bands: WEEKLY_SCORE_BANDS,
    summary,
    evidence,
    calculatedAt,
    timingContext,
    href,
  });
}
