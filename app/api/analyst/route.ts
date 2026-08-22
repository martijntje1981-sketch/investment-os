/**
 * POST /api/analyst
 *
 * Batch-resolves analyst intelligence for portfolio holdings.
 * Uses EODHD fundamentals with server-side caching (~24h).
 */

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getEodhdApiKey, matchInstrument } from "@/lib/services/instruments";
import { resolveAnalystQuote } from "@/lib/services/analyst/resolveAnalystQuote";
import { buildAnalystActionsFromNews } from "@/lib/services/news/analystNews";
import type { AnalystApiQuote, AnalystRecentAction } from "@/lib/types/analyst";
import type { PortfolioInstrumentPayload } from "@/lib/types/portfolioStorage";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_SECONDS = 60 * 60 * 24;

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
  ["investment-os-analyst-fx-rates"],
  { revalidate: CACHE_SECONDS, tags: ["analyst-fx"] },
);

type AnalystRequestBody = {
  holdings?: Array<PortfolioInstrumentPayload & { quantity?: number }>;
  includeRecentActions?: boolean;
};

function getCachedAnalystQuote(input: {
  symbol: string;
  providerSymbol: string;
  name: string;
  fxRateToEur: number | null;
}) {
  return unstable_cache(
    async () => resolveAnalystQuote(input),
    [
      "investment-os-analyst-quote",
      input.providerSymbol,
      String(input.fxRateToEur ?? "none"),
    ],
    {
      revalidate: CACHE_SECONDS,
      tags: ["analyst", `analyst-${input.providerSymbol}`],
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
    const body = (await request.json()) as AnalystRequestBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holdings were supplied." },
        { status: 400 },
      );
    }

    if (holdings.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "A maximum of 50 holdings can be resolved per request.",
        },
        { status: 400 },
      );
    }

    let providerAvailable = true;
    try {
      getEodhdApiKey();
    } catch {
      providerAvailable = false;
    }

    const fxRates = providerAvailable ? await getCachedFxRates() : null;
    const seen = new Set<string>();
    const quotes: AnalystApiQuote[] = [];

    if (providerAvailable) {
      for (const holding of holdings) {
        const providerSymbol = await resolveProviderSymbol(holding);
        if (!providerSymbol || seen.has(providerSymbol)) continue;
        seen.add(providerSymbol);

        const quote = await getCachedAnalystQuote({
          symbol: holding.symbol.trim().toUpperCase(),
          providerSymbol,
          name: holding.name ?? holding.symbol,
          fxRateToEur: fxRates?.USD ?? null,
        });

        quotes.push(quote);
      }
    }

    let recentActions: AnalystRecentAction[] = [];
    if (body.includeRecentActions !== false) {
      recentActions = await buildAnalystActionsFromNews(holdings);
    }

    return NextResponse.json({
      success: true,
      quotes,
      recentActions,
      providerAvailable,
      generatedAt: new Date().toISOString(),
      cache: {
        enabled: true,
        durationSeconds: CACHE_SECONDS,
      },
    });
  } catch (error) {
    console.error("Analyst intelligence failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Analyst data could not be loaded.",
      },
      { status: 500 },
    );
  }
}
