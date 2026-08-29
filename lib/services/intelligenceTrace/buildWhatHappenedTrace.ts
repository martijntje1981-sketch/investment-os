import type { DailyPerformanceSnapshot } from "@/lib/client/dailyPerformance";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioPerformanceAttribution } from "@/lib/services/performanceAttribution/types";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

function formatContributionPp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)} pp`;
}

function buildWhatHappenedMeaning(input: {
  dailyPercent: number;
  dominant: PortfolioPerformanceAttribution["contributors"][number] | null;
  positiveCount: number;
  negativeCount: number;
  includedCount: number;
  totalReturnPercent: number | null;
}): IntelligenceTraceLayer | null {
  const { dailyPercent, dominant, positiveCount, negativeCount, includedCount } =
    input;
  const name = dominant?.name || dominant?.symbol || null;
  const contribution = dominant?.contributionPp ?? null;
  const share =
    contribution != null &&
    input.totalReturnPercent != null &&
    Math.abs(input.totalReturnPercent) >= 0.05
      ? Math.abs(contribution) / Math.abs(input.totalReturnPercent)
      : null;
  const concentrated = share != null && share >= 0.5;
  const holdingsLabel =
    includedCount > 0
      ? `${includedCount} holding${includedCount === 1 ? "" : "s"}`
      : "your holdings";

  if (Math.abs(dailyPercent) < 0.15 && positiveCount > 0 && negativeCount > 0) {
    const gainer = name && (contribution ?? 0) > 0 ? name : null;
    return {
      id: "meaning",
      title: "What it means",
      detail: gainer
        ? `Your portfolio barely moved, but this was not a quiet day: gains in ${gainer} offset losses elsewhere.`
        : `Your portfolio barely moved, but this was not a quiet day: gains and losses across ${holdingsLabel} largely offset each other.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      emphasis: "high",
    };
  }

  if (
    concentrated &&
    name &&
    contribution != null &&
    negativeCount >= 2 &&
    dailyPercent <= 0 &&
    contribution > 0
  ) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `${name} added ${formatContributionPp(contribution)}, but ${negativeCount} of ${holdingsLabel} fell. The portfolio’s small overall ${formatSignedPercent(dailyPercent)} therefore masks broader weakness beneath the headline number.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      emphasis: "high",
    };
  }

  if (concentrated && name && contribution != null) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `The move is concentrated rather than broad: ${name} contributed ${formatContributionPp(contribution)}, so today’s ${formatSignedPercent(dailyPercent)} is being driven by one exposure rather than the overall book.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      emphasis: "high",
    };
  }

  if (positiveCount > 0 && negativeCount > 0) {
    return {
      id: "meaning",
      title: "What it means",
      detail: `Today’s ${formatSignedPercent(dailyPercent)} came from a mixed book — ${positiveCount} holding${positiveCount === 1 ? "" : "s"} up and ${negativeCount} down — rather than one isolated exposure.`,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      emphasis: "high",
    };
  }

  if (share != null && share < 0.5) {
    return {
      id: "meaning",
      title: "What it means",
      detail: "Today's result came from a mix of contributors rather than one isolated holding.",
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      emphasis: "high",
    };
  }

  return null;
}

export function buildWhatHappenedTrace(input: {
  insight: string;
  daily: DailyPerformanceSnapshot;
  attribution: PortfolioPerformanceAttribution;
  relevantContext?: IntelligenceTraceLayer | null;
}): IntelligenceTrace | null {
  const { daily, attribution, insight } = input;
  if (!daily.hasDailyData || attribution.status !== "supported") return null;

  const topPos = attribution.contributors[0] ?? null;
  const topNeg = attribution.detractors[0] ?? null;
  const dominant =
    topNeg &&
    topPos &&
    Math.abs(topNeg.contributionPp ?? 0) >= Math.abs(topPos.contributionPp ?? 0)
      ? topNeg
      : topNeg && !topPos
        ? topNeg
        : topPos;

  const positiveCount = attribution.holdings.filter(
    (row) => (row.contributionPp ?? 0) > 0,
  ).length;
  const negativeCount = attribution.holdings.filter(
    (row) => (row.contributionPp ?? 0) < 0,
  ).length;
  const includedCount = attribution.holdings.filter((row) => row.included).length;

  const evidenceBullets = [
    `Portfolio move: ${formatSignedPercent(daily.todayPercent)}`,
  ];
  if (dominant?.name || dominant?.symbol) {
    const dominantWeight =
      dominant.endingWeightPercent ?? dominant.startingWeightPercent;
    evidenceBullets.push(
      `${dominant.name || dominant.symbol} contribution: ${dominant.contributionPp != null ? `${dominant.contributionPp > 0 ? "+" : ""}${dominant.contributionPp.toFixed(1)} pp` : "unavailable"}`,
    );
    if (dominantWeight != null) {
      evidenceBullets.push(
        `${dominant.name || dominant.symbol} portfolio weight: ${dominantWeight.toFixed(1)}%`,
      );
    }
    if (dominant.returnPercent != null) {
      evidenceBullets.push(
        `${dominant.name || dominant.symbol} price move: ${formatSignedPercent(dominant.returnPercent)}`,
      );
    }
  }
  evidenceBullets.push(
    `Breadth: ${positiveCount} positive contributor${positiveCount === 1 ? "" : "s"}, ${negativeCount} negative contributor${negativeCount === 1 ? "" : "s"}`,
  );

  const meaning = buildWhatHappenedMeaning({
    dailyPercent: daily.todayPercent,
    dominant,
    positiveCount,
    negativeCount,
    includedCount,
    totalReturnPercent: attribution.totalReturnPercent,
  });

  const layers: IntelligenceTraceLayer[] = [];
  if (meaning) layers.push(meaning);
  if (input.relevantContext) layers.push(input.relevantContext);

  layers.push({
    id: "evidence",
    title: "Evidence",
    detail: "Today's move is traced directly to holding-level attribution from the currently priced portfolio.",
    bullets: evidenceBullets,
    presentation: "expand",
    href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    emphasis: "supporting",
  });

  layers.push({
    id: "calculation",
    title: "How Tobailey calculated this",
    detail: "Holding contribution uses the current holding move against the prior portfolio value base.",
    bullets: [
      "contribution (pp) ≈ holding move ÷ prior portfolio value × 100",
      "Portfolio move is the aggregate of currently priced holding moves",
      "Holding-level attribution uses current quantities held constant",
    ],
    presentation: "explore",
    href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    emphasis: "supporting",
  });

  const confidenceBullets: string[] = [];
  if (attribution.dataQuality.coveragePercent != null) {
    confidenceBullets.push(
      `Attribution coverage: ${Math.round(attribution.dataQuality.coveragePercent)}% of portfolio value`,
    );
  }
  if (attribution.dataQuality.excludedHoldingCount > 0) {
    confidenceBullets.push(
      `${attribution.dataQuality.excludedHoldingCount} holding${attribution.dataQuality.excludedHoldingCount === 1 ? "" : "s"} excluded from attribution`,
    );
  }
  confidenceBullets.push(...attribution.dataQuality.warnings.slice(0, 2));

  layers.push({
    id: "confidence",
    title: "Data confidence",
    detail:
      confidenceBullets[0] ??
      "Attribution is based on currently priced holdings only.",
    bullets: confidenceBullets.length > 1 ? confidenceBullets.slice(1) : undefined,
    presentation: "explore",
    emphasis: "low",
  });

  return {
    insight,
    layers,
    omittedLayerIds: ["change", "sensitivity", "goal_impact"],
  };
}
