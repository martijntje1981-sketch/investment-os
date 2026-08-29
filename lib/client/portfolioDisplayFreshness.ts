/**
 * Canonical user-facing portfolio freshness.
 *
 * PORTFOLIO UPDATED = the latest time Tobailey successfully reconciled the
 * displayed portfolio from usable price data. That is not provider quote time,
 * exchange trade time, a holding timestamp, or component render time.
 */

import { portfolioDisplayFreshnessKey } from "@/lib/client/portfolioStorageKeys";

const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

export type PortfolioDisplayFreshness = {
  updatedAt: string | null;
  label: string | null;
};

function amsterdamDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AMSTERDAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftIsoDateKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

function parseIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function readPortfolioDisplayFreshness(
  userSub: string | null | undefined,
): string | null {
  if (!userSub) return null;
  try {
    const raw = localStorage.getItem(portfolioDisplayFreshnessKey(userSub));
    return parseIsoTimestamp(raw);
  } catch {
    return null;
  }
}

/**
 * Records a successful usable reconciliation. Call only after quotes were
 * actually applied to the displayed portfolio.
 */
export function recordPortfolioDisplayFreshness(
  userSub: string,
  at: Date | string = new Date(),
): string {
  const iso =
    typeof at === "string" ? parseIsoTimestamp(at) : at.toISOString();
  const updatedAt = iso ?? new Date().toISOString();
  try {
    localStorage.setItem(portfolioDisplayFreshnessKey(userSub), updatedAt);
  } catch {
    // Storage can be unavailable in private mode; the in-memory caller still
    // receives the reconciliation time for this session.
  }
  return updatedAt;
}

export function formatPortfolioDisplayFreshnessLabel(
  updatedAt: string | null | undefined,
  now: Date | number = new Date(),
): string | null {
  const iso = parseIsoTimestamp(updatedAt);
  if (!iso) return null;

  const target = new Date(iso);
  const nowDate = now instanceof Date ? now : new Date(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: AMSTERDAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(target);

  const todayKey = amsterdamDayKey(nowDate);
  const targetKey = amsterdamDayKey(target);
  if (targetKey === todayKey) {
    return `Updated today, ${time}`;
  }
  if (targetKey === shiftIsoDateKey(todayKey, -1)) {
    return `Updated yesterday, ${time}`;
  }

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: AMSTERDAM_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(target);
  return `Updated ${date}, ${time}`;
}

/**
 * One user-facing freshness concept for Dashboard and Portfolio.
 * Prefers the last successful usable reconciliation. A legacy live-refresh
 * timestamp may appear only until the next successful reconciliation.
 * Holding quote times and scheduled snapshot times are never used.
 */
export function resolvePortfolioDisplayFreshness(input: {
  displayFreshnessAt?: string | null;
  legacyLiveRefreshAt?: string | null;
  now?: Date | number;
}): PortfolioDisplayFreshness {
  const updatedAt =
    parseIsoTimestamp(input.displayFreshnessAt) ??
    parseIsoTimestamp(input.legacyLiveRefreshAt);
  return {
    updatedAt,
    label: formatPortfolioDisplayFreshnessLabel(updatedAt, input.now),
  };
}

export function resetPortfolioDisplayFreshnessForTests(): void {
  if (typeof localStorage === "undefined") return;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("investment-os-portfolio-display-freshness:")) {
      localStorage.removeItem(key);
    }
  }
}
