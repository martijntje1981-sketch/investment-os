/**
 * Typed EODHD API client for instrument resolution and market data.
 *
 * Used by the Instrument Match Engine — keeps HTTP details out of
 * resolution logic so the engine stays provider-agnostic at its core.
 */

export type EodhdIdMappingRow = {
  Code?: string;
  Exchange?: string;
  Name?: string;
  ISIN?: string;
  Currency?: string;
  Type?: string;
  Country?: string;
};

export type EodhdSearchRow = {
  Code?: string;
  Exchange?: string;
  Name?: string;
  Type?: string;
  Country?: string;
  Currency?: string;
  ISIN?: string;
};

type IdMappingFilters = {
  isin?: string;
  symbol?: string;
  exchange?: string;
};

type SearchOptions = {
  exchange?: string | null;
  type?: "all" | "stock" | "etf" | "fund" | "bond" | "index" | "crypto";
  limit?: number;
};

export class EodhdProviderError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "EodhdProviderError";
    this.status = status;
  }
}

export function isEodhdQuotaOrRateLimitError(error: unknown): boolean {
  if (error instanceof EodhdProviderError) {
    return error.status === 402 || error.status === 429;
  }

  if (error instanceof Error) {
    return /returned 402|returned 429|payment required|quota|rate.?limit|too many requests/i.test(
      error.message,
    );
  }

  return false;
}

export function getEodhdApiKey(): string {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EODHD_API_KEY is missing from the environment variables.",
    );
  }
  return apiKey;
}

function parseJsonArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    typeof data === "object" &&
    data !== null &&
    "data" in data &&
    Array.isArray((data as { data: unknown }).data)
  ) {
    return (data as { data: T[] }).data;
  }
  return [];
}

/** Builds an EODHD provider symbol from code and exchange parts. */
export function buildProviderSymbol(
  code: string,
  exchange: string,
): string {
  return `${code.trim().toUpperCase()}.${exchange.trim().toUpperCase()}`;
}

/**
 * EODHD ID Mapping — primary lookup when an ISIN is available.
 * GET /api/id-mapping?filter[isin]=...
 */
export async function fetchIdMapping(
  filters: IdMappingFilters,
  apiKey: string = getEodhdApiKey(),
): Promise<EodhdIdMappingRow[]> {
  const url = new URL("https://eodhd.com/api/id-mapping");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  if (filters.isin) {
    url.searchParams.set("filter[isin]", filters.isin);
  }
  if (filters.symbol) {
    url.searchParams.set("filter[symbol]", filters.symbol);
  }
  if (filters.exchange) {
    url.searchParams.set("filter[ex]", filters.exchange);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new EodhdProviderError(
      response.status,
      `EODHD id-mapping returned ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as unknown;
  return parseJsonArray<EodhdIdMappingRow>(data);
}

/**
 * EODHD Search — fallback for ticker+exchange or name+exchange lookups.
 * GET /api/search/{query}?exchange=...
 */
export async function fetchSearch(
  query: string,
  options: SearchOptions = {},
  apiKey: string = getEodhdApiKey(),
): Promise<EodhdSearchRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(
    `https://eodhd.com/api/search/${encodeURIComponent(trimmed)}`,
  );
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(options.limit ?? 10));

  if (options.exchange) {
    url.searchParams.set("exchange", options.exchange);
  }
  if (options.type && options.type !== "all") {
    url.searchParams.set("type", options.type);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) return [];

  if (!response.ok) {
    const details = await response.text();
    throw new EodhdProviderError(
      response.status,
      `EODHD search returned ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as unknown;
  return parseJsonArray<EodhdSearchRow>(data);
}
