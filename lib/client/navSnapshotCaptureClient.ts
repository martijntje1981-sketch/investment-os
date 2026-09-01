/**
 * Client gate and same-origin request for trusted NAV snapshot capture.
 * Sends only the active portfolioId. Server remains authoritative.
 * Never starts a price-provider request.
 */

import { resolvePortfolioTotalValueAvailability } from "@/lib/client/portfolioValuationAvailability";
import type { NavSnapshotCaptureStatus } from "@/lib/services/goalPace/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const PORTFOLIO_NAV_SNAPSHOT_CAPTURE_PATH =
  "/api/portfolio/nav-snapshot" as const;

export type NavSnapshotCaptureTrigger =
  | "settled_valuation"
  | "manual_refresh"
  | "portfolio_switch";

export type NavSnapshotCaptureRequestResult = {
  status: NavSnapshotCaptureStatus;
  requested: boolean;
};

const TERMINAL_DEDUPE_STATUSES = new Set<NavSnapshotCaptureStatus>([
  "disabled",
  "created",
  "improved",
  "already_captured",
  "skipped_demo",
  "skipped_unresolved_access",
  "forbidden",
]);

const inFlightKeys = new Set<string>();
const completedKeys = new Set<string>();

export function utcSnapshotDateIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function navSnapshotCaptureDedupeKey(input: {
  userSub: string;
  portfolioId: string;
  now?: Date;
}): string {
  return `${input.userSub}:${input.portfolioId}:${utcSnapshotDateIso(input.now)}`;
}

export function resetNavSnapshotCaptureDedupeForTests(): void {
  inFlightKeys.clear();
  completedKeys.clear();
}

export function shouldRequestNavSnapshotCapture(input: {
  pathname?: string | null;
  authReady: boolean;
  userSub: string | null;
  portfolioReady: boolean;
  activePortfolioId: string | null;
  holdingsBelongToActivePortfolio: boolean;
  pricesSettled: boolean;
  isRefreshing: boolean;
  portfolioValueAvailable: boolean;
  accessReady: boolean;
  isDemo: boolean;
  trigger: NavSnapshotCaptureTrigger;
}): { request: boolean; reason: string } {
  const pathname = input.pathname ?? "";
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/login/")) {
    return { request: false, reason: "public_surface" };
  }
  if (!input.authReady) return { request: false, reason: "auth_not_ready" };
  if (!input.userSub) return { request: false, reason: "no_user" };
  if (!input.portfolioReady) return { request: false, reason: "portfolio_not_ready" };
  if (!input.activePortfolioId) {
    return { request: false, reason: "portfolio_identity_unresolved" };
  }
  if (!input.holdingsBelongToActivePortfolio) {
    return { request: false, reason: "holdings_not_for_active_portfolio" };
  }
  if (input.isRefreshing) return { request: false, reason: "refresh_in_flight" };
  if (!input.pricesSettled) return { request: false, reason: "prices_not_settled" };
  if (!input.accessReady) return { request: false, reason: "access_unresolved" };
  if (input.isDemo) return { request: false, reason: "demo" };
  if (!input.portfolioValueAvailable) {
    return { request: false, reason: "value_unavailable" };
  }
  return { request: true, reason: input.trigger };
}

function canBeginCaptureRequest(
  key: string,
  trigger: NavSnapshotCaptureTrigger,
): boolean {
  if (inFlightKeys.has(key)) return false;
  if (trigger !== "manual_refresh" && completedKeys.has(key)) return false;
  inFlightKeys.add(key);
  return true;
}

function finishCaptureRequest(
  key: string,
  status: NavSnapshotCaptureStatus | null,
): void {
  inFlightKeys.delete(key);
  if (status && TERMINAL_DEDUPE_STATUSES.has(status)) {
    completedKeys.add(key);
  }
}

export async function requestPortfolioNavSnapshotCapture(input: {
  portfolioId: string;
  userSub: string;
  trigger: NavSnapshotCaptureTrigger;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<NavSnapshotCaptureRequestResult> {
  const key = navSnapshotCaptureDedupeKey({
    userSub: input.userSub,
    portfolioId: input.portfolioId,
    now: input.now,
  });
  if (!canBeginCaptureRequest(key, input.trigger)) {
    return { status: "already_captured", requested: false };
  }

  try {
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(PORTFOLIO_NAV_SNAPSHOT_CAPTURE_PATH, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioId: input.portfolioId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      status?: NavSnapshotCaptureStatus;
    } | null;
    const status = payload?.status ?? "error";
    finishCaptureRequest(key, status);
    return { status, requested: true };
  } catch {
    finishCaptureRequest(key, "error");
    return { status: "error", requested: true };
  }
}

export function activePortfolioValueAvailable(
  holdings: StoredPortfolioHolding[],
): boolean {
  return resolvePortfolioTotalValueAvailability(holdings).isAvailable;
}
