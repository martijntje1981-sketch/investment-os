/**
 * Monthly Portfolio Score (mps-v1).
 * Answers: how strong was the verified 1M portfolio history?
 * Uses the same history series already loaded for Weekly context — no new APIs.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  MONTHLY_PORTFOLIO_SCORE_VERSION,
  MONTHLY_SCORE_BANDS,
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

export function buildMonthlyPortfolioScore(
  input: BuildMonthlyPortfolioScoreInput,
): DynamicPortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const href = input.href ?? DASHBOARD_DEEP_LINKS.portfolioPerformance;
  const version = MONTHLY_PORTFOLIO_SCORE_VERSION;
  const timingContext =
    "Monthly score uses verified 1M portfolio history; 1W is short-term context only.";

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
            "A Monthly Score needs a successful 1M portfolio return series.",
        },
      ],
    });
  }

  const monthPct = input.month.investmentReturnPercent;
  const weekPct = weekReturn(input.week);

  // Wider anchors than weekly — monthly moves are typically larger.
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

  let consistency = 68;
  if (weekPct != null) {
    const sameSign =
      (monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0);
    const nearFlat = Math.abs(monthPct) < 1 && Math.abs(weekPct) < 0.5;
    consistency = sameSign ? (nearFlat ? 70 : 86) : 44;
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

  const raw = clampScore(
    strength * 0.7 + consistency * 0.3 + volAdj - coveragePenalty,
  );

  const evidence: DynamicScoreEvidence[] = [
    {
      id: "month-return",
      label: "1M portfolio return",
      value: Number(monthPct.toFixed(2)),
      explanation: `Portfolio ${monthPct >= 0 ? "gained" : "declined"} ${Math.abs(monthPct).toFixed(1)}% over one month.`,
    },
  ];

  if (weekPct != null) {
    evidence.push({
      id: "week-return-context",
      label: "1W short-term context",
      value: Number(weekPct.toFixed(2)),
      explanation: `One-week return ${weekPct >= 0 ? "is" : "was"} ${Math.abs(weekPct).toFixed(1)}% for direction context.`,
    });
  }

  if (total > 0) {
    evidence.push({
      id: "history-coverage",
      label: "History coverage",
      value: `${covered}/${total}`,
      explanation: `1M series covered ${covered} of ${total} holdings.`,
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
  const bandLabel = preview.band?.label ?? "Mixed month";

  const summary =
    weekPct != null &&
    ((monthPct >= 0 && weekPct >= 0) || (monthPct < 0 && weekPct < 0))
      ? `${bandLabel}: monthly and weekly direction are aligned.`
      : weekPct != null
        ? `${bandLabel}: monthly and weekly direction differ.`
        : `${bandLabel}: based on verified 1M portfolio history.`;

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
