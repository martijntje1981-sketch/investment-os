/**
 * Shared cache-first POST /api/prices.
 * One in-flight request per user + symbol set. Live/manual forceRefresh stays separate.
 */

import {
  markAppEntryPriceRequestReused,
  markAppEntryPriceRequestStarted,
} from "@/lib/client/appEntryPerformanceMarks";
import type {
  PortfolioInstrumentPayload,
  PriceApiResponse,
} from "@/lib/types/portfolioStorage";

export type CacheFirstPriceQuoteResult = {
  ok: boolean;
  data: PriceApiResponse;
  reused: boolean;
};

type SharedResult = { ok: boolean; data: PriceApiResponse };

const inFlight = new Map<string, Promise<SharedResult>>();

let postsStartedForTests = 0;
let postsReusedForTests = 0;

export function __countCacheFirstPricePostsForTests(): number {
  return postsStartedForTests;
}

export function __countCacheFirstPriceReusesForTests(): number {
  return postsReusedForTests;
}

export function __resetCacheFirstPriceQuotesForTests(): void {
  inFlight.clear();
  postsStartedForTests = 0;
  postsReusedForTests = 0;
}

function quoteRequestKey(
  userSub: string,
  payload: PortfolioInstrumentPayload[],
): string {
  const symbols = payload
    .map(
      (holding) =>
        holding.providerSymbol?.trim() ||
        holding.symbol?.trim() ||
        holding.id,
    )
    .filter(Boolean)
    .sort()
    .join("|");
  return `${userSub}::cacheFirst::${symbols}`;
}

async function postCacheFirstPrices(
  payload: PortfolioInstrumentPayload[],
): Promise<SharedResult> {
  postsStartedForTests += 1;
  markAppEntryPriceRequestStarted();

  const response = await fetch("/api/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      holdings: payload,
      forceRefresh: false,
      estimateOnly: false,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as PriceApiResponse;
  return { ok: response.ok, data };
}

export async function fetchCacheFirstPriceQuotes(
  userSub: string,
  payload: PortfolioInstrumentPayload[],
): Promise<CacheFirstPriceQuoteResult> {
  if (!userSub || payload.length === 0) {
    return {
      ok: true,
      data: { success: true, prices: [], requested: 0, received: 0 },
      reused: false,
    };
  }

  const key = quoteRequestKey(userSub, payload);
  const existing = inFlight.get(key);
  if (existing) {
    postsReusedForTests += 1;
    markAppEntryPriceRequestReused();
    const shared = await existing;
    return { ...shared, reused: true };
  }

  const request = postCacheFirstPrices(payload).finally(() => {
    if (inFlight.get(key) === request) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, request);

  const shared = await request;
  return { ...shared, reused: false };
}
