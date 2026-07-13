export type MarketQuote = {
  symbol: string;
  providerSymbol: string;
  name: string | null;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  exchange: string | null;
  marketOpen: boolean | null;
  updatedAt: string;
  provider: "twelve-data";
};

export type MarketQuoteError = {
  symbol: string;
  error: string;
  attemptedSymbols: string[];
};

export type QuoteResult =
  | {
      success: true;
      quote: MarketQuote;
    }
  | {
      success: false;
      error: MarketQuoteError;
    };

type TwelveDataQuoteResponse = {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
  status?: "error";
  code?: number;
  message?: string;
};

type TwelveDataSearchItem = {
  symbol?: string;
  instrument_name?: string;
  exchange?: string;
  exchange_timezone?: string;
  instrument_type?: string;
  country?: string;
  currency?: string;
};

type TwelveDataSearchResponse = {
  data?: TwelveDataSearchItem[];
  status?: "error";
  code?: number;
  message?: string;
};

/**
 * Handmatige overrides voor producten waarvan we exact weten
 * welke providercode gebruikt moet worden.
 *
 * Deze lijst mag later worden uitgebreid zonder dat de rest
 * van de applicatie hoeft te veranderen.
 */
const SYMBOL_OVERRIDES: Record<string, string[]> = {
  AAPL: ["AAPL"],
  MSFT: ["MSFT"],
  TSLA: ["TSLA"],
  NVDA: ["NVDA"],

  IB1T: [
    "IB1T",
    "IB1T:XETR",
    "IB1T:XFRA",
    "IB1T:LSE",
  ],

  VWCE: [
    "VWCE",
    "VWCE:XETR",
    "VWCE:XFRA",
    "VWCE:BVMF",
  ],

  NUKL: [
    "NUKL",
    "NUKL:XETR",
    "NUKL:XFRA",
    "NUKL:LSE",
  ],

  AIFS: [
    "AIFS",
    "AIFS:XETR",
    "AIFS:XFRA",
    "AIFS:LSE",
  ],

  PPFB: [
    "PPFB",
    "PPFB:LSE",
    "PPFB:XETR",
    "PPFB:XFRA",
  ],

  STRC: [
    "STRC",
    "STRC:XETR",
    "STRC:XFRA",
    "STRC:LSE",
  ],
};

function getApiKey() {
  const apiKey = process.env.TWELVEDATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWELVEDATA_API_KEY ontbreekt in de environment variables."
    );
  }

  return apiKey;
}

function parseNumber(
  value: string | number | null | undefined
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function normaliseSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function buildProviderSymbol(
  symbol: string,
  exchange?: string
) {
  if (!exchange) {
    return symbol;
  }

  return `${symbol}:${exchange}`;
}

async function requestJson<T>(url: URL): Promise<T> {
  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Twelve Data returned HTTP ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

async function fetchTwelveDataQuote(
  requestedSymbol: string,
  providerSymbol: string
): Promise<MarketQuote | null> {
  const url = new URL(
    "https://api.twelvedata.com/quote"
  );

  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("apikey", getApiKey());

  try {
    const data =
      await requestJson<TwelveDataQuoteResponse>(url);

    if (data.status === "error") {
      return null;
    }

    const price = parseNumber(data.close);

    if (price === null) {
      return null;
    }

    return {
      symbol: requestedSymbol,
      providerSymbol,
      name: data.name ?? null,
      price,
      previousClose: parseNumber(
        data.previous_close
      ),
      change: parseNumber(data.change),
      changePercent: parseNumber(
        data.percent_change
      ),
      currency: data.currency ?? "EUR",
      exchange: data.exchange ?? null,
      marketOpen:
        typeof data.is_market_open === "boolean"
          ? data.is_market_open
          : null,
      updatedAt:
        data.datetime ??
        (data.timestamp
          ? new Date(
              data.timestamp * 1000
            ).toISOString()
          : new Date().toISOString()),
      provider: "twelve-data",
    };
  } catch {
    return null;
  }
}

async function searchTwelveDataSymbols(
  searchTerm: string
): Promise<string[]> {
  const url = new URL(
    "https://api.twelvedata.com/symbol_search"
  );

  url.searchParams.set("symbol", searchTerm);
  url.searchParams.set(
    "outputsize",
    "30"
  );
  url.searchParams.set("apikey", getApiKey());

  try {
    const data =
      await requestJson<TwelveDataSearchResponse>(
        url
      );

    if (
      data.status === "error" ||
      !Array.isArray(data.data)
    ) {
      return [];
    }

    const exactMatches = data.data.filter(
      (item) =>
        normaliseSymbol(item.symbol ?? "") ===
        normaliseSymbol(searchTerm)
    );

    const otherMatches = data.data.filter(
      (item) =>
        normaliseSymbol(item.symbol ?? "") !==
        normaliseSymbol(searchTerm)
    );

    return [...exactMatches, ...otherMatches]
      .flatMap((item) => {
        if (!item.symbol) {
          return [];
        }

        return [
          buildProviderSymbol(
            item.symbol,
            item.exchange
          ),
          item.symbol,
        ];
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function buildCandidateSymbols(
  symbol: string,
  name?: string
) {
  const normalisedSymbol =
    normaliseSymbol(symbol);

  const overrideCandidates =
    SYMBOL_OVERRIDES[normalisedSymbol] ?? [];

  const symbolSearchCandidates =
    await searchTwelveDataSymbols(
      normalisedSymbol
    );

  const nameSearchCandidates = name
    ? await searchTwelveDataSymbols(name)
    : [];

  return uniqueValues([
    ...overrideCandidates,
    normalisedSymbol,
    ...symbolSearchCandidates,
    ...nameSearchCandidates,
  ]);
}

export async function getQuote(
  symbol: string,
  name?: string
): Promise<QuoteResult> {
  const requestedSymbol =
    normaliseSymbol(symbol);

  if (!requestedSymbol) {
    return {
      success: false,
      error: {
        symbol: requestedSymbol,
        error:
          "Er is geen geldige ticker opgegeven.",
        attemptedSymbols: [],
      },
    };
  }

  const candidateSymbols =
    await buildCandidateSymbols(
      requestedSymbol,
      name
    );

  const attemptedSymbols: string[] = [];

  for (const providerSymbol of candidateSymbols) {
    attemptedSymbols.push(providerSymbol);

    const quote = await fetchTwelveDataQuote(
      requestedSymbol,
      providerSymbol
    );

    if (quote) {
      return {
        success: true,
        quote,
      };
    }
  }

  return {
    success: false,
    error: {
      symbol: requestedSymbol,
      error:
        "Geen ondersteunde beursnotering gevonden bij Twelve Data.",
      attemptedSymbols,
    },
  };
}

export async function getQuotes(
  instruments: Array<{
    symbol: string;
    name?: string;
  }>
) {
  const uniqueInstruments = Array.from(
    new Map(
      instruments
        .filter(
          (instrument) =>
            instrument.symbol.trim().length > 0
        )
        .map((instrument) => [
          normaliseSymbol(instrument.symbol),
          {
            symbol: normaliseSymbol(
              instrument.symbol
            ),
            name: instrument.name,
          },
        ])
    ).values()
  ).slice(0, 20);

  const results = await Promise.all(
    uniqueInstruments.map((instrument) =>
      getQuote(
        instrument.symbol,
        instrument.name
      )
    )
  );

  return {
    quotes: results
      .filter(
        (
          result
        ): result is {
          success: true;
          quote: MarketQuote;
        } => result.success
      )
      .map((result) => result.quote),

    errors: results
      .filter(
        (
          result
        ): result is {
          success: false;
          error: MarketQuoteError;
        } => !result.success
      )
      .map((result) => result.error),

    fetchedAt: new Date().toISOString(),
  };
}