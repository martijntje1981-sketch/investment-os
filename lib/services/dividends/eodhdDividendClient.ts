/**
 * EODHD dividend data client — fundamentals + calendar for future provider swaps.
 */

import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";

export type EodhdFundamentalsHighlights = {
  DividendShare?: number | null;
  DividendYield?: number | null;
  ForwardAnnualDividendRate?: number | null;
  ForwardAnnualDividendYield?: number | null;
};

export type EodhdCalendarDividendRow = {
  code?: string;
  date?: string;
  recordDate?: string;
  paymentDate?: string;
  declarationDate?: string;
  value?: number | null;
  currency?: string | null;
  period?: string | null;
};

type CalendarResponse = {
  symbols?: EodhdCalendarDividendRow[];
};

type FundamentalsResponse = {
  Highlights?: EodhdFundamentalsHighlights;
  General?: { CurrencyCode?: string | null };
};

function normalizeYieldPercent(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  const value = Number(raw);
  if (value <= 0) return null;
  return value <= 1 ? value * 100 : value;
}

export async function fetchFundamentalsHighlights(
  providerSymbol: string,
  apiKey: string = getEodhdApiKey(),
): Promise<{
  highlights: EodhdFundamentalsHighlights | null;
  currency: string | null;
}> {
  const url = new URL(
    `https://eodhd.com/api/fundamentals/${encodeURIComponent(providerSymbol)}`,
  );
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("filter", "Highlights,General");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) {
    return { highlights: null, currency: null };
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `EODHD fundamentals returned ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as FundamentalsResponse;
  return {
    highlights: data.Highlights ?? null,
    currency: data.General?.CurrencyCode ?? null,
  };
}

export async function fetchUpcomingCalendarDividends(
  providerSymbol: string,
  apiKey: string = getEodhdApiKey(),
): Promise<EodhdCalendarDividendRow[]> {
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 1);
  const to = future.toISOString().slice(0, 10);

  const url = new URL("https://eodhd.com/api/calendar/dividends");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("symbols", providerSymbol);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) return [];

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `EODHD dividend calendar returned ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as CalendarResponse;
  return Array.isArray(data.symbols) ? data.symbols : [];
}

export function extractYieldFromHighlights(
  highlights: EodhdFundamentalsHighlights | null,
): number | null {
  if (!highlights) return null;
  return (
    normalizeYieldPercent(highlights.ForwardAnnualDividendYield) ??
    normalizeYieldPercent(highlights.DividendYield)
  );
}

export function extractForwardRateFromHighlights(
  highlights: EodhdFundamentalsHighlights | null,
): number | null {
  if (!highlights) return null;
  const rate = highlights.ForwardAnnualDividendRate ?? highlights.DividendShare;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return Number(rate);
}
