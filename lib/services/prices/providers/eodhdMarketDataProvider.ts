import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import { executeEodhdApiCall } from "@/lib/services/marketData/eodhdApiCall";
import { markEodhdDailyQuotaExhausted } from "@/lib/services/marketData/eodhdDailyQuota";
import { recordProviderCircuitSuccess } from "@/lib/services/marketData/providerCircuitBreaker";
import {
  extractRateLimitDiagnostics,
  logMarketDataRateLimitError,
  logMarketDataRefreshTrace,
} from "@/lib/services/marketData/providerDiagnostics";
import {
  normalizeMarketQuote,
  parseMarketNumber,
} from "@/lib/services/prices/marketQuote";
import type {
  MarketDataProvider,
  PriceCurrency,
  ProviderFailureKind,
  ProviderRawQuote,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";

type EodhdRealtimeResponse = {
  code?: string;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  previousClose?: number;
  change?: number;
  change_p?: number;
  currency?: string;
};

export class ProviderQuoteError extends Error {
  readonly kind: ProviderFailureKind;
  readonly status?: number;

  constructor(kind: ProviderFailureKind, message: string, status?: number) {
    super(message);
    this.name = "ProviderQuoteError";
    this.kind = kind;
    this.status = status;
  }
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function inferCurrency(value: string | null | undefined): PriceCurrency {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USD" || normalized === "GBP" || normalized === "CHF") {
    return normalized;
  }
  return "EUR";
}

function inferCurrencyFromProviderSymbol(
  providerSymbol: string,
  fallback: PriceCurrency = "EUR",
): PriceCurrency {
  const exchange = providerSymbol.split(".").pop()?.trim().toUpperCase();
  switch (exchange) {
    case "US":
      return "USD";
    case "LSE":
      return "GBP";
    case "SW":
      return "CHF";
    default:
      return fallback;
  }
}

function classifyProviderFailure(status: number): ProviderFailureKind {
  if (status === 402) return "quota_exhausted";
  if (status === 429) return "rate_limited";
  if (status === 404) return "invalid_symbol";
  return "provider_error";
}

async function fetchEodhdRealtimeData(
  providerSymbol: string,
  apiKey: string,
): Promise<EodhdRealtimeResponse> {
  return executeEodhdApiCall(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const url =
        `https://eodhd.com/api/real-time/${encodeURIComponent(providerSymbol)}` +
        `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      const bodyText = await response.text();
      const diagnostics = extractRateLimitDiagnostics(response, bodyText);

      if (!response.ok) {
        if (response.status === 402 || response.status === 429) {
          logMarketDataRateLimitError("eodhd realtime rate limit", {
            httpStatus: diagnostics.httpStatus,
            providerSymbol,
            providerId: EODHD_QUOTE_PROVIDER_ID,
            retryAfterMs: diagnostics.retryAfterMs,
            remainingQuota: diagnostics.remainingQuota,
            resetTimestamp: diagnostics.resetTimestamp,
            rateLimitHeaders: diagnostics.rateLimitHeaders,
          });
        }
        throw new ProviderQuoteError(
          classifyProviderFailure(response.status),
          `${providerSymbol}: EODHD returned status ${response.status}. ${diagnostics.responseBodyPreview}`,
          response.status,
        );
      }

      let data: EodhdRealtimeResponse;
      try {
        data = JSON.parse(bodyText) as EodhdRealtimeResponse;
      } catch {
        throw new ProviderQuoteError(
          "provider_error",
          `${providerSymbol}: EODHD returned invalid JSON.`,
        );
      }

      if (!isFinitePositiveNumber(data.close)) {
        throw new ProviderQuoteError(
          "incomplete_quote",
          `${providerSymbol}: no valid market price was received.`,
        );
      }

      recordProviderCircuitSuccess(EODHD_QUOTE_PROVIDER_ID);

      logMarketDataRefreshTrace("provider_response", {
        httpStatus: response.status,
        providerSymbol,
        hasClose: isFinitePositiveNumber(data.close),
        timestamp: data.timestamp ?? null,
        rateLimitHeaders: diagnostics.rateLimitHeaders,
      });

      return data;
    } catch (error) {
      if (error instanceof ProviderQuoteError) {
        if (error.kind === "quota_exhausted") {
          await markEodhdDailyQuotaExhausted();
        }
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderQuoteError(
          "timeout",
          `${providerSymbol}: EODHD request timed out.`,
        );
      }
      throw new ProviderQuoteError(
        "provider_error",
        error instanceof Error ? error.message : `${providerSymbol}: provider error.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  });
}

function mapEodhdResponse(
  providerSymbol: string,
  data: EodhdRealtimeResponse,
): ProviderRawQuote {
  const quoteCurrency = inferCurrency(
    data.currency ?? inferCurrencyFromProviderSymbol(providerSymbol),
  );

  return {
    providerSymbol,
    originalCurrency: quoteCurrency,
    originalPrice: data.close as number,
    previousCloseOriginal: isFinitePositiveNumber(parseMarketNumber(data.previousClose))
      ? (parseMarketNumber(data.previousClose) as number)
      : null,
    changeOriginal: parseMarketNumber(data.change),
    changePercentOriginal: parseMarketNumber(data.change_p),
    open: parseMarketNumber(data.open),
    high: parseMarketNumber(data.high),
    low: parseMarketNumber(data.low),
    volume: parseMarketNumber(data.volume),
    timestamp: typeof data.timestamp === "number" ? data.timestamp : null,
    updatedAt: data.timestamp
      ? new Date(data.timestamp * 1000).toISOString()
      : new Date().toISOString(),
    marketStatus: null,
  };
}

export function createEodhdMarketDataProvider(
  apiKey: string = getEodhdApiKey(),
): MarketDataProvider {
  return {
    id: EODHD_QUOTE_PROVIDER_ID,
    supports: () => true,
    async getQuote(providerSymbol: string): Promise<ProviderRawQuote> {
      const data = await fetchEodhdRealtimeData(providerSymbol, apiKey);
      return mapEodhdResponse(providerSymbol, data);
    },
    normalizeQuote(target, raw, fxRates) {
      const rate = fxRates[raw.originalCurrency];
      const convert = (amount: number | null) => {
        if (amount === null) return null;
        if (typeof rate !== "number" || !Number.isFinite(rate)) {
          return null;
        }
        return amount * rate;
      };

      const priceEur = convert(raw.originalPrice);
      const previousCloseEur = convert(raw.previousCloseOriginal);
      const changeEur =
        raw.changeOriginal !== null
          ? convert(raw.changeOriginal)
          : priceEur !== null && previousCloseEur !== null
            ? priceEur - previousCloseEur
            : null;

      const normalized = normalizeMarketQuote({
        symbol: target.symbol,
        priceEur,
        previousCloseEur,
        changeEur,
        changePercent: raw.changePercentOriginal,
        originalCurrency: raw.originalCurrency,
        updatedAt: raw.updatedAt,
      });

      return {
        symbol: target.symbol,
        providerSymbol: target.providerSymbol,
        currentPrice: normalized.currentPrice,
        previousClose: normalized.previousClose,
        change: normalized.change,
        changePercent: normalized.changePercent,
        currency: raw.originalCurrency,
        marketStatus: raw.marketStatus ?? null,
        updatedAt: normalized.updatedAt,
        provider: "eodhd",
        isStale: false,
        unavailableReason: null,
        dataStatus: normalized.dataStatus,
        cacheStatus: "fresh",
      };
    },
  };
}

export async function fetchEodhdFxRates(
  apiKey: string = getEodhdApiKey(),
  options?: { requiredCurrencies?: PriceCurrency[] },
): Promise<Record<PriceCurrency, number | null>> {
  const required = new Set(options?.requiredCurrencies ?? ["EUR", "USD", "GBP", "CHF"]);
  const rates: Record<PriceCurrency, number | null> = {
    EUR: 1,
    USD: null,
    GBP: null,
    CHF: null,
  };

  if (required.has("USD")) {
    const eurUsd = await fetchEodhdRealtimeData("EURUSD.FOREX", apiKey);
    if (!isFinitePositiveNumber(eurUsd.close)) {
      throw new Error("No valid EUR/USD exchange rate was received.");
    }
    rates.USD = 1 / eurUsd.close;
  }

  if (required.has("GBP")) {
    try {
      const eurGbp = await fetchEodhdRealtimeData("EURGBP.FOREX", apiKey);
      if (isFinitePositiveNumber(eurGbp.close)) {
        rates.GBP = 1 / eurGbp.close;
      }
    } catch {
      // Optional cross-rate.
    }
  }

  if (required.has("CHF")) {
    try {
      const eurChf = await fetchEodhdRealtimeData("EURCHF.FOREX", apiKey);
      if (isFinitePositiveNumber(eurChf.close)) {
        rates.CHF = 1 / eurChf.close;
      }
    } catch {
      // Optional cross-rate.
    }
  }

  return rates;
}

export { ProviderQuoteError as EodhdProviderQuoteError };
