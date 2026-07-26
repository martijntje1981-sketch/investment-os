/**
 * GET/POST /api/prices
 *
 * Thin HTTP wrapper around the centralized PriceService.
 * All provider access, caching, and deduplication live in lib/services/prices/.
 */

import { NextResponse } from "next/server";
import { logMarketDataRefreshTrace } from "@/lib/services/marketData/providerDiagnostics";
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

function jsonResponse(
  payload: PricePayload,
  status: number,
  options?: { forceRefresh?: boolean },
) {
  const forceRefresh = options?.forceRefresh ?? false;
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": forceRefresh
        ? "private, no-store"
        : `public, s-maxage=${HTTP_CACHE_SECONDS}, stale-while-revalidate=${HTTP_CACHE_SECONDS * 2}`,
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
  forceRefresh?: boolean;
  onlyProviderSymbols?: string[];
  estimateOnly?: boolean;
  /** Phase B: reuse PriceService FX cache for base-currency display (no holdings). */
  fxSnapshotOnly?: boolean;
  baseCurrency?: string;
};

/**
 * POST — fetch live prices for caller-supplied holdings.
 * Uses stored providerSymbol only; instrument matching is import/manual-only.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    const forceRefresh = body.forceRefresh ?? false;

    if (body.fxSnapshotOnly) {
      const { loadBaseCurrencyFxSnapshot } = await import(
        "@/lib/services/prices/priceService"
      );
      // Presentation FX must reuse the PriceService FX cache, but must not use
      // hard snapshotOnly on a cold cache (that returns null rates → Unavailable
      // until remount). Cache hits still avoid provider calls via getFxRates.
      const snapshot = await loadBaseCurrencyFxSnapshot(body.baseCurrency, {
        forceRefresh,
        snapshotOnly: false,
      });
      return NextResponse.json(
        { success: true, fxSnapshot: snapshot },
        {
          status: 200,
          headers: {
            "Cache-Control": forceRefresh
              ? "private, no-store"
              : `private, max-age=60, stale-while-revalidate=300`,
          },
        },
      );
    }

    const holdings = Array.isArray(body.holdings) ? body.holdings : [];
    const snapshotOnly = !forceRefresh && !(body.estimateOnly ?? false);

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holdings were supplied." },
        { status: 400 },
      );
    }

    logMarketDataRefreshTrace("api_route_post", {
      holdingsCount: holdings.length,
      forceRefresh,
      snapshotOnly,
      estimateOnly: body.estimateOnly ?? false,
    });

    const payload = await loadPricesForHoldings(holdings, {
      forceRefresh,
      snapshotOnly,
      onlyProviderSymbols: body.onlyProviderSymbols,
      estimateOnly: body.estimateOnly ?? false,
    });
    const status =
      body.estimateOnly || payload.success
        ? 200
        : 503;
    logMarketDataRefreshTrace("api_route_response", {
      forceRefresh,
      success: payload.success,
      requested: payload.requested,
      received: payload.received,
      quoteSource: payload.quoteSource ?? null,
      circuitOpen: payload.refreshSummary?.circuitOpen ?? null,
      providerCallsMade: payload.refreshSummary?.providerCallsMade ?? null,
    });
    return jsonResponse(payload, status, { forceRefresh });
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
