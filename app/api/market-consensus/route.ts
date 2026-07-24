/**
 * POST /api/market-consensus
 *
 * Batch-resolves provider-neutral market consensus for portfolio holdings.
 * Provider calls remain server-side only.
 */

import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { getEodhdApiKey } from "@/lib/services/instruments";
import {
  getMarketConsensusBundle,
  resolveProviderSymbolForConsensus,
} from "@/lib/services/marketConsensus";
import type { MarketConsensusApiResponse } from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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
  ["investment-os-market-consensus-fx-rates"],
  { revalidate: CACHE_SECONDS, tags: ["market-consensus-fx"] },
);

type MarketConsensusRequestBody = {
  holdings?: StoredPortfolioHolding[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarketConsensusRequestBody;
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

    const normalizedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        if (holding.providerSymbol?.trim()) {
          return holding;
        }

        const providerSymbol = await resolveProviderSymbolForConsensus(holding);
        if (!providerSymbol) {
          return holding;
        }

        return {
          ...holding,
          providerSymbol,
        };
      }),
    );

    const fxRates = providerAvailable ? await getCachedFxRates() : null;
    const { results, summary } = await getMarketConsensusBundle(
      normalizedHoldings,
      {
        fxRateToEur: fxRates?.USD ?? null,
        providerAvailable,
      },
    );

    const response: MarketConsensusApiResponse = {
      success: true,
      results,
      summary,
      providerAvailable,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Market consensus failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Market consensus data could not be loaded.",
      },
      { status: 500 },
    );
  }
}
