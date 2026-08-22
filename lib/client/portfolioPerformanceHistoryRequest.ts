/**
 * User-scoped in-flight + success cache for POST /api/portfolio/performance.
 * Same user + period + holdings fingerprint shares one request.
 */

import {
  markAppEntryGoalRealityExtraHistoryReady,
  markAppEntryHistoryWeekMonthReady,
} from "@/lib/client/appEntryPerformanceMarks";
import type { PerformancePeriodId } from "@/lib/client/performance/types";
import type {
  PerformanceHistoryHoldingInput,
  PortfolioPerformanceHistoryApiResponse,
} from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type PortfolioPerformanceHistoryRequestResult =
  | {
      ok: true;
      data: PortfolioPerformanceHistoryApiResponse;
      reused: boolean;
    }
  | {
      ok: false;
      error: string;
      reused: boolean;
    };

const inFlight = new Map<
  string,
  Promise<PortfolioPerformanceHistoryRequestResult>
>();
const successCache = new Map<string, PortfolioPerformanceHistoryApiResponse>();

let postsStartedForTests = 0;
let postsReusedForTests = 0;

export function __countPerformanceHistoryPostsForTests(): number {
  return postsStartedForTests;
}

export function __countPerformanceHistoryReusesForTests(): number {
  return postsReusedForTests;
}

export function __resetPortfolioPerformanceHistoryRequestsForTests(): void {
  inFlight.clear();
  successCache.clear();
  postsStartedForTests = 0;
  postsReusedForTests = 0;
}

export function toHistoryHolding(
  holding: StoredPortfolioHolding,
): PerformanceHistoryHoldingInput {
  return {
    id: holding.id,
    symbol: holding.symbol,
    quantity: holding.quantity,
    providerSymbol: holding.providerSymbol ?? null,
    quoteCurrency: holding.quoteCurrency ?? null,
    assetType: holding.assetType ?? "investment",
    currentPrice: holding.currentPrice,
  };
}

export function holdingsFingerprint(holdings: StoredPortfolioHolding[]): string {
  return holdings
    .map((holding) => {
      if (holding.assetType === "cash") {
        return `cash:${holding.id}:${holding.quantity}:${holding.currentPrice}`;
      }
      return [
        holding.id,
        holding.providerSymbol ?? "",
        holding.quantity,
        holding.quoteCurrency ?? "",
      ].join(":");
    })
    .sort()
    .join("|");
}

function historyRequestKey(
  userSub: string,
  period: PerformancePeriodId,
  fingerprint: string,
): string {
  return `${userSub}::${period}::${fingerprint}`;
}

function markPeriodReady(period: PerformancePeriodId): void {
  if (period === "1W" || period === "1M") {
    markAppEntryHistoryWeekMonthReady();
    return;
  }
  if (period === "1Y" || period === "ALL") {
    markAppEntryGoalRealityExtraHistoryReady();
  }
}

async function postPerformanceHistory(
  period: PerformancePeriodId,
  holdings: StoredPortfolioHolding[],
): Promise<PortfolioPerformanceHistoryRequestResult> {
  postsStartedForTests += 1;

  try {
    const response = await fetch("/api/portfolio/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period,
        holdings: holdings.map(toHistoryHolding),
      }),
      cache: "no-store",
    });

    const json = (await response.json()) as PortfolioPerformanceHistoryApiResponse & {
      error?: string;
    };

    if (!response.ok || !json.success) {
      return {
        ok: false,
        error: json.error ?? "Performance history could not be loaded.",
        reused: false,
      };
    }

    markPeriodReady(period);
    return { ok: true, data: json, reused: false };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Performance history could not be loaded.",
      reused: false,
    };
  }
}

export async function requestPortfolioPerformanceHistory(input: {
  userSub: string;
  period: PerformancePeriodId;
  holdings: StoredPortfolioHolding[];
}): Promise<PortfolioPerformanceHistoryRequestResult> {
  const { userSub, period, holdings } = input;
  if (!userSub || period === "1D" || holdings.length === 0) {
    return {
      ok: false,
      error: "Performance history could not be loaded.",
      reused: false,
    };
  }

  const fingerprint = holdingsFingerprint(holdings);
  const key = historyRequestKey(userSub, period, fingerprint);
  const cached = successCache.get(key);
  if (cached) {
    postsReusedForTests += 1;
    markPeriodReady(period);
    return { ok: true, data: cached, reused: true };
  }

  const existing = inFlight.get(key);
  if (existing) {
    postsReusedForTests += 1;
    const shared = await existing;
    if (shared.ok) {
      return { ok: true, data: shared.data, reused: true };
    }
    return { ok: false, error: shared.error, reused: true };
  }

  const request = postPerformanceHistory(period, holdings)
    .then((result) => {
      if (result.ok) {
        successCache.set(key, result.data);
      }
      return result;
    })
    .finally(() => {
      if (inFlight.get(key) === request) {
        inFlight.delete(key);
      }
    });

  inFlight.set(key, request);
  return request;
}
