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
import type { PriceCurrency } from "@/lib/services/prices/types";

export type VerifiedInstrumentEntry = {
  ticker: string;
  /** Canonical EODHD pricing exchange code. */
  exchange: string;
  providerSymbol: string;
  instrumentName: string;
  isin?: string | null;
  /** Purchase venues that map to this instrument but quote on {@link exchange}. */
  purchaseExchangeAliases?: readonly string[];
  /**
   * EODHD quote denomination when the provider omits `currency` on the wire.
   * Exchange suffix alone is not always reliable (e.g. STRC.AS is USD).
   */
  quoteCurrency?: PriceCurrency;
  /** Documents why {@link quoteCurrency} overrides exchange inference. */
  quoteCurrencyNote?: string;
};

const VERIFIED_INSTRUMENTS: VerifiedInstrumentEntry[] = [
  {
    ticker: "STRC",
    exchange: "AS",
    providerSymbol: "STRC.AS",
    instrumentName: "21Shares Strategy Yield ETP",
    isin: "NL0015001K93",
    quoteCurrency: "USD",
    quoteCurrencyNote:
      "EODHD real-time STRC.AS quotes omit currency but are USD-denominated; convert to EUR via FX.",
  },
  {
    ticker: "AIFS",
    exchange: "XETRA",
    providerSymbol: "AIFS.XETRA",
    instrumentName: "iShares AI Infrastructure UCITS ETF",
    quoteCurrency: "EUR",
    quoteCurrencyNote: "EODHD listing Currency for this XETRA symbol.",
  },
  {
    ticker: "NUKL",
    exchange: "XETRA",
    providerSymbol: "NUKL.XETRA",
    instrumentName: "VanEck Uranium and Nuclear ETF",
    isin: "IE000M7V94E1",
    quoteCurrency: "EUR",
    quoteCurrencyNote: "EODHD listing Currency for this XETRA symbol.",
  },
  {
    ticker: "VWCE",
    exchange: "XETRA",
    providerSymbol: "VWCE.XETRA",
    instrumentName: "Vanguard FTSE All-World UCITS ETF",
    isin: "IE00BK5BQT80",
    quoteCurrency: "EUR",
    quoteCurrencyNote: "EODHD listing Currency for this XETRA symbol.",
  },
  {
    ticker: "IB1T",
    exchange: "XETRA",
    providerSymbol: "IB1T.XETRA",
    instrumentName: "iShares Bitcoin ETP",
    quoteCurrency: "EUR",
    quoteCurrencyNote: "EODHD listing Currency for this XETRA symbol.",
  },
  {
    ticker: "4COP",
    exchange: "XETRA",
    providerSymbol: "4COP.XETRA",
    instrumentName: "Global X Copper Miners UCITS ETF",
    isin: "IE0003Z9E2Y3",
    purchaseExchangeAliases: ["TDG", "TRADEGATE", "TG"],
    quoteCurrency: "EUR",
    quoteCurrencyNote: "EODHD listing Currency for this XETRA symbol.",
  },
];

const PURCHASE_EXCHANGE_ALIASES: Record<string, string> = {
  TDG: "TDG",
  TRADEGATE: "TDG",
  TG: "TDG",
  TRADEGATEBSX: "TDG",
};

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

/** Normalizes broker purchase venue labels (e.g. Tradegate → TDG). */
export function normalizePurchaseExchange(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return null;

  return PURCHASE_EXCHANGE_ALIASES[cleaned] ?? cleaned;
}

function entryMatchesPurchaseExchange(
  entry: VerifiedInstrumentEntry,
  rawExchange: string | null | undefined,
): boolean {
  const purchaseExchange = normalizePurchaseExchange(rawExchange);
  if (!purchaseExchange || !entry.purchaseExchangeAliases?.length) {
    return false;
  }

  return entry.purchaseExchangeAliases.some(
    (alias) => normalizePurchaseExchange(alias) === purchaseExchange,
  );
}

export function resolveVerifiedPurchaseExchange(
  rawExchange: string | null | undefined,
  entry: VerifiedInstrumentEntry,
): string | null {
  if (!entryMatchesPurchaseExchange(entry, rawExchange)) {
    return null;
  }

  return normalizePurchaseExchange(rawExchange);
}

export function lookupVerifiedByTickerPurchaseExchange(
  ticker: string | null | undefined,
  rawExchange: string | null | undefined,
): { entry: VerifiedInstrumentEntry; purchaseExchange: string } | null {
  const normalizedTicker = ticker?.trim().toUpperCase();
  const purchaseExchange = normalizePurchaseExchange(rawExchange);
  if (!normalizedTicker || !purchaseExchange) return null;

  for (const entry of VERIFIED_INSTRUMENTS) {
    if (entry.ticker.toUpperCase() !== normalizedTicker) continue;
    if (!entryMatchesPurchaseExchange(entry, purchaseExchange)) continue;
    return { entry, purchaseExchange };
  }

  return null;
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

export type VerifiedInstrumentResolution = {
  entry: VerifiedInstrumentEntry;
  purchaseExchange?: string | null;
};

/** Resolves a verified entry using ISIN → providerSymbol → ticker+exchange order. */
export function lookupVerifiedInstrument(
  input: VerifiedInstrumentLookupInput,
): VerifiedInstrumentEntry | null {
  return resolveVerifiedInstrument(input)?.entry ?? null;
}

export function resolveVerifiedInstrument(
  input: VerifiedInstrumentLookupInput,
): VerifiedInstrumentResolution | null {
  const byIsinMatch = lookupVerifiedByIsin(input.isin, input.exchange);
  if (byIsinMatch) {
    return {
      entry: byIsinMatch,
      purchaseExchange: resolveVerifiedPurchaseExchange(input.exchange, byIsinMatch),
    };
  }

  const bySymbol = lookupVerifiedByProviderSymbol(input.providerSymbol);
  if (bySymbol) {
    return {
      entry: bySymbol,
      purchaseExchange: resolveVerifiedPurchaseExchange(input.exchange, bySymbol),
    };
  }

  const byTickerExchange = lookupVerifiedByTickerExchange(input.ticker, input.exchange);
  if (byTickerExchange) {
    return { entry: byTickerExchange };
  }

  const byPurchaseExchange = lookupVerifiedByTickerPurchaseExchange(
    input.ticker,
    input.exchange,
  );
  if (byPurchaseExchange) {
    return {
      entry: byPurchaseExchange.entry,
      purchaseExchange: byPurchaseExchange.purchaseExchange,
    };
  }

  return null;
}

export function verifiedEntryToResolved(
  entry: VerifiedInstrumentEntry,
  matchMethod: ResolvedInstrument["matchMethod"] = entry.isin
    ? "isin"
    : "ticker_exchange",
  options?: { purchaseExchange?: string | null },
): ResolvedInstrument {
  const confirmationSource: ListingConfirmationSource = "verified_mapping";
  const purchaseExchange = options?.purchaseExchange?.trim().toUpperCase() ?? null;
  const usesAlternatePricing =
    Boolean(purchaseExchange) && !exchangesMatch(purchaseExchange, entry.exchange);

  return {
    providerSymbol: entry.providerSymbol,
    instrumentName: entry.instrumentName,
    exchange: usesAlternatePricing ? purchaseExchange : entry.exchange,
    pricingExchange: usesAlternatePricing ? entry.exchange : null,
    isin: entry.isin ?? null,
    quoteCurrency: entry.quoteCurrency ?? null,
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

export { resolveQuoteCurrencyForProviderSymbol } from "@/lib/services/instruments/quoteCurrency";
