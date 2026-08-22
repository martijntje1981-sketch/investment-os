/**
 * GET /api/market-pulse
 * POST body may include holdings for portfolio linking.
 */

import { NextResponse } from "next/server";

import { buildMarketPulseSnapshot } from "@/lib/services/marketPulse/buildMarketPulseSnapshot";
import { fetchMarketPulseRealtimeQuote } from "@/lib/services/marketPulse/fetchQuotes";
import type { MarketPulsePeriod } from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const dynamic = "force-dynamic";

type Body = {
  holdings?: StoredPortfolioHolding[];
  filter?: "all" | "portfolio";
  momentumPeriod?: MarketPulsePeriod;
  featuredMarketId?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];
    const snapshot = await buildMarketPulseSnapshot({
      holdings,
      filter: body.filter === "all" ? "all" : "portfolio",
      momentumPeriod: body.momentumPeriod ?? "1M",
      featuredMarketId: body.featuredMarketId ?? null,
      deps: {
        fetchQuote: fetchMarketPulseRealtimeQuote,
      },
    });

    return NextResponse.json(
      { success: true, snapshot },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Market Pulse API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Market Pulse.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const snapshot = await buildMarketPulseSnapshot({
      holdings: [],
      deps: { fetchQuote: fetchMarketPulseRealtimeQuote },
    });
    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Market Pulse.",
      },
      { status: 500 },
    );
  }
}
