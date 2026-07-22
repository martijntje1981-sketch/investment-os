/**
 * Central verified instrument mappings for supported EODHD listings.
 * Used before external provider search so known holdings match offline.
 */

import { buildProviderSymbol } from "@/lib/services/instruments/eodhdClient";
import {
  exchangesMatch,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";
import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export type VerifiedInstrumentEntry = {
  ticker: string;
  exchange: string;
  providerSymbol: string;
  instrumentName: string;
  isin?: string | null;
};

const VERIFIED_INSTRUMENTS: VerifiedInstrumentEntry[] = [
  {
    ticker: "STRC",
    exchange: "AS",
    providerSymbol: "STRC.AS",
    instrumentName: "21Shares Strategy Yield ETP",
    isin: "NL0015001K93",
  },
  {
    ticker: "AIFS",
    exchange: "XETRA",
    providerSymbol: "AIFS.XETRA",
    instrumentName: "iShares AI Infrastructure UCITS ETF",
  },
  {
    ticker: "NUKL",
    exchange: "XETRA",
    providerSymbol: "NUKL.XETRA",
    instrumentName: "VanEck Uranium and Nuclear ETF",
    isin: "IE000M7V94E1",
  },
  {
    ticker: "VWCE",
    exchange: "XETRA",
    providerSymbol: "VWCE.XETRA",
    instrumentName: "Vanguard FTSE All-World UCITS ETF",
    isin: "IE00BK5BQT80",
  },
  {
    ticker: "IB1T",
    exchange: "XETRA",
    providerSymbol: "IB1T.XETRA",
    instrumentName: "iShares Bitcoin ETP",
  },
];

const byProviderSymbol = new Map<string, VerifiedInstrumentEntry>();
const byIsin = new Map<string, VerifiedInstrumentEntry[]>();
const byTickerExchange = new Map<string, VerifiedInstrumentEntry>();

function tickerExchangeKey(ticker: string, exchange: string): string {
  return `${ticker.trim().toUpperCase()}@${exchange.trim().toUpperCase()}`;
}

for (const entry of VERIFIED_INSTRUMENTS) {
  byProviderSymbol.set(entry.providerSymbol.toUpperCase(), entry);

  const key = tickerExchangeKey(entry.ticker, entry.exchange);
  byTickerExchange.set(key, entry);

  if (entry.isin) {
    const normalizedIsin = normalizeIsin(entry.isin);
    if (normalizedIsin) {
      const existing = byIsin.get(normalizedIsin) ?? [];
      existing.push(entry);
      byIsin.set(normalizedIsin, existing);
    }
  }
}

export function listVerifiedInstruments(): readonly VerifiedInstrumentEntry[] {
  return VERIFIED_INSTRUMENTS;
}

export function lookupVerifiedByProviderSymbol(
  providerSymbol: string | null | undefined,
): VerifiedInstrumentEntry | null {
  const normalized = providerSymbol?.trim().toUpperCase();
  if (!normalized) return null;
  return byProviderSymbol.get(normalized) ?? null;
}

export function lookupVerifiedByIsin(
  isin: string | null | undefined,
  preferredExchange?: string | null,
): VerifiedInstrumentEntry | null {
  const normalizedIsin = normalizeIsin(isin);
  if (!normalizedIsin) return null;

  const entries = byIsin.get(normalizedIsin);
  if (!entries || entries.length === 0) return null;
  if (entries.length === 1) return entries[0]!;

  const normalizedExchange = resolveExchangeForMatching(preferredExchange);
  if (normalizedExchange) {
    const onExchange = entries.find((entry) =>
      exchangesMatch(entry.exchange, normalizedExchange),
    );
    if (onExchange) return onExchange;
  }

  return null;
}

export function lookupVerifiedByTickerExchange(
  ticker: string | null | undefined,
  exchange: string | null | undefined,
): VerifiedInstrumentEntry | null {
  const normalizedTicker = ticker?.trim().toUpperCase();
  const normalizedExchange = resolveExchangeForMatching(exchange);
  if (!normalizedTicker || !normalizedExchange) return null;

  return byTickerExchange.get(tickerExchangeKey(normalizedTicker, normalizedExchange)) ?? null;
}

export type VerifiedInstrumentLookupInput = {
  ticker?: string | null;
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
};

/** Resolves a verified entry using ISIN → providerSymbol → ticker+exchange order. */
export function lookupVerifiedInstrument(
  input: VerifiedInstrumentLookupInput,
): VerifiedInstrumentEntry | null {
  const byIsinMatch = lookupVerifiedByIsin(input.isin, input.exchange);
  if (byIsinMatch) return byIsinMatch;

  const bySymbol = lookupVerifiedByProviderSymbol(input.providerSymbol);
  if (bySymbol) return bySymbol;

  return lookupVerifiedByTickerExchange(input.ticker, input.exchange);
}

export function verifiedEntryToResolved(
  entry: VerifiedInstrumentEntry,
  matchMethod: ResolvedInstrument["matchMethod"] = entry.isin
    ? "isin"
    : "ticker_exchange",
): ResolvedInstrument {
  const confirmationSource: ListingConfirmationSource = "verified_mapping";

  return {
    providerSymbol: entry.providerSymbol,
    instrumentName: entry.instrumentName,
    exchange: entry.exchange,
    isin: entry.isin ?? null,
    matchMethod,
    confirmationSource,
    confidence: 0.99,
    requiresConfirmation: false,
    warnings: [],
  };
}

export function isSupportedVerifiedProviderSymbol(
  providerSymbol: string | null | undefined,
): boolean {
  return lookupVerifiedByProviderSymbol(providerSymbol) !== null;
}

/** Validates ticker/exchange and returns canonical provider symbol when verified. */
export function buildVerifiedProviderSymbol(
  ticker: string,
  exchange: string,
): string | null {
  const entry = lookupVerifiedByTickerExchange(ticker, exchange);
  if (!entry) return null;
  return buildProviderSymbol(entry.ticker, entry.exchange);
}
