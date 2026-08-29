/**
 * Live Market Pulse quotes via existing EODHD realtime path + shared quota guard.
 */

import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";
import { executeEodhdApiCall } from "@/lib/services/marketData/eodhdApiCall";
import type { MarketPulseQuoteResult } from "@/lib/services/marketPulse/buildMarketPulseSnapshot";
import {
  changesAreConsistent,
  computeChangeFromClose,
  isEodBackedProviderSymbol,
  sanitizeFiniteNumber,
  sanitizePrice,
  sanitizeTimestampSeconds,
} from "@/lib/services/marketPulse/quoteModel";
import type { MarketPulseQuoteChangePeriod } from "@/lib/services/marketPulse/types";

type EodhdRealtimeResponse = {
  code?: string;
  timestamp?: number;
  close?: number | string;
  previousClose?: number | string;
  change?: number | string;
  change_p?: number | string;
  currency?: string;
};

const quoteCache = new Map<
  string,
  { expiresAt: number; quote: MarketPulseQuoteResult }
>();

/** Realtime crypto / ETF proxies — short TTL. */
const REALTIME_QUOTE_TTL_MS = 60_000;
/** EOD-backed FX metals — do not poll every minute. */
const EOD_QUOTE_TTL_MS = 6 * 60 * 60 * 1000;

export function resetMarketPulseQuoteCacheForTests() {
  quoteCache.clear();
}

export function quoteCacheTtlMsForSymbol(providerSymbol: string): number {
  return isEodBackedProviderSymbol(providerSymbol)
    ? EOD_QUOTE_TTL_MS
    : REALTIME_QUOTE_TTL_MS;
}

function unavailableQuote(providerSymbol: string): MarketPulseQuoteResult {
  return {
    providerSymbol,
    price: null,
    previousClose: null,
    changeAmount: null,
    changePercent: null,
    changePeriod: "unavailable",
    currency: null,
    updatedAt: null,
    delayed: true,
    marketStatus: null,
    availability: "unavailable",
    quoteRefreshMode: isEodBackedProviderSymbol(providerSymbol)
      ? "eod"
      : "realtime",
  };
}

function resolveQuoteChange(input: {
  category: "crypto" | "other";
  price: number | null;
  previousClose: number | null;
  providerChange: number | null;
  providerChangePercent: number | null;
}): {
  changeAmount: number | null;
  changePercent: number | null;
  changePeriod: MarketPulseQuoteChangePeriod;
} {
  const computed = computeChangeFromClose(input.price, input.previousClose);

  if (input.category === "crypto") {
    if (input.providerChangePercent !== null) {
      const changeAmount =
        input.providerChange !== null
          ? input.providerChange
          : computed.changeAmount;
      if (
        changesAreConsistent(
          input.price,
          input.previousClose,
          changeAmount,
          input.providerChangePercent,
        ) ||
        input.previousClose === null
      ) {
        return {
          changeAmount,
          changePercent: input.providerChangePercent,
          changePeriod: "24h",
        };
      }
    }
    if (computed.changePercent !== null) {
      return {
        ...computed,
        changePeriod: "previous_close",
      };
    }
    return {
      changeAmount: null,
      changePercent: null,
      changePeriod: "unavailable",
    };
  }

  if (computed.changePercent !== null) {
    return {
      ...computed,
      changePeriod: "previous_close",
    };
  }
  if (input.providerChangePercent !== null) {
    return {
      changeAmount: input.providerChange,
      changePercent: input.providerChangePercent,
      changePeriod: "last_session",
    };
  }
  return {
    changeAmount: null,
    changePercent: null,
    changePeriod: "unavailable",
  };
}

export async function fetchMarketPulseRealtimeQuote(
  providerSymbol: string,
  options?: { category?: "crypto" | "other" },
): Promise<MarketPulseQuoteResult> {
  const cached = quoteCache.get(providerSymbol);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const category =
    options?.category ??
    (providerSymbol.endsWith(".CC") ? "crypto" : "other");
  const eodBacked = isEodBackedProviderSymbol(providerSymbol);
  const ttl = quoteCacheTtlMsForSymbol(providerSymbol);

  try {
    const apiKey = getEodhdApiKey();
    const data = await executeEodhdApiCall(async () => {
      const url =
        `https://eodhd.com/api/real-time/${encodeURIComponent(providerSymbol)}` +
        `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }
      return (await response.json()) as EodhdRealtimeResponse;
    });

    const price = sanitizePrice(data.close);
    const previousClose = sanitizePrice(data.previousClose);
    const providerChange = sanitizeFiniteNumber(data.change);
    const providerChangePercent = sanitizeFiniteNumber(data.change_p);
    const updatedAt = sanitizeTimestampSeconds(data.timestamp);

    const resolved = resolveQuoteChange({
      category,
      price,
      previousClose,
      providerChange,
      providerChangePercent,
    });

    const quote: MarketPulseQuoteResult = {
      providerSymbol,
      price,
      previousClose,
      changeAmount: resolved.changeAmount,
      changePercent: resolved.changePercent,
      changePeriod: eodBacked && price === null ? "previous_eod" : resolved.changePeriod,
      currency:
        typeof data.currency === "string" && data.currency !== "NA"
          ? data.currency
          : null,
      updatedAt,
      delayed: true,
      marketStatus:
        category === "crypto"
          ? "Delayed / last trade"
          : eodBacked
            ? price !== null
              ? "EOD / delayed FX"
              : "Previous EOD"
            : "Previous close / last session",
      availability: price !== null ? "available" : "unavailable",
      quoteRefreshMode: eodBacked ? "eod" : "realtime",
    };

    quoteCache.set(providerSymbol, {
      quote,
      expiresAt: Date.now() + ttl,
    });
    return quote;
  } catch {
    return unavailableQuote(providerSymbol);
  }
}
