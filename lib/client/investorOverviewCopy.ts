/** Friendly display copy for Home and Dashboard — presentation only. */

export const DAILY_PERFORMANCE_AFTER_CLOSE =
  "Latest session performance will appear when price data is available.";
export const RANKING_AFTER_CLOSE =
  "Latest movers will appear when price data is available.";

export function formatTodayMoveValue(input: {
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  formatValue: () => string;
}): string {
  if (input.hasDailyData) {
    return input.formatValue();
  }

  return "—";
}

export function formatTodayMoveDetail(input: {
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  formatPercent: () => string;
  coverageMessage?: string | null;
  mixedPeriodDetail?: string | null;
}): string {
  if (!input.hasDailyData) {
    if (input.coverageMessage) {
      return input.coverageMessage;
    }
    return DAILY_PERFORMANCE_AFTER_CLOSE;
  }

  const parts: string[] = [input.formatPercent()];

  if (input.mixedPeriodDetail) {
    parts.push(input.mixedPeriodDetail);
  }

  if (!input.performanceCoverageComplete && input.coverageMessage) {
    parts.push(input.coverageMessage);
  }

  return parts.join(" · ");
}

export function formatMoverUnavailableMessage(input: {
  hasDailyData: boolean;
  hasReliableMoverData: boolean;
  coverageMessage?: string | null;
}): string | null {
  if (input.hasReliableMoverData) {
    return null;
  }

  if (input.hasDailyData && input.coverageMessage) {
    return input.coverageMessage;
  }

  if (input.hasDailyData) {
    return null;
  }

  return RANKING_AFTER_CLOSE;
}
