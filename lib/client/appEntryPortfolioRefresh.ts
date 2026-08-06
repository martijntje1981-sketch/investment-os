/**
 * Controlled app-entry / tab-return portfolio price refresh.
 * Reuses the shared live-refresh action — never invents a parallel fetch path.
 */

import {
  getLivePriceRefreshCooldownRemainingMs,
  LIVE_PRICE_REFRESH_COOLDOWN_MS,
  readLastLivePriceRefreshAt,
} from "@/lib/client/livePortfolioPriceRefresh";
import { isLivePriceRefreshInFlight } from "@/lib/client/portfolioPricing";

/** Refresh when last successful live refresh is older than this window. */
export const APP_ENTRY_REFRESH_STALE_MS = 5 * 60 * 1000;

export type AppEntryRefreshDecision = {
  shouldRefresh: boolean;
  reason:
    | "ready"
    | "not_ready"
    | "no_user"
    | "no_holdings"
    | "in_flight"
    | "cooldown"
    | "fresh"
    | "stale";
};

/**
 * Pure gate for app-entry / visibility refresh. Safe to unit-test without DOM.
 */
export function shouldRunAppEntryPortfolioRefresh(input: {
  ready: boolean;
  userSub: string | null | undefined;
  holdingsCount: number;
  now?: number;
  /** Injected for tests — defaults to module in-flight + cooldown helpers. */
  inFlight?: boolean;
  cooldownRemainingMs?: number;
  lastRefreshAt?: string | null;
}): AppEntryRefreshDecision {
  const now = input.now ?? Date.now();

  if (!input.ready) {
    return { shouldRefresh: false, reason: "not_ready" };
  }
  if (!input.userSub) {
    return { shouldRefresh: false, reason: "no_user" };
  }
  if (input.holdingsCount <= 0) {
    return { shouldRefresh: false, reason: "no_holdings" };
  }

  const inFlight =
    typeof input.inFlight === "boolean"
      ? input.inFlight
      : isLivePriceRefreshInFlight();
  if (inFlight) {
    return { shouldRefresh: false, reason: "in_flight" };
  }

  const cooldownRemainingMs =
    typeof input.cooldownRemainingMs === "number"
      ? input.cooldownRemainingMs
      : getLivePriceRefreshCooldownRemainingMs(now);
  if (cooldownRemainingMs > 0) {
    return { shouldRefresh: false, reason: "cooldown" };
  }

  const lastRefreshAt =
    input.lastRefreshAt !== undefined
      ? input.lastRefreshAt
      : readLastLivePriceRefreshAt(input.userSub);
  if (lastRefreshAt) {
    const lastMs = Date.parse(lastRefreshAt);
    if (Number.isFinite(lastMs) && now - lastMs < APP_ENTRY_REFRESH_STALE_MS) {
      return { shouldRefresh: false, reason: "fresh" };
    }
  }

  return { shouldRefresh: true, reason: lastRefreshAt ? "stale" : "ready" };
}

/** Minimum spacing between visibility-triggered attempts (beyond live cooldown). */
export const APP_ENTRY_VISIBILITY_MIN_GAP_MS = LIVE_PRICE_REFRESH_COOLDOWN_MS;
