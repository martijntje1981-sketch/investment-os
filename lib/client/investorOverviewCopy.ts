/** Friendly display copy for Home and Dashboard — presentation only. */

export const AFTER_MARKET_CLOSE = "Available after market close";
export const WAITING_MARKET_CLOSE = "Waiting for today's market close";
export const RANKING_AFTER_CLOSE = "Ranking available after market close.";

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

  return AFTER_MARKET_CLOSE;
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

  return WAITING_MARKET_CLOSE;
}

export function formatMoverUnavailableMessage(
  performanceCoverageComplete: boolean,
): string | null {
  if (performanceCoverageComplete) {
    return null;
  }

  return RANKING_AFTER_CLOSE;
}
