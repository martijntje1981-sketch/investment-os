/**
 * Canonical quote-change helpers for Market Pulse.
 * Quote moves stay separate from chart/momentum period moves.
 */

import type { MarketPulseQuoteChangePeriod } from "@/lib/services/marketPulse/types";

export function sanitizeFiniteNumber(value: unknown): number | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toUpperCase() === "NA" || trimmed === "-") {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

/** Reject zero prices used as placeholders for missing commodity/spot data. */
export function sanitizePrice(value: unknown): number | null {
  const n = sanitizeFiniteNumber(value);
  if (n === null || n === 0) return null;
  return n;
}

export function sanitizeTimestampSeconds(value: unknown, nowMs = Date.now()): string | null {
  const seconds = sanitizeFiniteNumber(value);
  if (seconds === null || seconds <= 0) return null;
  const ms = seconds * 1000;
  // Reject impossible timestamps (more than 1 day in the future, or before 2009).
  if (ms > nowMs + 86_400_000) return null;
  if (ms < Date.UTC(2009, 0, 1)) return null;
  return new Date(ms).toISOString();
}

export function computeChangeFromClose(
  currentPrice: number | null,
  previousClose: number | null,
): { changeAmount: number | null; changePercent: number | null } {
  if (
    currentPrice === null ||
    previousClose === null ||
    previousClose === 0 ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(previousClose)
  ) {
    return { changeAmount: null, changePercent: null };
  }
  const changeAmount = currentPrice - previousClose;
  const changePercent = (changeAmount / previousClose) * 100;
  if (!Number.isFinite(changeAmount) || !Number.isFinite(changePercent)) {
    return { changeAmount: null, changePercent: null };
  }
  return { changeAmount, changePercent };
}

export function changesAreConsistent(
  currentPrice: number | null,
  previousClose: number | null,
  changeAmount: number | null,
  changePercent: number | null,
  tolerance = 0.06,
): boolean {
  if (
    currentPrice === null ||
    previousClose === null ||
    changeAmount === null ||
    changePercent === null
  ) {
    return true;
  }
  const expectedAmount = currentPrice - previousClose;
  const expectedPercent = (expectedAmount / previousClose) * 100;
  return (
    Math.abs(changeAmount - expectedAmount) <= tolerance &&
    Math.abs(changePercent - expectedPercent) <= tolerance
  );
}

/** Daily / session periods that may be ranked together for the hero. */
export const HERO_COMPARABLE_PERIODS = new Set<MarketPulseQuoteChangePeriod>([
  "24h",
  "previous_close",
  "previous_eod",
  "session",
  "last_session",
]);

export function isHeroComparablePeriod(
  period: MarketPulseQuoteChangePeriod | null | undefined,
): boolean {
  return period != null && HERO_COMPARABLE_PERIODS.has(period);
}

export function formatQuotePeriodLabel(
  period: MarketPulseQuoteChangePeriod | null | undefined,
): string {
  switch (period) {
    case "24h":
      return "24h";
    case "previous_close":
      return "Previous close";
    case "previous_eod":
      return "Previous EOD";
    case "session":
      return "Session";
    case "last_session":
      return "Last session";
    case "1w":
      return "1W";
    case "1m":
      return "1M";
    case "3m":
      return "3M";
    case "1y":
      return "1Y";
    default:
      return "Unavailable";
  }
}

export function isEodBackedProviderSymbol(providerSymbol: string): boolean {
  return providerSymbol.endsWith(".FOREX");
}

export function marketStatusNeverLive(status: string | null | undefined): boolean {
  if (!status) return true;
  return !/\blive\b/i.test(status);
}

export function allHeroPeriodsAreSameDayFraming(
  periods: MarketPulseQuoteChangePeriod[],
): boolean {
  if (periods.length === 0) return false;
  const unique = new Set(periods);
  // Only claim “today” when every ranked asset shares a same-day framing.
  if (unique.size === 1 && (unique.has("24h") || unique.has("session"))) {
    return true;
  }
  // Crypto 24h + equity previous_close/session are both “latest daily” but not
  // identical — use neutral hero wording.
  return false;
}
