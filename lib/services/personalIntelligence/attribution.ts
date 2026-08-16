/**
 * Phase 1D — shared attribution materiality + validation helpers.
 * Pure. No UI coupling. Reuses Phase 1A contribution pp formula.
 *
 * Formula (unchanged):
 *   contributionPp = (holding move / previous portfolio value) × 100
 *
 * Sum of contributionPp over valued performers ≈ portfolio todayPercent
 * when previousPortfolioValue is the same base used by daily performance.
 */

import type { DayContribution } from "@/lib/services/personalIntelligence/types";

/** Display threshold — hide tiny drivers from the briefing list. */
export const ATTRIBUTION_DISPLAY_MIN_PP = 0.08;

/**
 * Attention / Action Plan materiality — stronger than display noise floor.
 * Used for “material contributor” attention and Understand filtering.
 */
export const ATTRIBUTION_MATERIAL_MIN_PP = 0.15;

/** Heuristic: share of material |pp| from one exposure → Understand. */
export const ATTRIBUTION_DOMINANT_SHARE = 0.55;

/** Heuristic: largest holding weight (%) with 2+ holdings → Review. */
export const ATTRIBUTION_CONCENTRATION_WEIGHT = 40;

/** How closely sum(pp) should match portfolio todayPercent in tests/validation. */
export const ATTRIBUTION_RECONCILE_TOLERANCE_PP = 0.05;

export function absContributionPp(row: DayContribution): number {
  return row.contributionPp != null && Number.isFinite(row.contributionPp)
    ? Math.abs(row.contributionPp)
    : 0;
}

export function isDisplayMaterialContribution(row: DayContribution): boolean {
  return absContributionPp(row) >= ATTRIBUTION_DISPLAY_MIN_PP;
}

export function isAttentionMaterialContribution(row: DayContribution): boolean {
  return absContributionPp(row) >= ATTRIBUTION_MATERIAL_MIN_PP;
}

/**
 * Format contribution pp for UI — one decimal, signed.
 * Avoids false precision (no two-decimal churn).
 */
export function formatContributionPp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Object.is(rounded, -0) || rounded === 0) return "0.0 pp";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)} pp`;
}

export function sumContributionPp(rows: DayContribution[]): number {
  return rows.reduce((sum, row) => {
    if (row.contributionPp == null || !Number.isFinite(row.contributionPp)) {
      return sum;
    }
    return sum + row.contributionPp;
  }, 0);
}

/**
 * True when sum of contribution pp approximately equals portfolio day %.
 * Incomplete coverage or missing previous value → false (not a fake reconcile).
 */
export function contributionsReconcileToPortfolioPercent(input: {
  contributions: DayContribution[];
  todayPercent: number | null | undefined;
  hasDailyData: boolean;
  tolerancePp?: number;
}): boolean {
  if (!input.hasDailyData || input.todayPercent == null) return false;
  if (!Number.isFinite(input.todayPercent)) return false;
  if (input.contributions.length === 0) return false;
  if (input.contributions.some((row) => row.contributionPp == null)) {
    return false;
  }

  const sum = sumContributionPp(input.contributions);
  const tolerance = input.tolerancePp ?? ATTRIBUTION_RECONCILE_TOLERANCE_PP;
  return Math.abs(sum - input.todayPercent) <= tolerance;
}

export type MaterialDriverShare = {
  symbol: string;
  name: string;
  contributionPp: number;
  /**
   * Share of absolute material contribution pp (0–1).
   * Denominator = sum |pp| over rows meeting ATTRIBUTION_MATERIAL_MIN_PP.
   * Useful internally; do not show in UI on mixed +/- days without care.
   */
  shareOfMaterialAbs: number;
};

/**
 * Dominant driver among material contributions, if any.
 * Internal helper for Action Plan — not exposed in the briefing UI.
 */
export function dominantMaterialDriverShare(
  contributions: DayContribution[],
): MaterialDriverShare | null {
  const material = contributions.filter(isAttentionMaterialContribution);
  if (material.length === 0) return null;

  const totalAbs = material.reduce(
    (sum, row) => sum + absContributionPp(row),
    0,
  );
  if (totalAbs <= 0) return null;

  let top = material[0]!;
  for (const row of material) {
    if (absContributionPp(row) > absContributionPp(top)) {
      top = row;
    }
  }

  const pp = top.contributionPp;
  if (pp == null || !Number.isFinite(pp)) return null;

  return {
    symbol: top.symbol,
    name: top.name,
    contributionPp: pp,
    shareOfMaterialAbs: absContributionPp(top) / totalAbs,
  };
}

export function hasMixedContributionPeriods(
  rows: DayContribution[],
): boolean {
  const hasCrypto = rows.some(
    (row) =>
      row.assetType === "crypto" || /24h/i.test(row.periodLabel ?? ""),
  );
  const hasEquity = rows.some(
    (row) =>
      row.assetType === "investment" ||
      /session/i.test(row.periodLabel ?? ""),
  );
  return hasCrypto && hasEquity;
}

/**
 * Compact mixed-period note — only when equity session + crypto 24h coexist.
 */
export const ATTRIBUTION_MIXED_PERIOD_NOTE =
  "Figures combine latest trading sessions with crypto 24h moves — periods are not identical.";
