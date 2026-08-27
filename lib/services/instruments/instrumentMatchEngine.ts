/**
 * Instrument Match Engine
 *
 * Resolves raw import identifiers to canonical EODHD provider symbols.
 * Reusable by screenshot OCR, CSV import, manual entry, and future brokers.
 *
 * Resolution priority (strict order):
 *   1. Exact provider symbol (TICKER.EXCHANGE)
 *   2. Ticker + purchase/pricing exchange against verified mappings
 *   3. ISIN → enumerate provider listings (registry is enrichment only)
 *   4. Ticker + Exchange → ID Mapping / Search
 *   5. Instrument Name + Exchange → Search
 *
 * A supplied ISIN is the primary security identity. Conflicting ISINs are
 * never offered. Multi-venue securities are not collapsed unless the user
 * selected that venue.
 */

import {
  buildProviderSymbol,
  fetchIdMapping,
  fetchSearch,
  isEodhdQuotaOrRateLimitError,
  type EodhdIdMappingRow,
  type EodhdSearchRow,
} from "./eodhdClient";
import {
  isEodhdInstrumentQuotaExhausted,
  markEodhdInstrumentQuotaExhausted,
} from "./eodhdQuotaGuard";
import {
  exchangeResolutionMessage,
  providerExchangesMatch,
  resolveExchangeForMatching,
} from "./exchangeNormalizer";
import {
  looksLikeProviderSymbolInput,
  parseProviderSymbolInput,
} from "./providerSymbolInput";
import {
  listVerifiedByIsin,
  lookupVerifiedByIsin,
  lookupVerifiedByProviderSymbol,
  lookupVerifiedByTickerExchange,
  lookupVerifiedByTickerPurchaseExchange,
  resolveVerifiedPurchaseExchange,
  verifiedEntryToResolved,
} from "./verifiedInstrumentRegistry";
import { isValidIsin, normalizeIsin } from "./validation";
import type {
  InstrumentMatchInput,
  InstrumentMatchResult,
  ResolvedInstrument,
} from "@/lib/types/instrument";
import {
  listingRowConflictsIsin,
} from "./idMappingNormalizer";
import {
  discoverListingsForIsin,
  resolveDiscoveredIsinListings,
} from "./isinListingDiscovery";
import { providerRowToResolved } from "./providerRowToResolved";

/** Minimum confidence below which user confirmation is required. */
const CONFIRMATION_THRESHOLD = 0.85;

import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";

function handleProviderFailure(error: unknown): void {
  if (isEodhdQuotaOrRateLimitError(error)) {
    markEodhdInstrumentQuotaExhausted(error);
  }
}

async function safeFetchIdMapping(
  filters: Parameters<typeof fetchIdMapping>[0],
): Promise<EodhdIdMappingRow[] | null> {
  if (isEodhdInstrumentQuotaExhausted()) {
    return null;
  }

  try {
    return await fetchIdMapping(filters);
  } catch (error) {
    handleProviderFailure(error);
    return null;
  }
}

async function safeFetchSearch(
  query: string,
  options: Parameters<typeof fetchSearch>[1] = {},
): Promise<EodhdSearchRow[] | null> {
  if (isEodhdInstrumentQuotaExhausted()) {
    return null;
  }

  try {
    return await fetchSearch(query, options);
  } catch (error) {
    handleProviderFailure(error);
    return null;
  }
}

function cleanTicker(value: string | null | undefined): string {
  return value ? value.trim().toUpperCase() : "";
}

function cleanName(value: string | null | undefined): string {
  return value ? value.trim() : "";
}

function finalize(
  partial: Omit<ResolvedInstrument, "requiresConfirmation">,
): ResolvedInstrument {
  return {
    ...partial,
    requiresConfirmation: partial.confidence < CONFIRMATION_THRESHOLD,
  };
}

function unresolved(warnings: string[]): ResolvedInstrument {
  return finalize({
    providerSymbol: null,
    instrumentName: null,
    exchange: null,
    isin: null,
    matchMethod: "unresolved",
    confidence: 0,
    warnings,
  });
}

function rowToResolved(
  row: EodhdIdMappingRow | EodhdSearchRow,
  matchMethod: ResolvedInstrument["matchMethod"],
  confidence: number,
  inputIsin: string | null,
  warnings: string[] = [],
): ResolvedInstrument {
  return providerRowToResolved(row, matchMethod, confidence, inputIsin, warnings);
}

/** Picks the best row when EODHD returns multiple listings for one ISIN. */
function disambiguateRows<T extends EodhdIdMappingRow | EodhdSearchRow>(
  rows: T[],
  preferredExchange: string | null,
): { best: T | null; ambiguous: T[] } {
  if (rows.length === 0) return { best: null, ambiguous: [] };
  if (rows.length === 1) return { best: rows[0], ambiguous: [] };

  if (preferredExchange) {
    const onExchange = rows.filter((row) =>
      providerExchangesMatch(row.Exchange, preferredExchange),
    );
    if (onExchange.length === 1) {
      return { best: onExchange[0], ambiguous: [] };
    }
    if (onExchange.length > 1) {
      return { best: null, ambiguous: onExchange };
    }
  }

  return { best: null, ambiguous: rows };
}

function normalizeSearchName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function externalResultUsable(result: ResolvedInstrument): boolean {
  return (
    Boolean(result.providerSymbol) ||
    (result.candidates?.length ?? 0) > 0 ||
    result.warnings.includes(MATCHING_UNAVAILABLE_WARNING)
  );
}

function appendWarnings(
  resolved: ResolvedInstrument,
  extraWarnings: Array<string | null | undefined>,
): ResolvedInstrument {
  const warnings = [
    ...extraWarnings.filter((warning): warning is string => Boolean(warning)),
    ...resolved.warnings,
  ];
  return {
    ...resolved,
    warnings: [...new Set(warnings)],
  };
}

async function buildTickerListingCandidates(
  ticker: string,
  instrumentName: string | null,
  limit = 6,
  userIsin: string | null = null,
): Promise<ResolvedInstrument[]> {
  const searchRows = await safeFetchSearch(ticker, { limit: 15 });
  if (!searchRows) return [];

  const exactCodeRows = searchRows.filter(
    (row) => row.Code?.trim().toUpperCase() === ticker,
  );
  const rows = (exactCodeRows.length > 0 ? exactCodeRows : searchRows).filter(
    (row) => !listingRowConflictsIsin(row, userIsin),
  );

  const scored = rows
    .map((row) => ({
      row,
      score: instrumentName
        ? nameSimilarity(instrumentName, row.Name ?? "")
        : row.Code?.trim().toUpperCase() === ticker
          ? 1
          : 0.5,
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ row, score }) =>
    rowToResolved(row, "ticker_exchange", Math.max(0.55, score * 0.75), normalizeIsin(row.ISIN) ?? userIsin, [
      "Possible listing",
    ]),
  );
}

function unresolvedWithCandidates(
  warnings: string[],
  candidates: ResolvedInstrument[],
): ResolvedInstrument {
  if (candidates.length === 0) {
    return unresolved(warnings);
  }

  return finalize({
    ...unresolved(warnings),
    candidates,
  });
}

function nameSimilarity(a: string, b: string): number {
  const left = normalizeSearchName(a);
  const right = normalizeSearchName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.85;
  const leftWords = new Set(left.split(" "));
  const rightWords = right.split(" ").filter((word) => leftWords.has(word));
  if (rightWords.length === 0) return 0;
  return Math.min(0.75, rightWords.length / Math.max(leftWords.size, 1));
}

async function resolveByTickerAndExchange(
  ticker: string,
  exchange: string,
  instrumentName: string | null = null,
  userIsin: string | null = null,
): Promise<ResolvedInstrument> {
  const normalizedExchange = resolveExchangeForMatching(exchange);
  if (!normalizedExchange) {
    return unresolved(["Exchange could not be normalized for ticker lookup."]);
  }

  const providerCandidate = buildProviderSymbol(ticker, normalizedExchange);

  const mapped = await safeFetchIdMapping({ symbol: providerCandidate });
  if (mapped === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const mappedForUser = mapped.filter(
    (row) => !listingRowConflictsIsin(row, userIsin),
  );

  const { best, ambiguous } = disambiguateRows(mappedForUser, normalizedExchange);
  if (best) {
    return rowToResolved(best, "ticker_exchange", 0.92, normalizeIsin(best.ISIN));
  }
  if (ambiguous.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple listings match this ticker and exchange — confirm the instrument.",
      ]),
      candidates: ambiguous.map((row) =>
        rowToResolved(row, "ticker_exchange", 0.65, normalizeIsin(row.ISIN), [
          "Possible match",
        ]),
      ),
    });
  }

  const searchRows = await safeFetchSearch(ticker, {
    exchange: normalizedExchange,
    limit: 10,
  });
  if (searchRows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const exchangeMatchedRows = searchRows.filter(
    (row) =>
      providerExchangesMatch(row.Exchange, normalizedExchange) &&
      !listingRowConflictsIsin(row, userIsin),
  );

  if (exchangeMatchedRows.length === 0) {
    return unresolvedWithCandidates(
      [`No listing found for ${ticker} on ${normalizedExchange}.`],
      await buildTickerListingCandidates(ticker, instrumentName, 6, userIsin),
    );
  }

  const exactCode = exchangeMatchedRows.filter(
    (row) => row.Code?.trim().toUpperCase() === ticker,
  );

  const { best: searchBest, ambiguous: searchAmbiguous } = disambiguateRows(
    exactCode.length > 0 ? exactCode : exchangeMatchedRows,
    normalizedExchange,
  );

  if (searchBest) {
    const confidence =
      searchBest.Code?.trim().toUpperCase() === ticker ? 0.88 : 0.75;
    return rowToResolved(
      searchBest,
      "ticker_exchange",
      confidence,
      normalizeIsin(searchBest.ISIN),
      confidence < CONFIRMATION_THRESHOLD
        ? ["Ticker match may not be exact — confirm before saving."]
        : [],
    );
  }

  if (searchAmbiguous.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple instruments match this ticker — confirm the listing.",
      ]),
      candidates: searchAmbiguous.map((row) =>
        rowToResolved(row, "ticker_exchange", 0.6, normalizeIsin(row.ISIN), [
          "Possible match",
        ]),
      ),
    });
  }

  return unresolvedWithCandidates(
    [`No listing found for ${ticker} on ${normalizedExchange}.`],
      await buildTickerListingCandidates(ticker, instrumentName, 6, userIsin),
  );
}

async function resolveByTickerOnly(
  ticker: string,
  instrumentName: string | null,
  userIsin: string | null = null,
): Promise<ResolvedInstrument> {
  const searchRows = await safeFetchSearch(ticker, { limit: 15 });
  if (searchRows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const exactCodeRows = searchRows.filter(
    (row) =>
      row.Code?.trim().toUpperCase() === ticker &&
      !listingRowConflictsIsin(row, userIsin),
  );

  if (exactCodeRows.length === 1) {
    return rowToResolved(
      exactCodeRows[0],
      "ticker_exchange",
      0.9,
      normalizeIsin(exactCodeRows[0].ISIN),
    );
  }

  if (exactCodeRows.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple listings match this ticker — confirm the exchange.",
      ]),
      candidates: exactCodeRows.map((row) =>
        rowToResolved(row, "ticker_exchange", 0.65, normalizeIsin(row.ISIN), [
          "Possible listing",
        ]),
      ),
    });
  }

  if (instrumentName) {
    return resolveByTickerWithNameHint(ticker, instrumentName);
  }

  return unresolved([
    `No EODHD listing found for ticker ${ticker}. Add an ISIN or exchange to resolve.`,
  ]);
}

/**
 * Backward-compatible seed lookup when only ticker + name are known
 * (demo portfolio in holdings.ts). Uses exact ticker matches ranked by name.
 */
async function resolveByTickerWithNameHint(
  ticker: string,
  instrumentName: string,
): Promise<ResolvedInstrument> {
  const searchRows = await safeFetchSearch(ticker, { limit: 15 });
  if (searchRows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const exactCodeRows = searchRows.filter(
    (row) => row.Code?.trim().toUpperCase() === ticker,
  );
  const candidates = exactCodeRows.length > 0 ? exactCodeRows : searchRows;

  const scored = candidates
    .map((row) => ({
      row,
      score: nameSimilarity(instrumentName, row.Name ?? ""),
    }))
    .filter((item) => item.score >= 0.45)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return unresolved([
      `No EODHD listing found for ticker ${ticker}. Add an ISIN or exchange to resolve.`,
    ]);
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((item) => item.score === topScore);

  if (topMatches.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple listings match this ticker — add an ISIN or exchange to confirm.",
      ]),
      candidates: topMatches.map(({ row, score }) =>
        rowToResolved(
          row,
          "ticker_exchange",
          score * 0.85,
          normalizeIsin(row.ISIN),
          ["Possible match"],
        ),
      ),
    });
  }

  const confidence = Math.min(0.86, topScore * 0.9);
  return rowToResolved(
    scored[0].row,
    "ticker_exchange",
    confidence,
    normalizeIsin(scored[0].row.ISIN),
    confidence < CONFIRMATION_THRESHOLD
      ? ["Matched by ticker and name — confirm before saving."]
      : [],
  );
}

async function resolveByNameAndExchange(
  instrumentName: string,
  exchange: string,
  ticker: string | null = null,
): Promise<ResolvedInstrument> {
  const normalizedExchange = resolveExchangeForMatching(exchange);
  if (!normalizedExchange) {
    return unresolved(["Exchange could not be normalized for name lookup."]);
  }

  const searchRows = await safeFetchSearch(instrumentName, {
    exchange: normalizedExchange,
    limit: 10,
  });
  if (searchRows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  if (searchRows.length === 0) {
    const candidates = ticker
      ? await buildTickerListingCandidates(ticker, instrumentName, 6, null)
      : [];
    return unresolvedWithCandidates(
      [`No listing found for "${instrumentName}" on ${normalizedExchange}.`],
      candidates,
    );
  }

  const scored = searchRows
    .map((row) => ({
      row,
      score: nameSimilarity(instrumentName, row.Name ?? ""),
    }))
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return unresolved([
      `No close name match for "${instrumentName}" on ${normalizedExchange}.`,
    ]);
  }

  const topScore = scored[0].score;
  const topMatches = scored.filter((item) => item.score === topScore);

  if (topMatches.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple instruments match this name — confirm the correct listing.",
      ]),
      candidates: topMatches.map(({ row, score }) =>
        rowToResolved(
          row,
          "name_exchange",
          score * 0.8,
          normalizeIsin(row.ISIN),
          ["Possible match"],
        ),
      ),
    });
  }

  const confidence = Math.min(0.84, topScore * 0.9);
  return rowToResolved(
    scored[0].row,
    "name_exchange",
    confidence,
    normalizeIsin(scored[0].row.ISIN),
    ["Matched by instrument name — confirm before saving."],
  );
}

/**
 * Resolves a single instrument using verified mappings first, then
 * ISIN → ticker+exchange → name via EODHD when the instrument circuit allows.
 */
export async function matchInstrument(
  input: InstrumentMatchInput,
): Promise<ResolvedInstrument> {
  if (input.assetType === "cash") {
    return unresolved([]);
  }

  const ticker = cleanTicker(input.ticker);
  const isin = normalizeIsin(input.isin);
  const rawExchange = input.exchange?.trim().toUpperCase() || null;
  const exchange = resolveExchangeForMatching(rawExchange);
  const exchangeWarning = exchangeResolutionMessage(rawExchange);
  const instrumentName = cleanName(input.instrumentName);
  const instrumentUnavailable = isEodhdInstrumentQuotaExhausted();

  let effectiveIsin = isin;
  let effectiveTicker = ticker;
  if (!effectiveIsin && isValidIsin(ticker)) {
    effectiveIsin = normalizeIsin(ticker);
    effectiveTicker = "";
  }

  // 1. Exact provider symbol input.
  if (looksLikeProviderSymbolInput(effectiveTicker)) {
    const parsed = parseProviderSymbolInput(effectiveTicker);
    if (parsed.ok) {
      const verified = lookupVerifiedByProviderSymbol(parsed.providerSymbol);
      const resolved = verified
        ? verifiedEntryToResolved(verified, "ticker_exchange")
        : parsed.resolved;
      return appendWarnings(resolved, [exchangeWarning]);
    }
  }

  // 2. Ticker + purchase exchange alias (e.g. Tradegate → Xetra pricing).
  if (effectiveTicker && rawExchange) {
    const purchaseMatch = lookupVerifiedByTickerPurchaseExchange(
      effectiveTicker,
      rawExchange,
    );
    if (purchaseMatch) {
      const purchaseIsin = normalizeIsin(purchaseMatch.entry.isin);
      if (!effectiveIsin || !purchaseIsin || purchaseIsin === effectiveIsin) {
        return appendWarnings(
          verifiedEntryToResolved(purchaseMatch.entry, "ticker_exchange", {
            purchaseExchange: purchaseMatch.purchaseExchange,
          }),
          [exchangeWarning],
        );
      }
    }
  }

  // 3. Ticker + normalized exchange against verified mappings.
  if (effectiveTicker && exchange) {
    const verified = lookupVerifiedByTickerExchange(effectiveTicker, exchange);
    if (verified) {
      const verifiedIsin = normalizeIsin(verified.isin);
      if (!effectiveIsin || !verifiedIsin || verifiedIsin === effectiveIsin) {
        return appendWarnings(
          verifiedEntryToResolved(verified, "ticker_exchange"),
          [exchangeWarning],
        );
      }
    }
  }

  // 4. ISIN + explicitly selected venue against verified mappings.
  if (effectiveIsin && exchange) {
    const verified = lookupVerifiedByIsin(effectiveIsin, exchange);
    if (verified) {
      return appendWarnings(
        verifiedEntryToResolved(verified, "isin", {
          purchaseExchange: resolveVerifiedPurchaseExchange(rawExchange, verified),
        }),
        [exchangeWarning],
      );
    }
  }

  // 5. ISIN-first provider discovery. Registry listings are merged as enrichment.
  if (effectiveIsin) {
    const discovered = await discoverListingsForIsin({
      isin: effectiveIsin,
      ticker: effectiveTicker || null,
      instrumentName: instrumentName || null,
      preferredExchange: exchange,
    });
    const resolved = resolveDiscoveredIsinListings(
      discovered.listings,
      exchange,
    );
    if (discovered.providerUnavailable && discovered.listings.length === 0) {
      return appendWarnings(unresolved([MATCHING_UNAVAILABLE_WARNING]), [
        exchangeWarning,
      ]);
    }
    if (externalResultUsable(resolved)) {
      return appendWarnings(resolved, [exchangeWarning]);
    }
    if (discovered.providerUnavailable) {
      const verifiedOnly = listVerifiedByIsin(effectiveIsin);
      if (verifiedOnly.length > 0) {
        return appendWarnings(
          resolveDiscoveredIsinListings(
            verifiedOnly.map((entry) => verifiedEntryToResolved(entry, "isin")),
            exchange,
          ),
          [exchangeWarning, MATCHING_UNAVAILABLE_WARNING],
        );
      }
    }
  }

  if (effectiveTicker && exchange && !instrumentUnavailable) {
    const result = await resolveByTickerAndExchange(
      effectiveTicker,
      exchange,
      instrumentName || null,
      effectiveIsin,
    );
    if (externalResultUsable(result)) {
      return appendWarnings(result, [exchangeWarning]);
    }
  }

  if (effectiveTicker && !instrumentUnavailable) {
    const tickerOnly = await resolveByTickerOnly(
      effectiveTicker,
      instrumentName || null,
      effectiveIsin,
    );
    if (externalResultUsable(tickerOnly)) {
      return appendWarnings(tickerOnly, [exchangeWarning]);
    }
  }

  if (instrumentName && exchange && !instrumentUnavailable) {
    const result = await resolveByNameAndExchange(
      instrumentName,
      exchange,
      effectiveTicker || null,
    );
    if (externalResultUsable(result)) {
      return appendWarnings(result, [exchangeWarning]);
    }
  }

  if (instrumentName && effectiveTicker && !exchange && !instrumentUnavailable) {
    const result = await resolveByTickerWithNameHint(
      effectiveTicker,
      instrumentName,
    );
    if (externalResultUsable(result)) {
      return appendWarnings(result, [exchangeWarning]);
    }
  }

  const warnings: string[] = [];
  if (exchangeWarning) {
    warnings.push(exchangeWarning);
  }
  if (!effectiveIsin && !effectiveTicker && !instrumentName) {
    warnings.push("No ISIN, ticker, or instrument name was provided.");
  } else if (effectiveTicker && !exchange && !exchangeWarning) {
    warnings.push(
      "Ticker provided without exchange — add an exchange or an ISIN to resolve.",
    );
  } else if (instrumentName && !exchange && !exchangeWarning) {
    warnings.push(
      "Instrument name provided without exchange — add an exchange or an ISIN to resolve.",
    );
  } else if (instrumentUnavailable) {
    warnings.push(MATCHING_UNAVAILABLE_WARNING);
  } else {
    warnings.push("Could not match this holding to a listed instrument.");
  }

  const candidates =
    effectiveTicker !== "" && !instrumentUnavailable
      ? await buildTickerListingCandidates(
          effectiveTicker,
          instrumentName || null,
          6,
          effectiveIsin,
        )
      : [];

  return unresolvedWithCandidates(warnings, candidates);
}

/** Resolves multiple instruments with bounded concurrency. */
export async function matchInstruments(
  inputs: InstrumentMatchInput[],
  concurrency = 3,
): Promise<InstrumentMatchResult[]> {
  const results: InstrumentMatchResult[] = new Array(inputs.length);
  let index = 0;

  async function worker() {
    while (index < inputs.length) {
      const current = index;
      index += 1;
      const input = inputs[current];
      const resolved = await matchInstrument(input);
      results[current] = { input, resolved };
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, inputs.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}
