/** Friendly display copy for Home and Dashboard — presentation only. */

export const DAILY_PERFORMANCE_AFTER_CLOSE =
  "Today's performance will appear after market close.";
export const RANKING_AFTER_CLOSE =
  "Today's ranking will appear after market close.";

export function formatTodayMoveValue(input: {
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  formatValue: () => string;
}): string {
  if (input.hasDailyData && input.performanceCoverageComplete) {
    return input.formatValue();
  }

  if (input.hasDailyData) {
    return "Partial update";
  }

  return "—";
}

export function formatTodayMoveDetail(input: {
  hasDailyData: boolean;
  performanceCoverageComplete: boolean;
  formatPercent: () => string;
  coverageMessage?: string | null;
}): string {
  if (input.hasDailyData && input.performanceCoverageComplete) {
    return input.formatPercent();
  }

  if (input.coverageMessage) {
    return input.coverageMessage;
  }

  return DAILY_PERFORMANCE_AFTER_CLOSE;
}

export function formatMoverUnavailableMessage(
  performanceCoverageComplete: boolean,
): string | null {
  if (performanceCoverageComplete) {
    return null;
  }

  return RANKING_AFTER_CLOSE;
}
