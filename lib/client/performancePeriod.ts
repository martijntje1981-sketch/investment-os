/**
 * Central presentation metadata for price-move periods.
 * Exchange-traded → last session; native crypto → 24h; mixed → transparent aggregate.
 * Never uses manual refresh click time as a trading-session date.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type PerformanceMoveAssetClass =
  | "exchange_traded"
  | "native_crypto"
  | "cash"
  | "unknown";

export type PerformancePeriodKind =
  | "last_session"
  | "rolling_24h"
  | "latest_available"
  | "latest_sessions"
  | "mixed"
  | "none";

export type HoldingMovePeriod = {
  assetClass: PerformanceMoveAssetClass;
  kind: PerformancePeriodKind;
  /** Compact label near the move value, e.g. "Last session · Jul 24" or "24h". */
  primaryLabel: string;
  /** Provider/session calendar date label when known (exchange-traded only). */
  sessionDateLabel: string | null;
  /** Raw provider timestamp used for the session date (never manual refresh). */
  providerTimestamp: string | null;
  accessibleDescription: string;
};

export type PortfolioMovePeriod = {
  kind: PerformancePeriodKind;
  primaryLabel: string;
  detail: string | null;
  sessionDateLabel: string | null;
  /** Canonical YYYY-MM-DD session key when the book shares one close date. */
  providerSessionKey?: string | null;
  accessibleDescription: string;
  hasExchangeTraded: boolean;
  hasNativeCrypto: boolean;
  isMixed: boolean;
};

export const MIXED_PORTFOLIO_MOVE_EXPLANATION =
  "Exchange-traded assets use their latest session; crypto uses 24h.";

const AMSTERDAM_TIME_ZONE = "Europe/Amsterdam";

/**
 * Classification from normalized assetType only — never ticker-name guesses.
 * Bitcoin ETPs/ETFs stored as investment are exchange-traded (Last session).
 * Native crypto pairs use assetType crypto (24h).
 */
export function classifyHoldingForPerformancePeriod(
  holding: Pick<StoredPortfolioHolding, "assetType">,
): PerformanceMoveAssetClass {
  if (holding.assetType === "cash") {
    return "cash";
  }
  if (holding.assetType === "crypto") {
    return "native_crypto";
  }
  if (holding.assetType === "investment") {
    return "exchange_traded";
  }
  return "unknown";
}

/**
 * Provider quote/session timestamp only.
 * Excludes fetchedAt and any manual-refresh client clock.
 */
export function resolveProviderSessionTimestamp(
  holding: Pick<
    StoredPortfolioHolding,
    "marketPriceUpdatedAt" | "priceUpdatedAt"
  >,
): string | null {
  for (const candidate of [holding.marketPriceUpdatedAt, holding.priceUpdatedAt]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

/**
 * Formats a provider timestamp as a short English calendar date.
 * Date-only values are preserved without timezone day-shift.
 * Datetimes use the Amsterdam calendar date (consistent with app refresh copy).
 */
export function formatProviderSessionDateLabel(
  isoOrDate: string | null | undefined,
): string | null {
  if (!isoOrDate || !String(isoOrDate).trim()) {
    return null;
  }

  const trimmed = String(isoOrDate).trim();

  // Date-only: YYYY-MM-DD — format at noon UTC so the calendar day never shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }
    const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(noonUtc);
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: AMSTERDAM_TIME_ZONE,
  }).format(new Date(parsed));
}

/**
 * Mover-tile session date: weekday + day + month (e.g. "Fri 24 Jul").
 * Uses the same provider timestamp rules as formatProviderSessionDateLabel —
 * never invents a calendar day from "today".
 */
export function formatMoverSessionDateLabel(
  isoOrDate: string | null | undefined,
): string | null {
  if (!isoOrDate || !String(isoOrDate).trim()) {
    return null;
  }

  const trimmed = String(isoOrDate).trim();
  let date: Date;
  let timeZone: string;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }
    date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    timeZone = "UTC";
  } else {
    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    date = new Date(parsed);
    timeZone = AMSTERDAM_TIME_ZONE;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!weekday || !day || !month) {
    return null;
  }

  return `${weekday} ${day} ${month}`;
}

/**
 * Compact period label for an individual hero/top mover tile.
 * Crypto → 24h; exchange with date → Last session · {date}; exchange without → Last session.
 * Does not invent dates. Unknown / cash without trustworthy metadata → empty (neutral).
 */
export function formatMoverPeriodLabel(
  holding: Pick<
    StoredPortfolioHolding,
    "assetType" | "marketPriceUpdatedAt" | "priceUpdatedAt"
  >,
): string {
  const assetClass = classifyHoldingForPerformancePeriod(holding);

  if (assetClass === "cash") {
    return "";
  }

  if (assetClass === "native_crypto") {
    return "24h";
  }

  const providerTimestamp = resolveProviderSessionTimestamp(holding);
  const sessionDateLabel = formatMoverSessionDateLabel(providerTimestamp);

  if (assetClass === "unknown") {
    return sessionDateLabel ? `Last session · ${sessionDateLabel}` : "";
  }

  if (sessionDateLabel) {
    return `Last session · ${sessionDateLabel}`;
  }

  return "Last session";
}

/** Stable calendar key for comparing session dates across holdings. */
export function providerSessionDateKey(
  isoOrDate: string | null | undefined,
): string | null {
  if (!isoOrDate || !String(isoOrDate).trim()) {
    return null;
  }

  const trimmed = String(isoOrDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AMSTERDAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(parsed));
}

export function resolveHoldingMovePeriod(
  holding: Pick<
    StoredPortfolioHolding,
    "assetType" | "marketPriceUpdatedAt" | "priceUpdatedAt"
  >,
): HoldingMovePeriod {
  const assetClass = classifyHoldingForPerformancePeriod(holding);

  if (assetClass === "cash") {
    return {
      assetClass,
      kind: "none",
      primaryLabel: "",
      sessionDateLabel: null,
      providerTimestamp: null,
      accessibleDescription: "Cash has no market-move period.",
    };
  }

  if (assetClass === "native_crypto") {
    return {
      assetClass,
      kind: "rolling_24h",
      primaryLabel: "24h",
      sessionDateLabel: null,
      providerTimestamp: null,
      accessibleDescription: "Change over the last 24 hours.",
    };
  }

  // Exchange-traded (stocks, ETFs, ETCs, ETPs) and unknown non-cash → last session.
  const providerTimestamp = resolveProviderSessionTimestamp(holding);
  const sessionDateLabel = formatProviderSessionDateLabel(providerTimestamp);

  if (sessionDateLabel) {
    return {
      assetClass: "exchange_traded",
      kind: "last_session",
      primaryLabel: `Last session · ${sessionDateLabel}`,
      sessionDateLabel,
      providerTimestamp,
      accessibleDescription: `Change versus the previous close for the last trading session on ${sessionDateLabel}.`,
    };
  }

  return {
    assetClass: "exchange_traded",
    kind: "latest_available",
    primaryLabel: "Latest available",
    sessionDateLabel: null,
    providerTimestamp,
    accessibleDescription:
      "Change versus the previous close for the latest available trading session.",
  };
}

type PeriodHolding = Pick<
  StoredPortfolioHolding,
  "assetType" | "marketPriceUpdatedAt" | "priceUpdatedAt"
>;

/**
 * Aggregate portfolio move period from holdings that contribute to the move.
 * Cash never affects classification. Prefer performer holdings when provided.
 */
export function resolvePortfolioMovePeriod(
  holdings: PeriodHolding[],
): PortfolioMovePeriod {
  let hasExchangeTraded = false;
  let hasNativeCrypto = false;
  const exchangeDateKeys = new Set<string>();
  const exchangeDateLabels: string[] = [];

  for (const holding of holdings) {
    const assetClass = classifyHoldingForPerformancePeriod(holding);
    if (assetClass === "cash") {
      continue;
    }
    if (assetClass === "native_crypto") {
      hasNativeCrypto = true;
      continue;
    }

    hasExchangeTraded = true;
    const period = resolveHoldingMovePeriod(holding);
    const key = providerSessionDateKey(period.providerTimestamp);
    if (key && period.sessionDateLabel) {
      if (!exchangeDateKeys.has(key)) {
        exchangeDateKeys.add(key);
        exchangeDateLabels.push(period.sessionDateLabel);
      }
    }
  }

  const isMixed = hasExchangeTraded && hasNativeCrypto;

  if (!hasExchangeTraded && !hasNativeCrypto) {
    return {
      kind: "none",
      primaryLabel: "Latest available",
      detail: null,
      sessionDateLabel: null,
      accessibleDescription: "No market-move period is available yet.",
      hasExchangeTraded: false,
      hasNativeCrypto: false,
      isMixed: false,
    };
  }

  if (isMixed) {
    return {
      kind: "mixed",
      primaryLabel: "Latest portfolio move",
      detail: MIXED_PORTFOLIO_MOVE_EXPLANATION,
      sessionDateLabel: null,
      accessibleDescription: `Latest portfolio move. ${MIXED_PORTFOLIO_MOVE_EXPLANATION}`,
      hasExchangeTraded: true,
      hasNativeCrypto: true,
      isMixed: true,
    };
  }

  if (hasNativeCrypto && !hasExchangeTraded) {
    return {
      kind: "rolling_24h",
      primaryLabel: "24h",
      detail: null,
      sessionDateLabel: null,
      accessibleDescription: "Portfolio change over the last 24 hours.",
      hasExchangeTraded: false,
      hasNativeCrypto: true,
      isMixed: false,
    };
  }

  // Exchange-traded only
  if (exchangeDateKeys.size === 1) {
    const sessionDateLabel = exchangeDateLabels[0]!;
    const providerSessionKey = [...exchangeDateKeys][0]!;
    return {
      kind: "last_session",
      primaryLabel: `Last session · ${sessionDateLabel}`,
      detail: null,
      sessionDateLabel,
      providerSessionKey,
      accessibleDescription: `Portfolio change versus the previous close for the last trading session on ${sessionDateLabel}.`,
      hasExchangeTraded: true,
      hasNativeCrypto: false,
      isMixed: false,
    };
  }

  if (exchangeDateKeys.size > 1) {
    return {
      kind: "latest_sessions",
      primaryLabel: "Latest sessions",
      detail: "Holdings use their latest available trading sessions.",
      sessionDateLabel: null,
      accessibleDescription:
        "Portfolio change across the latest available trading sessions for each holding.",
      hasExchangeTraded: true,
      hasNativeCrypto: false,
      isMixed: false,
    };
  }

  return {
    kind: "latest_available",
    primaryLabel: "Latest available",
    detail: null,
    sessionDateLabel: null,
    accessibleDescription:
      "Portfolio change for the latest available trading session.",
    hasExchangeTraded: true,
    hasNativeCrypto: false,
    isMixed: false,
  };
}

/** Compact column/header label for mixed holding tables. */
export function resolveHoldingsMoveColumnLabel(
  holdings: PeriodHolding[],
): string {
  const period = resolvePortfolioMovePeriod(holdings);
  if (period.kind === "rolling_24h") {
    return "24h";
  }
  if (period.kind === "mixed" || period.kind === "latest_sessions") {
    return "Move";
  }
  if (period.kind === "last_session" && period.sessionDateLabel) {
    return "Last session";
  }
  if (period.kind === "latest_available") {
    return "Latest available";
  }
  return "Move";
}

/**
 * Weekday possessive for market-close copy, e.g. "Friday's".
 * Uses Amsterdam calendar day from a provider session timestamp.
 */
export function formatMarketCloseWeekdayPossessive(
  providerTimestamp: string | null | undefined,
): string | null {
  if (!providerTimestamp?.trim()) return null;
  const trimmed = providerTimestamp.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? Date.parse(`${trimmed}T12:00:00+02:00`)
    : Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: AMSTERDAM_TIME_ZONE,
    weekday: "long",
  }).format(new Date(parsed));
  if (!weekday) return null;
  return `${weekday}'s`;
}

/**
 * Short contextual line under the portfolio move figure.
 * Reflects actual composition — never invents live/today/session claims.
 */
export function formatPortfolioMovePeriodContextLine(
  period: PortfolioMovePeriod,
): string {
  if (period.kind === "mixed") {
    return "Previous close for listed holdings · Crypto: 24h";
  }
  if (period.kind === "rolling_24h") {
    return "Based on the last 24 hours";
  }
  if (period.kind === "last_session") {
    const weekday = formatMarketCloseWeekdayPossessive(
      period.providerSessionKey ?? null,
    );
    if (weekday) {
      return `Based on ${weekday} market close`;
    }
    return period.sessionDateLabel
      ? `Based on ${period.sessionDateLabel} market close`
      : "Based on the previous market close";
  }
  if (period.kind === "latest_sessions") {
    return "Based on the latest available market closes";
  }
  if (period.kind === "latest_available") {
    return "Latest available prices — not a live quote";
  }
  return "Movement period unavailable";
}
