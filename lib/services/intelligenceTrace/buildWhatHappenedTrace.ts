import type { DailyPerformanceSnapshot } from "@/lib/client/dailyPerformance";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioPerformanceAttribution } from "@/lib/services/performanceAttribution/types";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export function buildWhatHappenedTrace(input: {
  insight: string;
  daily: DailyPerformanceSnapshot;
  attribution: PortfolioPerformanceAttribution;
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

  const layers: IntelligenceTraceLayer[] = [
    {
      id: "evidence",
      title: "Evidence",
      detail: "Today's move is traced directly to holding-level attribution from the currently priced portfolio.",
      bullets: evidenceBullets,
      presentation: "expand",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    },
  ];

  if (dominant?.contributionPp != null && attribution.totalReturnPercent != null) {
    const share =
      Math.abs(attribution.totalReturnPercent) >= 0.05
        ? Math.abs(dominant.contributionPp) /
          Math.abs(attribution.totalReturnPercent)
        : null;
    if (share != null && share >= 0.5) {
      layers.push({
        id: "meaning",
        title: "What it means",
        detail: "Most of today's portfolio move came from one exposure rather than a broad move across the portfolio.",
        presentation: "expand",
      });
    } else {
      layers.push({
        id: "meaning",
        title: "What it means",
        detail: "Today's result came from a mix of contributors rather than one isolated holding.",
        presentation: "expand",
      });
    }
  }

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
  });

  return {
    insight,
    layers,
    omittedLayerIds: ["change", "sensitivity", "goal_impact"],
  };
}
