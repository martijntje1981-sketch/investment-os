import { buildProviderSymbol } from "@/lib/services/instruments/eodhdClient";
import type { ListingConfirmationSource } from "@/lib/services/instruments/listingConfirmationSource";
import {
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export type ParsedProviderSymbol =
  | {
      ok: true;
      providerSymbol: string;
      ticker: string;
      exchange: string;
      confirmationSource: ListingConfirmationSource;
      resolved: ResolvedInstrument;
    }
  | {
      ok: false;
      message: string;
    };

/** True when input looks like a provider symbol (TICKER.EXCHANGE), not a plain ticker. */
export function looksLikeProviderSymbolInput(
  value: string | null | undefined,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  const dotIndex = trimmed.indexOf(".");
  return dotIndex > 0 && dotIndex < trimmed.length - 1;
}

/**
 * Parses and validates a full provider symbol such as VWCE.XETRA.
 * Does not call the provider API — validates structure and known exchange codes.
 */
export function parseProviderSymbolInput(
  value: string | null | undefined,
): ParsedProviderSymbol {
  const trimmed = value?.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter a ticker or provider symbol." };
  }

  if (!looksLikeProviderSymbolInput(trimmed)) {
    return {
      ok: false,
      message: "Expected format TICKER.EXCHANGE (for example VWCE.XETRA).",
    };
  }

  const dotIndex = trimmed.lastIndexOf(".");
  const ticker = trimmed.slice(0, dotIndex).trim().toUpperCase();
  const exchangeRaw = trimmed.slice(dotIndex + 1).trim();
  const exchange = resolveExchangeForMatching(exchangeRaw);

  if (!ticker || !/^[A-Z0-9][A-Z0-9.-]*$/.test(ticker)) {
    return { ok: false, message: "Ticker part of the provider symbol is invalid." };
  }

  if (!exchange) {
    return {
      ok: false,
      message: `Exchange "${exchangeRaw}" is not a recognized provider exchange code.`,
    };
  }

  const providerSymbol = buildProviderSymbol(ticker, exchange);

  return {
    ok: true,
    providerSymbol,
    ticker,
    exchange,
    confirmationSource: "manual_exact_listing",
    resolved: {
      providerSymbol,
      instrumentName: null,
      exchange,
      isin: null,
      matchMethod: "ticker_exchange",
      confidence: 1,
      requiresConfirmation: false,
      warnings: [],
    },
  };
}
