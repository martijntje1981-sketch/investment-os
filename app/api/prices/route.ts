/**
 * GET/POST /api/prices
 *
 * Thin HTTP wrapper around the centralized PriceService.
 * All provider access, caching, and deduplication live in lib/services/prices/.
 */

import { NextResponse } from "next/server";
import {
  loadDefaultWatchlistPrices,
  loadPricesForHoldings,
} from "@/lib/services/prices/priceService";
import type {
  PriceHoldingInput,
  PricePayload,
} from "@/lib/services/prices/types";

export const dynamic = "force-dynamic";

const HTTP_CACHE_SECONDS = 12 * 60;

function jsonResponse(payload: PricePayload, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${HTTP_CACHE_SECONDS}, stale-while-revalidate=${HTTP_CACHE_SECONDS * 2}`,
    },
  });
}

/** Backward-compatible GET — prices for the default demo watchlist. */
export async function GET() {
  try {
    const payload = await loadDefaultWatchlistPrices();
    return jsonResponse(payload, payload.success ? 200 : 503);
  } catch (error) {
    console.error("Prices API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading market prices.",
        cache: { enabled: true, durationSeconds: HTTP_CACHE_SECONDS },
      },
      { status: 500 },
    );
  }
}

type PostBody = {
  holdings?: PriceHoldingInput[];
};

/**
 * POST — fetch live prices for caller-supplied holdings.
 * Uses stored providerSymbol when available; otherwise resolves via Match Engine.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holdings were supplied." },
        { status: 400 },
      );
    }

    const payload = await loadPricesForHoldings(holdings);
    return jsonResponse(payload, payload.success ? 200 : 503);
  } catch (error) {
    console.error("Prices API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while loading market prices.",
        cache: { enabled: true, durationSeconds: HTTP_CACHE_SECONDS },
      },
      { status: 500 },
    );
  }
}
