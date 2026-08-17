/**
 * POST /api/portfolio/performance
 *
 * Builds multi-range portfolio value history from EODHD EOD closes.
 * Server-only — never invents prices. 1D remains client-side previousClose.
 */

import { NextResponse } from "next/server";

import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";
import { fetchEodhdEodHistory } from "@/lib/services/marketPulse/eodHistory";
import {
  buildHistoricalPortfolioSeries,
  resolvePerformanceHistoryWindow,
} from "@/lib/services/performance";
import type {
  EodHistoryPoint,
  PerformanceHistoryHoldingInput,
  PerformanceHistoryPeriodId,
  PortfolioPerformanceHistoryApiResponse,
} from "@/lib/services/performance/types";
import { fetchEodhdFxRates } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import type { PriceCurrency } from "@/lib/services/prices/types";
import type { PerformancePeriodId } from "@/lib/client/performance/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CACHE_TTL_MS = 60 * 60 * 1000;
const HISTORY_PERIODS = new Set<PerformanceHistoryPeriodId>([
  "1W",
  "1M",
  "YTD",
  "1Y",
  "ALL",
]);

type CacheEntry = {
  expiresAt: number;
  payload: PortfolioPerformanceHistoryApiResponse;
};

const seriesCache = new Map<string, CacheEntry>();

type RequestBody = {
  period?: string;
  holdings?: PerformanceHistoryHoldingInput[];
};

function isHistoryPeriod(value: string): value is PerformanceHistoryPeriodId {
  return HISTORY_PERIODS.has(value as PerformanceHistoryPeriodId);
}

function normalizeHoldings(
  holdings: PerformanceHistoryHoldingInput[],
): PerformanceHistoryHoldingInput[] {
  return holdings.map((holding) => ({
    id: String(holding.id ?? holding.symbol ?? ""),
    symbol: String(holding.symbol ?? "")
      .trim()
      .toUpperCase(),
    quantity: Number(holding.quantity),
    providerSymbol: holding.providerSymbol?.trim()
      ? holding.providerSymbol.trim().toUpperCase()
      : null,
    quoteCurrency: holding.quoteCurrency ?? null,
    assetType: holding.assetType ?? "investment",
    currentPrice:
      typeof holding.currentPrice === "number"
        ? holding.currentPrice
        : undefined,
  }));
}

function cacheKey(
  period: PerformanceHistoryPeriodId,
  holdings: PerformanceHistoryHoldingInput[],
  fromIso: string,
  toIso: string,
  granularity: string,
): string {
  const parts = holdings
    .map((holding) => {
      if (holding.assetType === "cash") {
        return `cash:${holding.id}:${holding.quantity}:${holding.currentPrice ?? 1}`;
      }
      return [
        holding.providerSymbol ?? "",
        holding.quantity,
        holding.quoteCurrency ?? "EUR",
      ].join(":");
    })
    .sort();
  return `${period}|${fromIso}|${toIso}|${granularity}|${parts.join(",")}`;
}

function emptyUnavailable(
  period: PerformancePeriodId,
  message: string,
): PortfolioPerformanceHistoryApiResponse {
  return {
    success: true,
    period,
    chartPoints: [],
    startingValue: null,
    endingValue: null,
    investmentReturn: null,
    investmentReturnPercent: null,
    dataAvailability: "unavailable",
    availabilityMessage: message,
    historicalFxApproximate: false,
    coveredHoldingCount: 0,
    skippedHoldingCount: 0,
  };
}

function collectRequiredCurrencies(
  holdings: PerformanceHistoryHoldingInput[],
): PriceCurrency[] {
  const set = new Set<PriceCurrency>(["EUR"]);
  for (const holding of holdings) {
    if (holding.assetType === "cash") continue;
    const raw = holding.quoteCurrency?.trim().toUpperCase();
    if (raw === "USD" || raw === "GBP" || raw === "CHF") {
      set.add(raw);
    }
  }
  return [...set];
}

export function resetPortfolioPerformanceHistoryCacheForTests() {
  seriesCache.clear();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const periodRaw = typeof body.period === "string" ? body.period : "";
    const holdingsRaw = Array.isArray(body.holdings) ? body.holdings : [];

    if (periodRaw === "1D") {
      return NextResponse.json(
        {
          success: false,
          error:
            "1D performance uses client-side previous-close data and is not served by this endpoint.",
        },
        { status: 400 },
      );
    }

    if (!isHistoryPeriod(periodRaw)) {
      return NextResponse.json(
        { success: false, error: "Invalid performance period." },
        { status: 400 },
      );
    }

    const period = periodRaw;
    const holdings = normalizeHoldings(holdingsRaw);

    if (holdings.length === 0) {
      return NextResponse.json(
        emptyUnavailable(
          period,
          "Add holdings to track portfolio performance.",
        ),
      );
    }

    try {
      getEodhdApiKey();
    } catch {
      return NextResponse.json(
        emptyUnavailable(
          period,
          "Market history is unavailable because the price provider is not configured.",
        ),
      );
    }

    const window = resolvePerformanceHistoryWindow(period);
    const key = cacheKey(
      period,
      holdings,
      window.fromIsoDate,
      window.toIsoDate,
      window.granularity,
    );
    const cached = seriesCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload);
    }

    const providerSymbols = [
      ...new Set(
        holdings
          .filter((holding) => holding.assetType !== "cash")
          .map((holding) => holding.providerSymbol)
          .filter((symbol): symbol is string => Boolean(symbol)),
      ),
    ];

    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>();

    await Promise.all(
      providerSymbols.map(async (providerSymbol) => {
        try {
          const points = await fetchEodhdEodHistory(
            providerSymbol,
            window.fromIsoDate,
            window.toIsoDate,
          );
          historyByProviderSymbol.set(
            providerSymbol,
            points.map((point) => ({
              date: point.date,
              value: point.value,
            })),
          );
        } catch {
          historyByProviderSymbol.set(providerSymbol, []);
        }
      }),
    );

    const requiredCurrencies = collectRequiredCurrencies(holdings);
    let fxRateToEur: Record<string, number | null> = { EUR: 1 };
    try {
      const fx = await fetchEodhdFxRates(undefined, { requiredCurrencies });
      fxRateToEur = {
        EUR: 1,
        USD: fx.rates.USD,
        GBP: fx.rates.GBP,
        CHF: fx.rates.CHF,
      };
    } catch {
      fxRateToEur = { EUR: 1, USD: null, GBP: null, CHF: null };
    }

    const series = buildHistoricalPortfolioSeries({
      holdings,
      historyByProviderSymbol,
      fxRateToEur,
      window,
      // Builder sets true when non-EUR listing closes use current FX.
    });

    const payload: PortfolioPerformanceHistoryApiResponse = {
      success: true,
      period: series.period,
      chartPoints: series.chartPoints,
      startingValue: series.startingValue,
      endingValue: series.endingValue,
      investmentReturn: series.investmentReturn,
      investmentReturnPercent: series.investmentReturnPercent,
      dataAvailability: series.dataAvailability,
      availabilityMessage: series.availabilityMessage,
      historicalFxApproximate: series.historicalFxApproximate,
      coveredHoldingCount: series.coveredHoldingCount,
      skippedHoldingCount: series.skippedHoldingCount,
      holdingMoves: series.holdingMoves,
    };

    seriesCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[portfolio/performance POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load portfolio performance history.",
      },
      { status: 500 },
    );
  }
}
