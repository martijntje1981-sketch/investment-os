/**
 * Instrument Match Engine
 *
 * Resolves raw import identifiers to canonical EODHD provider symbols.
 * Reusable by screenshot OCR, CSV import, manual entry, and future brokers.
 *
 * Resolution priority (strict order):
 *   1. ISIN  → EODHD ID Mapping
 *   2. Ticker + Exchange → ID Mapping / Search
 *   3. Instrument Name + Exchange → Search
 *
 * Never invents missing tickers or provider symbols.
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
  isEodhdQuotaExhausted,
  markEodhdQuotaExhausted,
} from "./eodhdQuotaGuard";
import { exchangesMatch, normalizeExchange } from "./exchangeNormalizer";
import { isValidIsin, normalizeIsin } from "./validation";
import type {
  InstrumentMatchInput,
  InstrumentMatchResult,
  ResolvedInstrument,
} from "@/lib/types/instrument";

/** Minimum confidence below which user confirmation is required. */
const CONFIRMATION_THRESHOLD = 0.85;

const MATCHING_UNAVAILABLE_WARNING =
  "Instrument lookup is temporarily unavailable — confirm this holding manually.";

function handleProviderFailure(error: unknown): void {
  if (isEodhdQuotaOrRateLimitError(error)) {
    markEodhdQuotaExhausted();
  }
}

async function safeFetchIdMapping(
  filters: Parameters<typeof fetchIdMapping>[0],
): Promise<EodhdIdMappingRow[] | null> {
  if (isEodhdQuotaExhausted()) {
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
  if (isEodhdQuotaExhausted()) {
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
  const code = row.Code?.trim().toUpperCase() ?? "";
  const exchange = normalizeExchange(row.Exchange) ?? row.Exchange?.trim().toUpperCase() ?? null;
  const providerSymbol =
    code && exchange ? buildProviderSymbol(code, exchange) : null;

  return finalize({
    providerSymbol,
    instrumentName: row.Name?.trim() ?? null,
    exchange,
    isin: normalizeIsin(row.ISIN) ?? inputIsin,
    matchMethod,
    confidence,
    warnings,
  });
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
      exchangesMatch(row.Exchange, preferredExchange),
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

async function resolveByIsin(
  isin: string,
  preferredExchange: string | null,
): Promise<ResolvedInstrument> {
  const rows = await safeFetchIdMapping({ isin });
  if (rows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const { best, ambiguous } = disambiguateRows(rows, preferredExchange);

  if (best) {
    return rowToResolved(best, "isin", 0.97, isin);
  }

  if (ambiguous.length > 1) {
    return finalize({
      ...unresolved([
        "Multiple listings found for this ISIN — confirm the exchange.",
      ]),
      isin,
      candidates: ambiguous.map((row) =>
        rowToResolved(row, "isin", 0.6, isin, ["Possible listing"]),
      ),
    });
  }

  return unresolved(["No EODHD listing found for this ISIN."]);
}

async function resolveByTickerAndExchange(
  ticker: string,
  exchange: string,
): Promise<ResolvedInstrument> {
  const normalizedExchange = normalizeExchange(exchange);
  if (!normalizedExchange) {
    return unresolved(["Exchange could not be normalized for ticker lookup."]);
  }

  const providerCandidate = buildProviderSymbol(ticker, normalizedExchange);

  const mapped = await safeFetchIdMapping({ symbol: providerCandidate });
  if (mapped === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const { best, ambiguous } = disambiguateRows(mapped, normalizedExchange);
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

  const exactCode = searchRows.filter(
    (row) =>
      row.Code?.trim().toUpperCase() === ticker &&
      exchangesMatch(row.Exchange, normalizedExchange),
  );

  const { best: searchBest, ambiguous: searchAmbiguous } = disambiguateRows(
    exactCode.length > 0 ? exactCode : searchRows,
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

  return unresolved([
    `No EODHD listing found for ${ticker} on ${normalizedExchange}.`,
  ]);
}

async function resolveByTickerOnly(
  ticker: string,
  instrumentName: string | null,
): Promise<ResolvedInstrument> {
  const searchRows = await safeFetchSearch(ticker, { limit: 15 });
  if (searchRows === null) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const exactCodeRows = searchRows.filter(
    (row) => row.Code?.trim().toUpperCase() === ticker,
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
): Promise<ResolvedInstrument> {
  const normalizedExchange = normalizeExchange(exchange);
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
    return unresolved([
      `No EODHD listing found for "${instrumentName}" on ${normalizedExchange}.`,
    ]);
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
 * Resolves a single instrument using the strict ISIN → ticker → name cascade.
 * Cash holdings are skipped and returned as unresolved without API calls.
 */
export async function matchInstrument(
  input: InstrumentMatchInput,
): Promise<ResolvedInstrument> {
  if (input.assetType === "cash") {
    return unresolved([]);
  }

  if (isEodhdQuotaExhausted()) {
    return unresolved([MATCHING_UNAVAILABLE_WARNING]);
  }

  const ticker = cleanTicker(input.ticker);
  const isin = normalizeIsin(input.isin);
  const exchange = normalizeExchange(input.exchange);
  const instrumentName = cleanName(input.instrumentName);

  // Guard: if ticker looks like an ISIN, treat it as ISIN — never as ticker.
  let effectiveIsin = isin;
  let effectiveTicker = ticker;
  if (!effectiveIsin && isValidIsin(ticker)) {
    effectiveIsin = normalizeIsin(ticker);
    effectiveTicker = "";
  }

  // 1. ISIN — primary path via EODHD ID Mapping.
  if (effectiveIsin) {
    return resolveByIsin(effectiveIsin, exchange);
  }

  // 2. Ticker + Exchange.
  if (effectiveTicker && exchange) {
    return resolveByTickerAndExchange(effectiveTicker, exchange);
  }

  // 3. Instrument Name + Exchange.
  if (instrumentName && exchange) {
    return resolveByNameAndExchange(instrumentName, exchange);
  }

  // Ticker without exchange — try a unique listing before asking the user.
  if (effectiveTicker && !exchange) {
    const tickerOnly = await resolveByTickerOnly(
      effectiveTicker,
      instrumentName || null,
    );
    if (tickerOnly.providerSymbol || (tickerOnly.candidates?.length ?? 0) > 0) {
      return tickerOnly;
    }
  }

  // Demo-seed fallback: ticker + name without exchange (holdings.ts seed data).
  if (effectiveTicker && instrumentName && !exchange) {
    return resolveByTickerWithNameHint(effectiveTicker, instrumentName);
  }

  const warnings: string[] = [];
  if (!effectiveIsin && !effectiveTicker && !instrumentName) {
    warnings.push("No ISIN, ticker, or instrument name was provided.");
  } else if (effectiveTicker && !exchange) {
    warnings.push(
      "Ticker provided without exchange — add an exchange or an ISIN to resolve.",
    );
  } else if (instrumentName && !exchange) {
    warnings.push(
      "Instrument name provided without exchange — add an exchange or an ISIN to resolve.",
    );
  } else {
    warnings.push("Insufficient identifiers to resolve this instrument.");
  }

  return unresolved(warnings);
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
