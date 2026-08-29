/**
 * Deterministic attribution conclusions — max 3 by default.
 * No AI. No advisory language.
 */

import {
  ATTR_BROAD_MIN_HOLDINGS,
  ATTR_BROAD_MIN_RATIO,
  ATTR_COVERAGE_WARN_PERCENT,
  ATTR_DOMINANT_SHARE,
  ATTR_PRIMARY_DRIVER_MIN_PP,
  ATTR_QUIET_RETURN_ABS_PERCENT,
  formatContributionPp,
} from "@/lib/services/performanceAttribution/materiality";
import type {
  AttributionConclusion,
  AttributionPeriodId,
  HoldingAttributionRow,
  PortfolioPerformanceAttribution,
} from "@/lib/services/performanceAttribution/types";

function periodPhrase(period: AttributionPeriodId): string {
  switch (period) {
    case "1D":
      return "today’s";
    case "1W":
      return "this week’s";
    case "1M":
      return "this month’s";
    case "3M":
      return "this period’s";
    case "12M":
      return "the past year’s";
  }
}

function absPp(row: HoldingAttributionRow): number {
  return row.contributionPp != null && Number.isFinite(row.contributionPp)
    ? Math.abs(row.contributionPp)
    : 0;
}

function materialRows(holdings: HoldingAttributionRow[]): HoldingAttributionRow[] {
  return holdings.filter(
    (row) => row.included && absPp(row) >= ATTR_PRIMARY_DRIVER_MIN_PP,
  );
}

export function buildAttributionConclusions(input: {
  period: AttributionPeriodId;
  totalReturnPercent: number | null;
  holdings: HoldingAttributionRow[];
  coveragePercent: number | null;
  quantitiesHeldConstant: boolean;
  maxConclusions?: number;
}): AttributionConclusion[] {
  const max = input.maxConclusions ?? 3;
  const conclusions: AttributionConclusion[] = [];
  const phrase = periodPhrase(input.period);
  const included = input.holdings.filter((row) => row.included);
  const material = materialRows(included);

  if (
    input.coveragePercent != null &&
    input.coveragePercent < ATTR_COVERAGE_WARN_PERCENT
  ) {
    conclusions.push({
      id: "incomplete-coverage",
      kind: "incomplete_coverage",
      text: `Performance attribution covers ${Math.round(input.coveragePercent)}% of your portfolio.`,
    });
  }

  if (
    input.totalReturnPercent != null &&
    Math.abs(input.totalReturnPercent) < ATTR_QUIET_RETURN_ABS_PERCENT &&
    material.length === 0
  ) {
    conclusions.push({
      id: "quiet",
      kind: "quiet",
      text: `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} portfolio move was quiet across holdings.`,
    });
  }

  const totalAbs = material.reduce((sum, row) => sum + absPp(row), 0);
  if (totalAbs > 0 && material.length > 0) {
    const top = [...material].sort((a, b) => absPp(b) - absPp(a))[0]!;
    const share = absPp(top) / totalAbs;
    const pp = top.contributionPp!;

    if (share >= ATTR_DOMINANT_SHARE) {
      if (pp > 0) {
        conclusions.push({
          id: "dominant-contributor",
          kind: "dominant_contributor",
          text: `${top.name} drove most of ${phrase} gain (${formatContributionPp(pp)}).`,
        });
      } else {
        conclusions.push({
          id: "dominant-detractor",
          kind: "dominant_detractor",
          text: `Most of ${phrase} decline came from ${top.name} (${formatContributionPp(pp)}).`,
        });
      }
      conclusions.push({
        id: "concentrated",
        kind: "concentrated",
        text: `${Math.round(share * 100)}% of ${phrase} material movement came from ${top.name}.`,
      });
    } else {
      const positive = material.filter((row) => (row.contributionPp ?? 0) > 0);
      const negative = material.filter((row) => (row.contributionPp ?? 0) < 0);
      const sameSign =
        input.totalReturnPercent != null && input.totalReturnPercent >= 0
          ? positive
          : negative;
      const ratio =
        included.length > 0 ? sameSign.length / included.length : 0;

      if (
        sameSign.length >= ATTR_BROAD_MIN_HOLDINGS &&
        ratio >= ATTR_BROAD_MIN_RATIO
      ) {
        conclusions.push({
          id: "broad",
          kind:
            (input.totalReturnPercent ?? 0) >= 0
              ? "broad_positive"
              : "broad_negative",
          text: `Performance was broad: ${sameSign.length} of ${included.length} holdings contributed ${
            (input.totalReturnPercent ?? 0) >= 0 ? "positively" : "negatively"
          }.`,
        });
      } else if (top.contributionPp != null) {
        conclusions.push({
          id: top.contributionPp >= 0 ? "top-contributor" : "top-detractor",
          kind:
            top.contributionPp >= 0
              ? "dominant_contributor"
              : "dominant_detractor",
          text: `${top.name} was the largest ${
            top.contributionPp >= 0 ? "contributor" : "detractor"
          } (${formatContributionPp(top.contributionPp)}).`,
        });
      }
    }

    const byWeight = [...included]
      .filter((row) => row.startingWeightPercent != null)
      .sort(
        (a, b) =>
          (b.startingWeightPercent ?? 0) - (a.startingWeightPercent ?? 0),
      );
    const largest = byWeight[0];
    if (
      largest &&
      top.symbol !== largest.symbol &&
      (largest.startingWeightPercent ?? 0) >= 20 &&
      absPp(top) >= ATTR_PRIMARY_DRIVER_MIN_PP
    ) {
      conclusions.push({
        id: "largest-not-top",
        kind: "largest_not_top",
        text: `Your largest holding (${largest.symbol}) was not your largest contributor.`,
      });
    }
  }

  if (input.quantitiesHeldConstant && input.period !== "1D") {
    // Prefer coverage/driver conclusions; only add flow note if room remains.
    if (conclusions.length < max) {
      conclusions.push({
        id: "cash-flow-limitation",
        kind: "cash_flow_limitation",
        text: "Figures reflect price moves on current holdings — deposits, withdrawals, and trades are not adjusted.",
      });
    }
  }

  // Deduplicate by kind priority, keep max.
  const seen = new Set<string>();
  const unique: AttributionConclusion[] = [];
  for (const row of conclusions) {
    if (seen.has(row.kind) && row.kind !== "incomplete_coverage") continue;
    // Allow only one concentration-style conclusion.
    if (
      row.kind === "concentrated" &&
      unique.some(
        (item) =>
          item.kind === "dominant_contributor" ||
          item.kind === "dominant_detractor",
      )
    ) {
      // Keep dominant; skip duplicate concentration if we already have dominant.
      continue;
    }
    seen.add(row.kind);
    unique.push(row);
    if (unique.length >= max) break;
  }

  return unique.slice(0, max);
}

/** Compact enrichment lines for Pulse detail (not score formulas). */
export function buildPulseAttributionEnrichment(
  attribution: PortfolioPerformanceAttribution | null | undefined,
): string[] {
  if (!attribution || attribution.status === "unavailable") return [];
  return attribution.conclusions.slice(0, 2).map((row) => row.text);
}
