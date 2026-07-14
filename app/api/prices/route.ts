import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    portfolioSymbol: "PPFB",
    eodhdSymbol: "PPFB.XETRA",
    isin: "IE00B4ND3602",
    name: "iShares Physical Gold ETC",
    currency: "EUR",
  },
];

async function fetchRealtimeData(
  symbol: string,
  apiKey: string
): Promise<EodhdRealtimeResponse> {
  const url =
    `https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}` +
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
      `${symbol}: EODHD gaf status ${response.status}. ${details}`
    );
  }

  const data = (await response.json()) as EodhdRealtimeResponse;

  if (
    typeof data.close !== "number" ||
    !Number.isFinite(data.close) ||
    data.close <= 0
  ) {
    throw new Error(`${symbol}: geen geldige koers ontvangen.`);
  }

  return data;
}

async function fetchFxRates(apiKey: string): Promise<FxRates> {
  const eurUsd = await fetchRealtimeData("EURUSD.FOREX", apiKey);

  if (
    typeof eurUsd.close !== "number" ||
    !Number.isFinite(eurUsd.close) ||
    eurUsd.close <= 0
  ) {
    throw new Error("Geen geldige EUR/USD-wisselkoers ontvangen.");
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
  fxRates: FxRates
): number {
  const rate = fxRates[currency];

  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error(
      `Geen EUR-conversie beschikbaar voor valuta ${currency}.`
    );
  }

  return amount * rate;
}

async function fetchHoldingPrice(
  holding: HoldingConfig,
  apiKey: string,
  fxRates: FxRates
) {
  const data = await fetchRealtimeData(
    holding.eodhdSymbol,
    apiKey
  );

  const originalPrice = data.close as number;

  const previousCloseOriginal =
    typeof data.previousClose === "number" &&
    Number.isFinite(data.previousClose)
      ? data.previousClose
      : null;

  const priceEur = convertToEur(
    originalPrice,
    holding.currency,
    fxRates
  );

  const previousCloseEur =
    previousCloseOriginal !== null
      ? convertToEur(
          previousCloseOriginal,
          holding.currency,
          fxRates
        )
      : null;

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

    change: data.change ?? null,
    changePercent: data.change_p ?? null,

    open: data.open ?? null,
    high: data.high ?? null,
    low: data.low ?? null,
    volume: data.volume ?? null,

    timestamp: data.timestamp ?? null,
    updatedAt: data.timestamp
      ? new Date(data.timestamp * 1000).toISOString()
      : new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const apiKey = process.env.EODHD_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "EODHD_API_KEY ontbreekt in de environment variables.",
        },
        { status: 500 }
      );
    }

    const fxRates = await fetchFxRates(apiKey);

    const results = await Promise.allSettled(
      HOLDINGS.map((holding) =>
        fetchHoldingPrice(holding, apiKey, fxRates)
      )
    );

    const prices = results
      .filter(
        (
          result
        ): result is PromiseFulfilledResult<
          Awaited<ReturnType<typeof fetchHoldingPrice>>
        > => result.status === "fulfilled"
      )
      .map((result) => result.value);

    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      )
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : "Onbekende fout bij het ophalen van een koers."
      );

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Prices API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het ophalen van de koersen.",
      },
      { status: 500 }
    );
  }
}