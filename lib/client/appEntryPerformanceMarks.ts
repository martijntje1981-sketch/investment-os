/**
 * Lightweight app-entry timing marks. No network. No PII.
 */

export const APP_ENTRY_CACHED_READY_MARK = "tobailey-cached-portfolio-ready";
export const APP_ENTRY_PRICES_RECONCILED_MARK = "tobailey-prices-reconciled";
export const APP_ENTRY_PRICE_REQUEST_STARTED_MARK = "tobailey-price-request-started";
export const APP_ENTRY_PRICE_REQUEST_REUSED_MARK = "tobailey-price-request-reused";
export const APP_ENTRY_HISTORY_WEEK_MONTH_READY_MARK =
  "tobailey-history-1w-1m-ready";
export const APP_ENTRY_GOAL_REALITY_EXTRA_HISTORY_READY_MARK =
  "tobailey-goal-reality-extra-history-ready";

function mark(name: string): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") {
    return;
  }
  try {
    performance.mark(name);
  } catch {
    // Ignore duplicate/unsupported marks.
  }
}

export function markAppEntryCachedPortfolioReady(): void {
  mark(APP_ENTRY_CACHED_READY_MARK);
}

export function markAppEntryPricesReconciled(): void {
  mark(APP_ENTRY_PRICES_RECONCILED_MARK);
}

export function markAppEntryPriceRequestStarted(): void {
  mark(APP_ENTRY_PRICE_REQUEST_STARTED_MARK);
}

export function markAppEntryPriceRequestReused(): void {
  mark(APP_ENTRY_PRICE_REQUEST_REUSED_MARK);
}

export function markAppEntryHistoryWeekMonthReady(): void {
  mark(APP_ENTRY_HISTORY_WEEK_MONTH_READY_MARK);
}

export function markAppEntryGoalRealityExtraHistoryReady(): void {
  mark(APP_ENTRY_GOAL_REALITY_EXTRA_HISTORY_READY_MARK);
}
