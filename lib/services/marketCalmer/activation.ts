/**
 * Market Calmer activation from portfolio day move %.
 */

import {
  MARKET_CALMER_HIGH_STRESS_MIN_PERCENT,
  MARKET_CALMER_NOTABLE_MIN_PERCENT,
} from "@/lib/services/marketCalmer/config";
import type {
  MarketCalmerActivation,
  MarketCalmerDirection,
} from "@/lib/services/marketCalmer/types";

export function resolveMarketCalmerActivation(
  todayPercent: number | null | undefined,
  hasDailyData: boolean,
): MarketCalmerActivation {
  if (
    !hasDailyData ||
    todayPercent === null ||
    todayPercent === undefined ||
    !Number.isFinite(todayPercent)
  ) {
    return "inactive";
  }

  const abs = Math.abs(todayPercent);
  if (abs < MARKET_CALMER_NOTABLE_MIN_PERCENT) {
    return "inactive";
  }
  if (abs >= MARKET_CALMER_HIGH_STRESS_MIN_PERCENT) {
    return "high_stress";
  }
  return "notable";
}

export function resolveMarketCalmerDirection(
  todayPercent: number | null | undefined,
): MarketCalmerDirection {
  if (todayPercent === null || todayPercent === undefined || !Number.isFinite(todayPercent)) {
    return "flat";
  }
  if (todayPercent > 0) return "positive";
  if (todayPercent < 0) return "negative";
  return "flat";
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
