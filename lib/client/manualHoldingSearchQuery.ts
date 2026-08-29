/**
 * Classifies the Add Holding search box so ticker, name, and ISIN
 * share one input without requiring technical fields up front.
 */

import { looksLikeProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";
import { isValidIsin, normalizeIsin } from "@/lib/services/instruments/validation";
import type { InstrumentMatchInput } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type HoldingSearchQueryKind =
  | "empty"
  | "isin"
  | "provider_symbol"
  | "ticker"
  | "name";

export type ClassifiedHoldingSearchQuery = {
  kind: HoldingSearchQueryKind;
  ticker: string | null;
  isin: string | null;
  instrumentName: string | null;
};

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,7}$/i;

export function classifyHoldingSearchQuery(
  raw: string | null | undefined,
): ClassifiedHoldingSearchQuery {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { kind: "empty", ticker: null, isin: null, instrumentName: null };
  }

  if (isValidIsin(trimmed)) {
    return {
      kind: "isin",
      ticker: null,
      isin: normalizeIsin(trimmed),
      instrumentName: null,
    };
  }

  if (looksLikeProviderSymbolInput(trimmed)) {
    return {
      kind: "provider_symbol",
      ticker: trimmed.toUpperCase(),
      isin: null,
      instrumentName: null,
    };
  }

  if (/\s/.test(trimmed) || trimmed.length > 8) {
    return {
      kind: "name",
      ticker: null,
      isin: null,
      instrumentName: trimmed,
    };
  }

  if (TICKER_PATTERN.test(trimmed)) {
    return {
      kind: "ticker",
      ticker: trimmed.toUpperCase(),
      isin: null,
      instrumentName: null,
    };
  }

  return {
    kind: "name",
    ticker: null,
    isin: null,
    instrumentName: trimmed,
  };
}

/**
 * Builds match-engine input from the search box plus optional
 * More search options (ISIN, name, exchange). Search-box ISIN/name
 * do not require those fields to be filled separately.
 */
export function resolveManualLookupMatchInput(
  draft: StoredPortfolioHolding,
): InstrumentMatchInput {
  const fromSearch = classifyHoldingSearchQuery(draft.symbol);
  const explicitName = draft.name.trim() || draft.instrumentName?.trim() || "";
  const ticker =
    fromSearch.kind === "isin" || fromSearch.kind === "name"
      ? null
      : fromSearch.ticker;

  return {
    ticker,
    isin: normalizeIsin(draft.isin) ?? fromSearch.isin,
    exchange: draft.exchange ?? null,
    instrumentName: explicitName || fromSearch.instrumentName,
    assetType: draft.assetType === "cash" ? "cash" : "investment",
  };
}
