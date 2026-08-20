/**
 * Lightweight app-entry timing marks. No network. No PII.
 */

export const APP_ENTRY_CACHED_READY_MARK = "tobailey-cached-portfolio-ready";
export const APP_ENTRY_PRICES_RECONCILED_MARK = "tobailey-prices-reconciled";

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
