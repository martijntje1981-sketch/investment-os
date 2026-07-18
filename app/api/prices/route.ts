import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 10 * 60;

type Currency = "EUR" | "USD" | "GBP" | "CHF";

type HoldingConfig = {
  portfolioSymbol: string;
  eodhdSymbol: string;
  isin: string;
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
};

type FxRates = Record<Currency, number | null>;

type HoldingPrice = {
  symbol: string;
  eodhdSymbol: string;
  isin: string | null;
  name: string;

  originalCurrency: Currency;
  originalPrice: number;

  baseCurrency: "EUR";
  exchangeRateToEur: number | null;
  priceEur: number;

  previousCloseOriginal: number | null;
  previousCloseEur: number | null;

  change: number | null;
  changePercent: number | null;

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

const HOLDINGS: HoldingConfig[] = [
  {
    portfolioSymbol: "IB1T",
    eodhdSymbol: "IB1T.XETRA",
    isin: "XS2940466316",
    name: "iShares Bitcoin ETP",
    currency: "EUR",
  },
  {
    portfolioSymbol: "STRC",
    eodhdSymbol: "STRC.AS",
    isin: "",
    name: "21Shares Strategy Yield ETP",
    currency: "USD",
  },
  {
    portfolioSymbol: "AIFS",
    eodhdSymbol: "AIFS.XETRA",
    isin: "IE000X59ZHE2",
    name: "iShares AI Infrastructure UCITS ETF",
    currency: "EUR",
  },
  {
    portfolioSymbol: "NUKL",
    eodhdSymbol: "NUKL.XETRA",
    isin: "IE000M7V94E1",
    name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
    currency: "EUR",
  },
  {
    portfolioSymbol: "VWCE",
    eodhdSymbol: "VWCE.XETRA",
    isin: "IE00BK5BQT80",
    name: "Vanguard FTSE All-World UCITS ETF",
    currency: "EUR",
  },
  {
    portfolioSymbol: "VUSA",
    eodhdSymbol: "VUSA.AS",
    isin: "IE00B3XXRP09",
    name: "Vanguard S&P 500 UCITS ETF USD Distributing",
    currency: "EUR",
  },
];

function getApiKey() {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    throw new Error(
      "EODHD_API_KEY is missing from the environment variables.",
    );
  }

  return apiKey;
}

function isFinitePositiveNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

async function fetchRealtimeData(
  symbol: string,
  apiKey: string,
): Promise<EodhdRealtimeResponse> {
  const url =
    `https://eodhd.com/api/real-time/${encodeURIComponent(
      symbol,
    )}` +
    `?api_token=${encodeURIComponent(apiKey)}&fmt=json`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `${symbol}: EODHD returned status ${response.status}. ${details}`,
    );
  }

  const data =
    (await response.json()) as EodhdRealtimeResponse;

  if (!isFinitePositiveNumber(data.close)) {
    throw new Error(
      `${symbol}: no valid market price was received.`,
    );
  }

  return data;
}

async function fetchFxRates(
  apiKey: string,
): Promise<FxRates> {
  const eurUsd = await fetchRealtimeData(
    "EURUSD.FOREX",
    apiKey,
  );

  if (!isFinitePositiveNumber(eurUsd.close)) {
    throw new Error(
      "No valid EUR/USD exchange rate was received.",
    );
  }

  return {
    EUR: 1,
    USD: 1 / eurUsd.close,
    GBP: null,
    CHF: null,
  };
}

function convertToEur(
  amount: number,
  currency: Currency,
  fxRates: FxRates,
) {
  const rate = fxRates[currency];

  if (
    typeof rate !== "number" ||
    !Number.isFinite(rate)
  ) {
    throw new Error(
      `No EUR conversion is available for ${currency}.`,
    );
  }

  return amount * rate;
}

async function fetchHoldingPrice(
  holding: HoldingConfig,
  apiKey: string,
  fxRates: FxRates,
): Promise<HoldingPrice> {
  const data = await fetchRealtimeData(
    holding.eodhdSymbol,
    apiKey,
  );

  const originalPrice = data.close as number;

  const previousCloseOriginal =
    isFinitePositiveNumber(data.previousClose)
      ? data.previousClose
      : null;

  const priceEur = convertToEur(
    originalPrice,
    holding.currency,
    fxRates,
  );

  const previousCloseEur =
    previousCloseOriginal !== null
      ? convertToEur(
          previousCloseOriginal,
          holding.currency,
          fxRates,
        )
      : null;

  const updatedAt = data.timestamp
    ? new Date(data.timestamp * 1000).toISOString()
    : new Date().toISOString();

  return {
    symbol: holding.portfolioSymbol,
    eodhdSymbol: holding.eodhdSymbol,
    isin: holding.isin || null,
    name: holding.name,

    originalCurrency: holding.currency,
    originalPrice,

    baseCurrency: "EUR",
    exchangeRateToEur: fxRates[holding.currency],
    priceEur,

    previousCloseOriginal,
    previousCloseEur,

    change:
      typeof data.change === "number"
        ? data.change
        : null,

    changePercent:
      typeof data.change_p === "number"
        ? data.change_p
        : null,

    open:
      typeof data.open === "number"
        ? data.open
        : null,

    high:
      typeof data.high === "number"
        ? data.high
        : null,

    low:
      typeof data.low === "number"
        ? data.low
        : null,

    volume:
      typeof data.volume === "number"
        ? data.volume
        : null,

    timestamp:
      typeof data.timestamp === "number"
        ? data.timestamp
        : null,

    updatedAt,
  };
}

async function loadPricesFromEodhd(): Promise<PricePayload> {
  const apiKey = getApiKey();
  const fxRates = await fetchFxRates(apiKey);

  const results = await Promise.allSettled(
    HOLDINGS.map((holding) =>
      fetchHoldingPrice(
        holding,
        apiKey,
        fxRates,
      ),
    ),
  );

  const prices = results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<HoldingPrice> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const errors = results
    .filter(
      (
        result,
      ): result is PromiseRejectedResult =>
        result.status === "rejected",
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

    requested: HOLDINGS.length,
    received: prices.length,
    generatedAt: new Date().toISOString(),

    cache: {
      enabled: true,
      durationSeconds: CACHE_SECONDS,
    },
  };
}

/**
 * Next.js stores this result in its server-side data cache.
 *
 * All visitors and all pages share the same result for
 * ten minutes. A browser refresh therefore does not cause
 * another complete round of EODHD requests.
 */
const getCachedPrices = unstable_cache(
  loadPricesFromEodhd,
  ["investment-os-eodhd-prices-v2"],
  {
    revalidate: CACHE_SECONDS,
    tags: ["market-prices"],
  },
);

export async function GET() {
  try {
    const payload = await getCachedPrices();

    return NextResponse.json(payload, {
      status: payload.success ? 200 : 503,
      headers: {
        "Cache-Control":
          `public, s-maxage=${CACHE_SECONDS}, ` +
          `stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    });
  } catch (error) {
    console.error("Prices API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading market prices.",

        cache: {
          enabled: true,
          durationSeconds: CACHE_SECONDS,
        },
      },
      { status: 500 },
    );
  }
}