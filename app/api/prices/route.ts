/**
 * GET/POST /api/prices
 *
 * WHY THIS FILE CHANGES:
 * - Hardcoded portfolioSymbol → eodhdSymbol mappings are replaced by the
 *   Instrument Match Engine, which resolves providerSymbol dynamically.
 * - GET keeps backward compatibility for the default demo watchlist.
 * - POST accepts user holdings (with stored providerSymbol) for live pricing.
 * - Response shape is preserved: `symbol`, `eodhdSymbol`, `priceEur`, etc.
 */

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import {
  getEodhdApiKey,
  matchInstrument,
} from "@/lib/services/instruments";
import { getDefaultPortfolioPriceSeed } from "@/lib/services/portfolio/priceSeed";
import {
  normalizeMarketQuote,
  parseMarketNumber,
} from "@/lib/services/prices/marketQuote";
import type { InstrumentMatchInput } from "@/lib/types/instrument";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 10 * 60;

type Currency = "EUR" | "USD" | "GBP" | "CHF";

type PriceHoldingInput = {
  id?: string;
  symbol: string;
  name?: string;
  isin?: string | null;
  exchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  currency?: Currency;
};

type ResolvedPriceTarget = {
  /** User-facing join key — matches holding.symbol in localStorage. */
  symbol: string;
  providerSymbol: string;
  isin: string | null;
  name: string;
  currency: Currency;
};

type EodhdRealtimeResponse = {
  code?: string;
  timestamp?: number;
  gmtoffset?: number;
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

type FxRates = Record<Currency, number | null>;

type HoldingPrice = {
  symbol: string;
  /** @deprecated Use providerSymbol — kept for backward compatibility. */
  eodhdSymbol: string;
  providerSymbol: string;
  isin: string | null;
  name: string;
  originalCurrency: Currency;
  originalPrice: number;
  baseCurrency: "EUR";
  exchangeRateToEur: number | null;
  priceEur: number;
  currentPrice: number | null;
  previousCloseOriginal: number | null;
  previousCloseEur: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: Currency | null;
  dataStatus: "live" | "delayed" | "stale" | "unavailable";
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  timestamp: number | null;
  updatedAt: string;
};

type PricePayload = {
  success: boolean;
  baseCurrency: "EUR";
  fxRates: {
    EUR: number | null;
    USD_TO_EUR: number | null;
    GBP_TO_EUR: number | null;
    CHF_TO_EUR: number | null;
  };
  prices: HoldingPrice[];
  errors: string[];
  requested: number;
  received: number;
  generatedAt: string;
  cache: {
    enabled: true;
    durationSeconds: number;
  };
};

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function inferCurrency(value: string | null | undefined): Currency {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USD" || normalized === "GBP" || normalized === "CHF") {
    return normalized;
  }
  return "EUR";
}

function inferCurrencyFromProviderSymbol(
  providerSymbol: string,
  fallback: Currency = "EUR",
): Currency {
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

async function fetchRealtimeData(
  providerSymbol: string,
  apiKey: string,
): Promise<EodhdRealtimeResponse> {
  const url =
    `https://eodhd.com/api/real-time/${encodeURIComponent(providerSymbol)}` +
    `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `${providerSymbol}: EODHD returned status ${response.status}. ${details}`,
    );
  }

  const data = (await response.json()) as EodhdRealtimeResponse;

  if (!isFinitePositiveNumber(data.close)) {
    throw new Error(
      `${providerSymbol}: no valid market price was received.`,
    );
  }

  return data;
}

const getCachedFxRates = unstable_cache(
  async () => {
    const apiKey = getEodhdApiKey();
    const eurUsd = await fetchRealtimeData("EURUSD.FOREX", apiKey);

    if (!isFinitePositiveNumber(eurUsd.close)) {
      throw new Error("No valid EUR/USD exchange rate was received.");
    }

    let gbp: number | null = null;
    let chf: number | null = null;

    try {
      const eurGbp = await fetchRealtimeData("EURGBP.FOREX", apiKey);
      if (isFinitePositiveNumber(eurGbp.close)) {
        gbp = 1 / eurGbp.close;
      }
    } catch {
      // Optional cross-rate — GBP listings fail individually when unavailable.
    }

    try {
      const eurChf = await fetchRealtimeData("EURCHF.FOREX", apiKey);
      if (isFinitePositiveNumber(eurChf.close)) {
        chf = 1 / eurChf.close;
      }
    } catch {
      // Optional cross-rate — CHF listings fail individually when unavailable.
    }

    return {
      EUR: 1,
      USD: 1 / eurUsd.close,
      GBP: gbp,
      CHF: chf,
    } satisfies FxRates;
  },
  ["investment-os-eodhd-fx-rates-v2"],
  { revalidate: CACHE_SECONDS, tags: ["market-fx"] },
);

function getCachedProviderQuote(providerSymbol: string) {
  return unstable_cache(
    async () => {
      const apiKey = getEodhdApiKey();
      return fetchRealtimeData(providerSymbol, apiKey);
    },
    [`investment-os-eodhd-quote-${providerSymbol}`],
    { revalidate: CACHE_SECONDS, tags: ["market-prices", `quote-${providerSymbol}`] },
  )();
}

function convertToEur(amount: number, currency: Currency, fxRates: FxRates) {
  const rate = fxRates[currency];
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(`No EUR conversion is available for ${currency}.`);
  }
  return amount * rate;
}

/** Resolves a price target from stored fields or the Match Engine. */
async function resolvePriceTarget(
  input: PriceHoldingInput,
): Promise<ResolvedPriceTarget | null> {
  const userSymbol = input.symbol.trim().toUpperCase();

  if (input.providerSymbol) {
    return {
      symbol: userSymbol || input.providerSymbol.split(".")[0] || input.providerSymbol,
      providerSymbol: input.providerSymbol,
      isin: input.isin ?? null,
      name: input.instrumentName ?? input.name ?? userSymbol,
      currency:
        input.currency ??
        inferCurrencyFromProviderSymbol(input.providerSymbol),
    };
  }

  const matchInput: InstrumentMatchInput = {
    ticker: userSymbol || null,
    isin: input.isin ?? null,
    exchange: input.exchange ?? null,
    instrumentName: input.name ?? input.instrumentName ?? null,
    assetType: "investment",
  };

  const resolved = await matchInstrument(matchInput);
  if (!resolved.providerSymbol) {
    return null;
  }

  const providerCode = resolved.providerSymbol.split(".")[0] ?? userSymbol;

  return {
    symbol: userSymbol || providerCode,
    providerSymbol: resolved.providerSymbol,
    isin: resolved.isin,
    name: resolved.instrumentName ?? input.name ?? userSymbol,
    currency: inferCurrencyFromProviderSymbol(resolved.providerSymbol),
  };
}

async function fetchHoldingPrice(
  target: ResolvedPriceTarget,
  fxRates: FxRates,
): Promise<HoldingPrice> {
  const data = await getCachedProviderQuote(target.providerSymbol);
  const quoteCurrency = inferCurrency(
    data.currency ?? inferCurrencyFromProviderSymbol(target.providerSymbol, target.currency),
  );
  const originalPrice = data.close as number;
  const previousCloseOriginal = isFinitePositiveNumber(
    parseMarketNumber(data.previousClose),
  )
    ? (parseMarketNumber(data.previousClose) as number)
    : null;

  const priceEur = convertToEur(originalPrice, quoteCurrency, fxRates);
  const previousCloseEur =
    previousCloseOriginal !== null
      ? convertToEur(previousCloseOriginal, quoteCurrency, fxRates)
      : null;

  const changeOriginal = parseMarketNumber(data.change);
  const changeEur =
    changeOriginal !== null
      ? convertToEur(changeOriginal, quoteCurrency, fxRates)
      : previousCloseEur !== null
        ? priceEur - previousCloseEur
        : null;

  const updatedAt = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString()
    : new Date().toISOString();

  const normalized = normalizeMarketQuote({
    symbol: target.symbol,
    priceEur,
    previousCloseEur,
    changeEur,
    changePercent: parseMarketNumber(data.change_p),
    originalCurrency: quoteCurrency,
    updatedAt,
  });

  return {
    symbol: target.symbol,
    eodhdSymbol: target.providerSymbol,
    providerSymbol: target.providerSymbol,
    isin: target.isin,
    name: target.name,
    originalCurrency: quoteCurrency,
    originalPrice,
    baseCurrency: "EUR",
    exchangeRateToEur: fxRates[quoteCurrency],
    priceEur,
    currentPrice: normalized.currentPrice,
    previousCloseOriginal,
    previousCloseEur,
    previousClose: normalized.previousClose,
    change: normalized.change,
    changePercent: normalized.changePercent,
    currency: quoteCurrency,
    dataStatus: normalized.dataStatus,
    open: parseMarketNumber(data.open),
    high: parseMarketNumber(data.high),
    low: parseMarketNumber(data.low),
    volume: parseMarketNumber(data.volume),
    timestamp: typeof data.timestamp === "number" ? data.timestamp : null,
    updatedAt,
  };
}

async function loadPricesForTargets(
  targets: ResolvedPriceTarget[],
): Promise<PricePayload> {
  const fxRates = await getCachedFxRates();

  const results = await Promise.allSettled(
    targets.map((target) => fetchHoldingPrice(target, fxRates)),
  );

  const prices = results
    .filter(
      (result): result is PromiseFulfilledResult<HoldingPrice> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const errors = results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : "Unknown error while loading a market price.",
    );

  return {
    success: prices.length > 0,
    baseCurrency: "EUR",
    fxRates: {
      EUR: fxRates.EUR,
      USD_TO_EUR: fxRates.USD,
      GBP_TO_EUR: fxRates.GBP,
      CHF_TO_EUR: fxRates.CHF,
    },
    prices,
    errors,
    requested: targets.length,
    received: prices.length,
    generatedAt: new Date().toISOString(),
    cache: { enabled: true, durationSeconds: CACHE_SECONDS },
  };
}

/** Resolves the demo portfolio seed via the Match Engine (no hardcoded provider symbols). */
async function resolveDefaultWatchlist(): Promise<ResolvedPriceTarget[]> {
  const targets: ResolvedPriceTarget[] = [];

  for (const item of getDefaultPortfolioPriceSeed()) {
    const resolved = await matchInstrument(item);
    if (!resolved.providerSymbol) continue;

    const userSymbol =
      item.ticker?.trim().toUpperCase() ??
      resolved.providerSymbol.split(".")[0] ??
      "";

    targets.push({
      symbol: userSymbol,
      providerSymbol: resolved.providerSymbol,
      isin: resolved.isin ?? null,
      name: resolved.instrumentName ?? item.instrumentName ?? userSymbol,
      currency: "EUR",
    });
  }

  return targets;
}

const getCachedDefaultPrices = unstable_cache(
  async () => {
    const targets = await resolveDefaultWatchlist();
    return loadPricesForTargets(targets);
  },
  ["investment-os-eodhd-default-prices-v3"],
  { revalidate: CACHE_SECONDS, tags: ["market-prices"] },
);

function jsonResponse(payload: PricePayload, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
    },
  });
}

/** Backward-compatible GET — prices for the default demo watchlist. */
export async function GET() {
  try {
    const payload = await getCachedDefaultPrices();
    return jsonResponse(payload, payload.success ? 200 : 503);
  } catch (error) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading market prices.",
        cache: { enabled: true, durationSeconds: CACHE_SECONDS },
      },
      { status: 500 },
    );
  }
}

type PostBody = {
  holdings?: PriceHoldingInput[];
};

/**
 * POST — fetch live prices for caller-supplied holdings.
 * Uses stored providerSymbol when available; otherwise resolves via Match Engine.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holdings were supplied." },
        { status: 400 },
      );
    }

    const resolvedTargets: ResolvedPriceTarget[] = [];
    const errors: string[] = [];

    for (const holding of holdings) {
      if (!holding.symbol?.trim() && !holding.providerSymbol?.trim() && !holding.isin) {
        errors.push("Skipped a holding with no symbol, ISIN, or providerSymbol.");
        continue;
      }

      const target = await resolvePriceTarget(holding);
      if (!target) {
        const label = holding.symbol || holding.isin || holding.name || "Unknown";
        errors.push(`${label}: instrument could not be resolved for live pricing.`);
        continue;
      }

      resolvedTargets.push(target);
    }

    const payload = await loadPricesForTargets(resolvedTargets);
    return jsonResponse(
      { ...payload, errors: [...errors, ...payload.errors] },
      payload.success ? 200 : 503,
    );
  } catch (error) {
    console.error("Prices API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading market prices.",
        cache: { enabled: true, durationSeconds: CACHE_SECONDS },
      },
      { status: 500 },
    );
  }
}
