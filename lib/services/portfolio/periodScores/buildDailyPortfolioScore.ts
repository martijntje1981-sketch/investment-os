/**
 * Daily Portfolio Score (dps-v2).
 * Answers: what is happening in the portfolio right now?
 * Uses latest-session / 24h movers only — never fabricates a neutral 50.
 * Emphasizes direction, breadth, and concentration — not structural diversification.
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import {
  resolvePortfolioMovePeriod,
  MIXED_PORTFOLIO_MOVE_EXPLANATION,
} from "@/lib/client/performancePeriod";
import {
  DAILY_PORTFOLIO_SCORE_VERSION,
  DAILY_PULSE_WEIGHTS,
  DAILY_SCORE_BANDS,
} from "@/lib/services/portfolio/periodScores/config";
import {
  availableDynamicScore,
  clampScore,
  interpolateAnchors,
  unavailableDynamicScore,
} from "@/lib/services/portfolio/periodScores/math";
import type { DynamicPortfolioScore } from "@/lib/services/portfolio/periodScores/types";
import type { DynamicScoreEvidence } from "@/lib/services/portfolio/periodScores/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type BuildDailyPortfolioScoreInput = {
  holdings: StoredPortfolioHolding[];
  marketsClosed?: boolean;
  /** Optional broad-market reference return % when already available. */
  benchmarkReturnPercent?: number | null;
  benchmarkLabel?: string | null;
  /** Optional count of portfolio-relevant events today (context only). */
  relevantEventCount?: number | null;
  calculatedAt?: string;
  href?: string;
};

function timingContextFor(
  holdings: StoredPortfolioHolding[],
  marketsClosed: boolean,
): string {
  const period = resolvePortfolioMovePeriod(holdings);
  const parts = [period.accessibleDescription || period.primaryLabel];
  if (period.isMixed) {
    parts.push(MIXED_PORTFOLIO_MOVE_EXPLANATION);
  }
  if (marketsClosed) {
    parts.push("Major equity markets are closed; figures use the latest session.");
  }
  return parts.filter(Boolean).join(" ");
}

export function buildDailyPortfolioScore(
  input: BuildDailyPortfolioScoreInput,
): DynamicPortfolioScore {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const href = input.href ?? "/review";
  const marketsClosed = Boolean(input.marketsClosed);
  const timingContext = timingContextFor(input.holdings, marketsClosed);
  const version = DAILY_PORTFOLIO_SCORE_VERSION;

  const marketHoldings = input.holdings.filter((h) => h.assetType !== "cash");
  if (marketHoldings.length === 0) {
    return unavailableDynamicScore({
      id: "daily",
      version,
      reason: "Add holdings to see today’s portfolio score.",
      calculatedAt,
      timingContext,
      href,
    });
  }

  const daily = summarizeDailyPerformance(input.holdings);
  if (!daily.hasDailyData || daily.performers.length === 0) {
    return unavailableDynamicScore({
      id: "daily",
      version,
      reason: marketsClosed
        ? "Latest session prices are not available yet."
        : "Live or session prices are missing for your holdings.",
      calculatedAt,
      timingContext,
      href,
      evidence: [
        {
          id: "coverage",
          label: "Price coverage",
          value: `${daily.validPerformanceCount}/${daily.eligibleMarketHoldingCount}`,
          explanation:
            "A Daily Score needs at least one valued holding with a usable session or 24h move.",
        },
      ],
    });
  }

  const performers = daily.performers;
  const measuredCount = performers.length;
  const positiveCount = performers.filter(
    (p) => p.move > 0 || p.changePercent > 0,
  ).length;
  const positiveShare = (positiveCount / measuredCount) * 100;

  const absMoves = performers.map((p) => Math.abs(p.move));
  const totalAbs = absMoves.reduce((sum, v) => sum + v, 0);
  const top = [...performers].sort(
    (a, b) => Math.abs(b.move) - Math.abs(a.move),
  )[0]!;
  const topShare =
    totalAbs > 0 ? (Math.abs(top.move) / totalAbs) * 100 : 100;

  // Strength from portfolio % move (smooth anchors — not a cliff).
  const strength = interpolateAnchors(daily.todayPercent, [
    { at: -4, score: 14 },
    { at: -2, score: 28 },
    { at: -0.5, score: 42 },
    { at: 0, score: 52 },
    { at: 0.5, score: 62 },
    { at: 1.5, score: 76 },
    { at: 3, score: 88 },
    { at: 5, score: 95 },
  ]);

  // Breadth of positive movers.
  const breadthScore = interpolateAnchors(positiveShare, [
    { at: 0, score: 18 },
    { at: 25, score: 36 },
    { at: 50, score: 55 },
    { at: 70, score: 78 },
    { at: 90, score: 94 },
  ]);

  // Concentration dampener — do not reward a one-holding spike as “broad”.
  let concentrationPenalty = 0;
  if (measuredCount >= 2 && topShare >= 70) {
    concentrationPenalty = interpolateAnchors(topShare, [
      { at: 70, score: 8 },
      { at: 85, score: 14 },
      { at: 95, score: 20 },
    ]);
  } else if (measuredCount === 1) {
    // Still scoreable; evidence states full concentration.
    concentrationPenalty = 4;
  }

  // Partial coverage softens confidence via a small penalty, not a fake 50.
  let coveragePenalty = 0;
  if (!daily.performanceCoverageComplete && daily.eligibleMarketHoldingCount > 0) {
    const coverageRatio =
      daily.validPerformanceCount / daily.eligibleMarketHoldingCount;
    coveragePenalty = interpolateAnchors(coverageRatio, [
      { at: 0.2, score: 12 },
      { at: 0.5, score: 7 },
      { at: 0.8, score: 3 },
      { at: 1, score: 0 },
    ]);
  }

  // Optional relative vs broad reference (only when provided).
  let relativeAdj = 0;
  if (
    input.benchmarkReturnPercent != null &&
    Number.isFinite(input.benchmarkReturnPercent)
  ) {
    const gap = daily.todayPercent - input.benchmarkReturnPercent;
    relativeAdj = interpolateAnchors(gap, [
      { at: -2, score: -6 },
      { at: -0.5, score: -2 },
      { at: 0, score: 0 },
      { at: 0.5, score: 2 },
      { at: 2, score: 6 },
    ]);
  }

  const raw = clampScore(
    strength * DAILY_PULSE_WEIGHTS.strength +
      breadthScore * DAILY_PULSE_WEIGHTS.breadth +
      relativeAdj -
      concentrationPenalty -
      coveragePenalty,
  );

  const evidence: DynamicScoreEvidence[] = [
    {
      id: "daily-return",
      label: "Direction",
      value: Number(daily.todayPercent.toFixed(2)),
      explanation: `Portfolio ${daily.todayPercent >= 0 ? "moved" : "declined"} ${Math.abs(daily.todayPercent).toFixed(2)}% on the latest session / 24h mix.`,
      impact: daily.todayPercent >= 0 ? "positive" : "limiting",
    },
    {
      id: "breadth",
      label: "Breadth",
      value: `${positiveCount}/${measuredCount}`,
      explanation: `${positiveCount} of ${measuredCount} valued holdings finished positive.`,
      impact: positiveShare >= 55 ? "positive" : positiveShare <= 45 ? "limiting" : "neutral",
    },
    {
      id: "concentration",
      label: "Concentration",
      value: Number(topShare.toFixed(1)),
      explanation:
        measuredCount === 1
          ? `${top.holding.symbol} accounts for the entire measured move.`
          : `${top.holding.symbol} contributed about ${topShare.toFixed(0)}% of absolute moves.`,
      impact:
        measuredCount === 1 || topShare >= 70 ? "limiting" : "neutral",
    },
  ];

  if (!daily.performanceCoverageComplete) {
    evidence.push({
      id: "coverage",
      label: "Price coverage",
      value: `${daily.validPerformanceCount}/${daily.eligibleMarketHoldingCount}`,
      explanation: `Based on ${daily.validPerformanceCount} of ${daily.eligibleMarketHoldingCount} holdings with usable prices.`,
    });
  }

  if (
    input.benchmarkReturnPercent != null &&
    Number.isFinite(input.benchmarkReturnPercent)
  ) {
    evidence.push({
      id: "benchmark",
      label: input.benchmarkLabel?.trim() || "Market reference",
      value: Number(input.benchmarkReturnPercent.toFixed(2)),
      explanation: `Reference move ${input.benchmarkReturnPercent.toFixed(2)}% for context only.`,
    });
  }

  if (input.relevantEventCount != null && input.relevantEventCount > 0) {
    evidence.push({
      id: "events",
      label: "Portfolio-relevant events",
      value: input.relevantEventCount,
      explanation: `${input.relevantEventCount} calendar item${input.relevantEventCount === 1 ? "" : "s"} marked relevant to your holdings.`,
    });
  }

  const bandPreview = availableDynamicScore({
    id: "daily",
    version,
    value: raw,
    bands: DAILY_SCORE_BANDS,
    summary: "",
    evidence,
    calculatedAt,
    timingContext,
    href,
  });

  const bandLabel = bandPreview.band?.label ?? "Mixed session";
  const summary =
    measuredCount === 1
      ? `${bandLabel}: today’s move is fully concentrated in one holding.`
      : topShare >= 70
        ? `${bandLabel}: the move is driven mainly by ${top.holding.symbol}.`
        : positiveShare >= 70 && daily.todayPercent >= 0
          ? `${bandLabel}: today’s move is broad across holdings.`
          : positiveShare <= 35 && daily.todayPercent < 0
            ? `${bandLabel}: weakness is broad across holdings.`
            : `${bandLabel}: see evidence for breadth and concentration.`;

  return availableDynamicScore({
    id: "daily",
    version,
    value: raw,
    bands: DAILY_SCORE_BANDS,
    summary,
    evidence,
    calculatedAt,
    timingContext,
    href,
  });
}
