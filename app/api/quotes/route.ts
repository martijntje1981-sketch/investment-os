import { NextRequest, NextResponse } from "next/server";

type TwelveDataQuote = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  close?: string;
  previous_close?: string;
  percent_change?: string;
  datetime?: string;
  status?: string;
  code?: number;
  message?: string;
};

type MarketQuote = {
  symbol: string;
  providerSymbol: string;
  exchange: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  currency: string;
  updatedAt: string;
  success: boolean;
  error?: string;
};

type SymbolConfiguration = {
  providerSymbol: string;
  exchange?: string;
};

const symbolMap: Record<string, SymbolConfiguration> = {
  IB1T: {
    providerSymbol: "IB1T",
    exchange: "XETR",
  },
  STRC: {
    providerSymbol: "STRC",
    exchange: "XETR",
  },
  VWCE: {
    providerSymbol: "VWCE",
    exchange: "XETR",
  },
  NUKL: {
    providerSymbol: "NUKL",
    exchange: "XETR",
  },
  AIFS: {
    providerSymbol: "AIFS",
    exchange: "XETR",
  },
  PPFB: {
    providerSymbol: "PPFB",
    exchange: "XETR",
  },
};

function parseNumber(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function createFailedQuote(
  symbol: string,
  providerSymbol: string,
  exchange: string,
  error: string
): MarketQuote {
  return {
    symbol,
    providerSymbol,
    exchange,
    name: symbol,
    price: 0,
    previousClose: 0,
    changePercent: 0,
    currency: "EUR",
    updatedAt: new Date().toISOString(),
    success: false,
    error,
  };
}

async function fetchQuote(
  symbol: string,
  apiKey: string
): Promise<MarketQuote> {
  const cleanSymbol = symbol.trim().toUpperCase();

  const configuration = symbolMap[cleanSymbol] ?? {
    providerSymbol: cleanSymbol,
  };

  const providerSymbol = configuration.providerSymbol;
  const requestedExchange = configuration.exchange ?? "";

  try {
    const url = new URL("https://api.twelvedata.com/quote");

    url.searchParams.set("symbol", providerSymbol);

    if (requestedExchange) {
      url.searchParams.set("exchange", requestedExchange);
    }

    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    let data: TwelveDataQuote;

    try {
      data = (await response.json()) as TwelveDataQuote;
    } catch {
      return createFailedQuote(
        cleanSymbol,
        providerSymbol,
        requestedExchange,
        `Twelve Data returned an unreadable response with status ${response.status}.`
      );
    }

    if (!response.ok) {
      return createFailedQuote(
        cleanSymbol,
        providerSymbol,
        requestedExchange,
        data.message ??
          `Market data request failed with status ${response.status}.`
      );
    }

    if (
      data.status === "error" ||
      typeof data.code === "number" ||
      data.message
    ) {
      return createFailedQuote(
        cleanSymbol,
        providerSymbol,
        requestedExchange,
        data.message ?? "No market quote was found."
      );
    }

    const price = parseNumber(data.close);
    const previousClose = parseNumber(data.previous_close);
    const changePercent = parseNumber(data.percent_change);

    if (price <= 0) {
      return createFailedQuote(
        cleanSymbol,
        providerSymbol,
        data.exchange ?? requestedExchange,
        "The data provider returned no valid price."
      );
    }

    return {
      symbol: cleanSymbol,
      providerSymbol,
      exchange: data.exchange ?? requestedExchange,
      name: data.name ?? cleanSymbol,
      price,
      previousClose,
      changePercent,
      currency: data.currency ?? "EUR",
      updatedAt: data.datetime ?? new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    return createFailedQuote(
      cleanSymbol,
      providerSymbol,
      requestedExchange,
      error instanceof Error
        ? error.message
        : "An unknown market data error occurred."
    );
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TWELVEDATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "TWELVEDATA_API_KEY is missing from the environment variables.",
        quotes: [],
      },
      {
        status: 500,
      }
    );
  }

  const symbolsParameter =
    request.nextUrl.searchParams.get("symbols") ?? "";

  const symbols = Array.from(
    new Set(
      symbolsParameter
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  if (symbols.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Add at least one symbol, for example: /api/quotes?symbols=VWCE,NUKL",
        quotes: [],
      },
      {
        status: 400,
      }
    );
  }

  if (symbols.length > 20) {
    return NextResponse.json(
      {
        success: false,
        error: "A maximum of 20 symbols can be requested at once.",
        quotes: [],
      },
      {
        status: 400,
      }
    );
  }

  const quotes: MarketQuote[] = [];

  for (const symbol of symbols) {
    const quote = await fetchQuote(symbol, apiKey);
    quotes.push(quote);
  }

  const successfulQuotes = quotes.filter(
    (quote) => quote.success
  ).length;

  return NextResponse.json(
    {
      success: successfulQuotes > 0,
      requested: symbols.length,
      received: successfulQuotes,
      updatedAt: new Date().toISOString(),
      quotes,
    },
    {
      status: successfulQuotes > 0 ? 200 : 502,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}