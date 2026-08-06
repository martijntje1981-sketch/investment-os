/**
 * POST /api/dividends
 *
 * Batch-resolves dividend intelligence for portfolio holdings.
 * Uses EODHD fundamentals + dividend calendar with server-side caching.
 */

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getEodhdApiKey, matchInstrument } from "@/lib/services/instruments";
import { resolveDividendQuote } from "@/lib/services/dividends/resolveDividendQuote";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { PortfolioInstrumentPayload } from "@/lib/types/portfolioStorage";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_SECONDS = 60 * 60 * 6;

type DividendRequestBody = {
  holdings?: Array<PortfolioInstrumentPayload & { quantity?: number }>;
};

type Currency = "EUR" | "USD" | "GBP" | "CHF";

async function fetchEurUsdRate(): Promise<number | null> {
  try {
    const apiKey = getEodhdApiKey();
    const response = await fetch(
      `https://eodhd.com/api/real-time/EURUSD.FOREX?api_token=${encodeURIComponent(apiKey)}&fmt=json`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { close?: number };
    if (typeof data.close !== "number" || data.close <= 0) return null;
    return 1 / data.close;
  } catch {
    return null;
  }
}

const getCachedFxRates = unstable_cache(
  async () => {
    const usdToEur = await fetchEurUsdRate();
    return {
      EUR: 1,
      USD: usdToEur,
      GBP: null,
      CHF: null,
    } satisfies Record<Currency, number | null>;
  },
  ["investment-os-dividend-fx-rates"],
  { revalidate: CACHE_SECONDS, tags: ["dividend-fx"] },
);

function getCachedDividendQuote(input: {
  symbol: string;
  providerSymbol: string;
  quantity: number;
  currency: Currency;
  fxRateToEur: number | null;
}) {
  return unstable_cache(
    async () => resolveDividendQuote(input),
    [
      "investment-os-dividend-quote",
      input.providerSymbol,
      String(input.quantity),
      input.currency,
    ],
    {
      revalidate: CACHE_SECONDS,
      tags: ["dividends", `dividend-${input.providerSymbol}`],
    },
  )();
}

async function resolveProviderSymbol(
  holding: PortfolioInstrumentPayload,
): Promise<string | null> {
  if (holding.providerSymbol?.trim()) {
    return holding.providerSymbol.trim().toUpperCase();
  }

  const resolved = await matchInstrument({
    ticker: holding.symbol || null,
    isin: holding.isin ?? null,
    exchange: holding.exchange ?? null,
    instrumentName: holding.name ?? null,
    assetType: "investment",
  });

  return resolved.providerSymbol;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DividendRequestBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holdings were supplied." },
        { status: 400 },
      );
    }

    if (holdings.length > 50) {
      return NextResponse.json(
        { success: false, error: "A maximum of 50 holdings can be resolved per request." },
        { status: 400 },
      );
    }

    const fxRates = await getCachedFxRates();
    const seen = new Set<string>();
    const quotes: DividendApiQuote[] = [];

    for (const holding of holdings) {
      const providerSymbol = await resolveProviderSymbol(holding);
      if (!providerSymbol || seen.has(providerSymbol)) continue;
      seen.add(providerSymbol);

      const currency: Currency = "EUR";

      const quote = await getCachedDividendQuote({
        symbol: holding.symbol.trim().toUpperCase(),
        providerSymbol,
        quantity: 1,
        currency,
        fxRateToEur: fxRates[currency],
      });

      quotes.push(quote);
    }

    return NextResponse.json({
      success: true,
      quotes,
      generatedAt: new Date().toISOString(),
      cache: {
        enabled: true,
        durationSeconds: CACHE_SECONDS,
      },
    });
  } catch (error) {
    console.error("Dividend intelligence failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Dividend data could not be loaded.",
      },
      { status: 500 },
    );
  }
}
