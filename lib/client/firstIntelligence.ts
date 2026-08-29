/**
 * First-intelligence marker after a new user successfully sets up a portfolio.
 * Client-only. Does not seed Demo holdings or start a trial.
 */

import { isValidUserSub } from "@/lib/client/portfolioStorageKeys";

export const FIRST_INTELLIGENCE_QUERY = "ready";

function pendingKey(userSub: string): string {
  return `tobailey-first-intelligence-pending:${userSub}`;
}

function dismissedKey(userSub: string): string {
  return `tobailey-first-intelligence-dismissed:${userSub}`;
}

export function markFirstIntelligencePending(
  userSub: string | null | undefined,
): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pendingKey(userSub), "1");
    window.localStorage.removeItem(dismissedKey(userSub));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isFirstIntelligencePending(
  userSub: string | null | undefined,
): boolean {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(pendingKey(userSub)) === "1";
  } catch {
    return false;
  }
}

export function dismissFirstIntelligence(
  userSub: string | null | undefined,
): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(pendingKey(userSub));
    window.localStorage.setItem(dismissedKey(userSub), "1");
  } catch {
    /* ignore */
  }
}

export function isFirstIntelligenceDismissed(
  userSub: string | null | undefined,
): boolean {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(dismissedKey(userSub)) === "1";
  } catch {
    return false;
  }
}

export function firstIntelligenceDashboardHref(): string {
  return `/dashboard?${FIRST_INTELLIGENCE_QUERY}=1`;
}

export function readReadyQueryFlag(search: string | null | undefined): boolean {
  if (!search) return false;
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get(FIRST_INTELLIGENCE_QUERY) === "1";
}

export function shouldShowFirstIntelligence(input: {
  userSub: string | null | undefined;
  hasHoldings: boolean;
  exampleActive: boolean;
  search?: string | null;
}): boolean {
  if (!input.hasHoldings || input.exampleActive) return false;
  if (isFirstIntelligenceDismissed(input.userSub)) return false;
  if (readReadyQueryFlag(input.search)) return true;
  return isFirstIntelligencePending(input.userSub);
}
