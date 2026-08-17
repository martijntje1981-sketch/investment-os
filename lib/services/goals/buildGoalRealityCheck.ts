/**
 * Goal Reality Check — compare saved expected annual return vs verified portfolio pace.
 * Constant-holdings EOD history only; never fabricates unsupported periods.
 */

import type { PerformanceDataAvailability } from "@/lib/client/performance/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type GoalRealityHistoryQuality = "strong" | "moderate" | "short";

export type GoalRealityComparableKind =
  | "annualized_performance"
  | "last_12_months"
  | "recent_annualized_pace";

export type GoalRealityPeriodId =
  | "ALL"
  | "1Y"
  | "6M"
  | "3M"
  | "1M"
  | "1W";

export type GoalRealityPeriodCandidate = {
  periodId: GoalRealityPeriodId;
  /** Simple period return as a decimal (e.g. 0.084 for +8.4%). */
  periodReturnDecimal: number;
  /** Verified span in years (actual duration, not calendar guess). */
  yearsRepresented: number;
  /** Human source label, e.g. "the last 6 months". */
  sourcePeriodLabel: string;
  dataAvailability: PerformanceDataAvailability;
  historicalFxApproximate: boolean;
  coveredHoldingCount: number;
  skippedHoldingCount: number;
  /** True when series is reconstructed constant-holdings (Tobailey history). */
  constantHoldingsReconstructed: boolean;
};

export type BuildGoalRealityCheckInput = {
  expectedAnnualReturnPercent: number | null;
  candidates: GoalRealityPeriodCandidate[];
};

export type GoalRealityCheck = {
  available: true;
  expectedAnnualReturnPercent: number;
  comparableAnnualPercent: number;
  comparableKind: GoalRealityComparableKind;
  periodId: GoalRealityPeriodId;
  sourcePeriodLabel: string;
  yearsRepresented: number;
  /** actualComparable − expected, in percentage points. */
  gapPp: number;
  historyQuality: GoalRealityHistoryQuality;
  conclusion: string;
  qualityNote: string | null;
  methodologyNote: string;
  disclaimer: string;
} | {
  available: false;
  reason: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;
/** |gap| below this → “broadly in line”. */
export const GOAL_REALITY_INLINE_TOLERANCE_PP = 1;

/**
 * Compound annualization from a verified period return.
 * periodReturnDecimal is fractional (0.10 = +10% over the period).
 */
export function annualizePeriodReturn(
  periodReturnDecimal: number,
  yearsRepresented: number,
): number | null {
  if (
    !Number.isFinite(periodReturnDecimal) ||
    !Number.isFinite(yearsRepresented) ||
    yearsRepresented <= 0
  ) {
    return null;
  }
  const growth = 1 + periodReturnDecimal;
  if (growth <= 0) {
    // Total loss or worse over the window — annualize carefully.
    if (growth === 0) return -100;
    // Negative wealth ratio cannot be real for long-only portfolio values;
    // treat as unavailable rather than inventing complex numbers.
    return null;
  }
  const annual = Math.pow(growth, 1 / yearsRepresented) - 1;
  if (!Number.isFinite(annual)) return null;
  return annual * 100;
}

export function yearsFromSpanDays(spanDays: number): number {
  if (!Number.isFinite(spanDays) || spanDays <= 0) return 0;
  return spanDays / DAYS_PER_YEAR;
}

export function classifyHistoryQuality(
  yearsRepresented: number,
): GoalRealityHistoryQuality {
  if (yearsRepresented >= 1) return "strong";
  if (yearsRepresented >= 0.25) return "moderate";
  return "short";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number): string {
  const rounded = round1(value);
  return `${rounded}`;
}

/**
 * Pick the best verified candidate using the product hierarchy.
 */
export function selectGoalRealityCandidate(
  candidates: GoalRealityPeriodCandidate[],
): GoalRealityPeriodCandidate | null {
  const usable = candidates.filter((row) => {
    if (row.dataAvailability === "unavailable") return false;
    if (row.yearsRepresented <= 0) return false;
    if (!Number.isFinite(row.periodReturnDecimal)) return false;
    if (row.coveredHoldingCount <= 0) return false;
    return true;
  });
  if (usable.length === 0) return null;

  const order: GoalRealityPeriodId[] = [
    "ALL",
    "1Y",
    "6M",
    "3M",
    "1M",
    "1W",
  ];

  for (const periodId of order) {
    const match = usable
      .filter((row) => row.periodId === periodId)
      .sort((a, b) => b.yearsRepresented - a.yearsRepresented)[0];
    if (!match) continue;

    // Multi-year / inception: require meaningful span.
    if (periodId === "ALL" && match.yearsRepresented < 1.5) {
      continue;
    }
    // Prefer true ~1Y window for "last 12 months".
    if (periodId === "1Y" && match.yearsRepresented < 0.75) {
      continue;
    }
    if (periodId === "6M" && match.yearsRepresented < 0.4) {
      continue;
    }
    if (periodId === "3M" && match.yearsRepresented < 0.2) {
      continue;
    }
    return match;
  }

  // Fallback: longest usable span among remaining.
  return [...usable].sort((a, b) => b.yearsRepresented - a.yearsRepresented)[0] ?? null;
}

function resolveComparableKind(
  candidate: GoalRealityPeriodCandidate,
): GoalRealityComparableKind {
  if (candidate.periodId === "ALL" && candidate.yearsRepresented >= 1.5) {
    return "annualized_performance";
  }
  if (
    candidate.periodId === "1Y" ||
    (candidate.yearsRepresented >= 0.9 && candidate.yearsRepresented <= 1.15)
  ) {
    return "last_12_months";
  }
  return "recent_annualized_pace";
}

function buildConclusion(input: {
  kind: GoalRealityComparableKind;
  gapPp: number;
  expected: number;
  actual: number;
}): string {
  const absGap = Math.abs(input.gapPp);
  if (absGap < GOAL_REALITY_INLINE_TOLERANCE_PP) {
    return "Your recent pace is broadly in line with your planning assumption.";
  }

  if (input.kind === "last_12_months") {
    if (input.gapPp < 0) {
      return `Your planning assumption is ${formatPercent(absGap)} percentage points above your last 12-month return.`;
    }
    return `Your last 12-month return is ${formatPercent(absGap)} percentage points above your planning assumption.`;
  }

  if (input.kind === "annualized_performance") {
    if (input.gapPp < 0) {
      return `Your planning assumption is ${formatPercent(absGap)} percentage points above your annualized performance.`;
    }
    return `Your annualized performance is ${formatPercent(absGap)} percentage points above your planning assumption.`;
  }

  // recent annualized pace
  if (input.gapPp < 0) {
    return `Your planning assumption is ${formatPercent(absGap)} percentage points above your recent annualized pace.`;
  }
  return `Your recent annualized pace is ${formatPercent(absGap)} percentage points above your planning assumption.`;
}

function qualityNoteFor(
  quality: GoalRealityHistoryQuality,
  sourcePeriodLabel: string,
): string | null {
  if (quality === "short") {
    return `Based on ${sourcePeriodLabel}. Short-term performance can vary significantly.`;
  }
  if (quality === "moderate") {
    return `Based on ${sourcePeriodLabel}. A longer history would strengthen this comparison.`;
  }
  return null;
}

/**
 * Build a trust-first Goal Reality Check from verified period candidates.
 */
export function buildGoalRealityCheck(
  input: BuildGoalRealityCheckInput,
): GoalRealityCheck {
  const expected = input.expectedAnnualReturnPercent;
  if (expected == null || !Number.isFinite(expected) || expected < 0) {
    return {
      available: false,
      reason: "No saved expected annual return assumption.",
    };
  }

  const selected = selectGoalRealityCandidate(input.candidates);
  if (!selected) {
    return {
      available: false,
      reason: "Verified portfolio history is not available for comparison.",
    };
  }

  const kind = resolveComparableKind(selected);
  let comparableAnnualPercent: number | null;
  if (kind === "last_12_months") {
    // Prefer actual ~1Y simple return rather than re-annualizing.
    comparableAnnualPercent = selected.periodReturnDecimal * 100;
  } else {
    comparableAnnualPercent = annualizePeriodReturn(
      selected.periodReturnDecimal,
      selected.yearsRepresented,
    );
  }

  if (comparableAnnualPercent == null || !Number.isFinite(comparableAnnualPercent)) {
    return {
      available: false,
      reason: "Performance for the selected period could not be annualized safely.",
    };
  }

  const gapPp = comparableAnnualPercent - expected;
  const historyQuality = classifyHistoryQuality(selected.yearsRepresented);

  const methodologyBits = [
    "Uses verified market-price history with constant current holdings.",
    "Not a time-weighted return and not adjusted for deposits or withdrawals.",
  ];
  if (selected.historicalFxApproximate) {
    methodologyBits.push("FX conversion uses approximate current rates.");
  }
  if (selected.dataAvailability === "partial") {
    methodologyBits.push("Some holdings lacked complete history for this window.");
  }

  return {
    available: true,
    expectedAnnualReturnPercent: expected,
    comparableAnnualPercent: round1(comparableAnnualPercent),
    comparableKind: kind,
    periodId: selected.periodId,
    sourcePeriodLabel: selected.sourcePeriodLabel,
    yearsRepresented: selected.yearsRepresented,
    gapPp: round1(gapPp),
    historyQuality,
    conclusion: buildConclusion({
      kind,
      gapPp,
      expected,
      actual: comparableAnnualPercent,
    }),
    qualityNote: qualityNoteFor(historyQuality, selected.sourcePeriodLabel),
    methodologyNote: methodologyBits.join(" "),
    disclaimer:
      "Past performance does not predict future returns. This is context, not a forecast or advice.",
  };
}

/** Simple return decimal from start/end portfolio values. */
export function periodReturnDecimalFromValues(
  startingValue: number | null | undefined,
  endingValue: number | null | undefined,
): number | null {
  if (
    typeof startingValue !== "number" ||
    typeof endingValue !== "number" ||
    !Number.isFinite(startingValue) ||
    !Number.isFinite(endingValue) ||
    startingValue <= 0
  ) {
    return null;
  }
  return (endingValue - startingValue) / startingValue;
}

/**
 * Derive a sub-window return from verified chart points (constant-holdings series).
 */
export function derivePeriodReturnFromChartPoints(
  chartPoints: PortfolioPerformancePoint[],
  targetSpanDays: number,
): {
  periodReturnDecimal: number;
  yearsRepresented: number;
  spanDays: number;
} | null {
  if (!Array.isArray(chartPoints) || chartPoints.length < 2) return null;
  const sorted = [...chartPoints]
    .filter(
      (point) =>
        point.date &&
        typeof point.portfolioValue === "number" &&
        Number.isFinite(point.portfolioValue) &&
        point.portfolioValue > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  const end = sorted[sorted.length - 1]!;
  const endTime = Date.parse(end.date);
  if (!Number.isFinite(endTime)) return null;

  const targetStart = endTime - targetSpanDays * MS_PER_DAY;
  let start = sorted[0]!;
  for (const point of sorted) {
    const t = Date.parse(point.date);
    if (!Number.isFinite(t)) continue;
    if (t <= targetStart) start = point;
    else break;
  }

  const startTime = Date.parse(start.date);
  if (!Number.isFinite(startTime) || startTime >= endTime) return null;
  const spanDays = Math.max(
    1,
    Math.round((endTime - startTime) / MS_PER_DAY),
  );
  // Require the derived window to cover most of the requested span.
  if (spanDays < targetSpanDays * 0.7) return null;

  const periodReturnDecimal =
    (end.portfolioValue - start.portfolioValue) / start.portfolioValue;
  if (!Number.isFinite(periodReturnDecimal)) return null;

  return {
    periodReturnDecimal,
    yearsRepresented: yearsFromSpanDays(spanDays),
    spanDays,
  };
}

export type PerformanceHistorySnapshot = {
  periodId: GoalRealityPeriodId;
  success: boolean;
  investmentReturnPercent: number | null;
  startingValue: number | null;
  endingValue: number | null;
  chartPoints: PortfolioPerformancePoint[];
  dataAvailability: PerformanceDataAvailability;
  availabilityMessage: string | null;
  historicalFxApproximate: boolean;
  coveredHoldingCount: number;
  skippedHoldingCount: number;
  spanDays: number | null;
};

/**
 * Map API/history snapshots into Reality Check candidates (incl. 6M/3M slices).
 */
export function buildGoalRealityCandidatesFromHistory(
  snapshots: PerformanceHistorySnapshot[],
): GoalRealityPeriodCandidate[] {
  const candidates: GoalRealityPeriodCandidate[] = [];

  for (const snap of snapshots) {
    if (!snap.success) continue;
    if (snap.dataAvailability === "unavailable") continue;

    const fromValues = periodReturnDecimalFromValues(
      snap.startingValue,
      snap.endingValue,
    );
    const fromPercent =
      typeof snap.investmentReturnPercent === "number" &&
      Number.isFinite(snap.investmentReturnPercent)
        ? snap.investmentReturnPercent / 100
        : null;
    const periodReturnDecimal = fromValues ?? fromPercent;
    if (periodReturnDecimal == null) continue;

    let yearsRepresented =
      snap.spanDays != null && snap.spanDays > 0
        ? yearsFromSpanDays(snap.spanDays)
        : 0;

    if (yearsRepresented <= 0 && snap.chartPoints.length >= 2) {
      const first = snap.chartPoints[0]?.date;
      const last = snap.chartPoints[snap.chartPoints.length - 1]?.date;
      if (first && last) {
        const spanDays = Math.max(
          1,
          Math.round(
            (Date.parse(last) - Date.parse(first)) / MS_PER_DAY,
          ),
        );
        if (Number.isFinite(spanDays)) {
          yearsRepresented = yearsFromSpanDays(spanDays);
        }
      }
    }

    if (yearsRepresented <= 0) {
      // Calendar fallback only for fixed short API periods.
      if (snap.periodId === "1W") yearsRepresented = 7 / DAYS_PER_YEAR;
      else if (snap.periodId === "1M") yearsRepresented = 30 / DAYS_PER_YEAR;
      else if (snap.periodId === "1Y") yearsRepresented = 1;
      else continue;
    }

    const sourcePeriodLabel =
      snap.periodId === "ALL"
        ? yearsRepresented >= 1.5
          ? `${round1(yearsRepresented)} years of history`
          : "available portfolio history"
        : snap.periodId === "1Y"
          ? "the last 12 months"
          : snap.periodId === "1M"
            ? "the last month"
            : snap.periodId === "1W"
              ? "the last week"
              : `the last ${snap.periodId}`;

    candidates.push({
      periodId: snap.periodId,
      periodReturnDecimal,
      yearsRepresented,
      sourcePeriodLabel,
      dataAvailability: snap.dataAvailability,
      historicalFxApproximate: snap.historicalFxApproximate,
      coveredHoldingCount: snap.coveredHoldingCount,
      skippedHoldingCount: snap.skippedHoldingCount,
      constantHoldingsReconstructed: true,
    });

    // Derive 6M / 3M only from longer verified series (ALL or 1Y).
    if (snap.periodId === "ALL" || snap.periodId === "1Y") {
      const six = derivePeriodReturnFromChartPoints(snap.chartPoints, 182);
      if (six) {
        candidates.push({
          periodId: "6M",
          periodReturnDecimal: six.periodReturnDecimal,
          yearsRepresented: six.yearsRepresented,
          sourcePeriodLabel: "the last 6 months",
          dataAvailability: snap.dataAvailability,
          historicalFxApproximate: snap.historicalFxApproximate,
          coveredHoldingCount: snap.coveredHoldingCount,
          skippedHoldingCount: snap.skippedHoldingCount,
          constantHoldingsReconstructed: true,
        });
      }
      const three = derivePeriodReturnFromChartPoints(snap.chartPoints, 91);
      if (three) {
        candidates.push({
          periodId: "3M",
          periodReturnDecimal: three.periodReturnDecimal,
          yearsRepresented: three.yearsRepresented,
          sourcePeriodLabel: "the last 3 months",
          dataAvailability: snap.dataAvailability,
          historicalFxApproximate: snap.historicalFxApproximate,
          coveredHoldingCount: snap.coveredHoldingCount,
          skippedHoldingCount: snap.skippedHoldingCount,
          constantHoldingsReconstructed: true,
        });
      }
    }
  }

  return candidates;
}
