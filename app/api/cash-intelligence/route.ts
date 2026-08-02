/**
 * GET /api/cash-intelligence
 *
 * Returns official cash benchmark rates (server-side providers only).
 * No bank/broker fields. No secrets required for public official APIs.
 * FX enrichment is best-effort — benchmarks still return if FX is unavailable.
 */

import { NextResponse } from "next/server";

import { fetchCashBenchmarks } from "@/lib/services/cashIntelligence/fetchCashBenchmarks";
import { CASH_INTELLIGENCE_DISCLAIMER } from "@/lib/services/cashIntelligence/types";
import { loadBaseCurrencyFxSnapshot } from "@/lib/services/prices/priceService";
import {
  DEFAULT_PORTFOLIO_BASE_CURRENCY,
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeFxSnapshot(currency: PortfolioBaseCurrency) {
  try {
    return await loadBaseCurrencyFxSnapshot(currency);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const baseCurrency = normalizePortfolioBaseCurrency(
      searchParams.get("baseCurrency") ?? DEFAULT_PORTFOLIO_BASE_CURRENCY,
    );

    const benchmarks = await fetchCashBenchmarks();
    const [baseFx, usdFx, gbpFx] = await Promise.all([
      safeFxSnapshot(baseCurrency),
      safeFxSnapshot("USD"),
      safeFxSnapshot("GBP"),
    ]);

    return NextResponse.json(
      {
        success: true,
        benchmarks,
        fx: {
          baseCurrency: baseFx?.baseCurrency ?? baseCurrency,
          rates: {
            EUR: 1,
            USD_TO_EUR: usdFx?.foreignToEurRate ?? null,
            GBP_TO_EUR: gbpFx?.foreignToEurRate ?? null,
          },
          status: baseFx?.status ?? "unavailable",
          updatedAt: baseFx?.updatedAt ?? null,
        },
        disclaimer: CASH_INTELLIGENCE_DISCLAIMER,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Cash intelligence is temporarily unavailable.",
        disclaimer: CASH_INTELLIGENCE_DISCLAIMER,
      },
      { status: 503 },
    );
  }
}
