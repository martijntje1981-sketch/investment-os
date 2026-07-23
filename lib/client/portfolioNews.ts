/**
 * Client-side news cache and refresh.
 */

import { newsCacheKey } from "@/lib/client/portfolioStorageKeys";
import { coerceNewsApiResponse } from "@/lib/services/news/newsResponseFactory";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const NEWS_CACHE_MAX_AGE_MS = 1000 * 60 * 45;

type NewsCachePayload = {
  response: NewsApiResponse;
  cachedAt: string;
};

export type NewsRefreshResult = {
  response: NewsApiResponse;
  fromCache: boolean;
  isStale: boolean;
};

let newsRefreshInFlight: Promise<NewsRefreshResult> | null = null;

export function isNewsRefreshInFlight(): boolean {
  return newsRefreshInFlight !== null;
}

export function resetNewsRefreshStateForTests(): void {
  newsRefreshInFlight = null;
}

export function readNewsCache(userSub: string): NewsCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(newsCacheKey(userSub));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewsCachePayload;
    if (!parsed.response || !parsed.cachedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeNewsCache(userSub: string, response: NewsApiResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    newsCacheKey(userSub),
    JSON.stringify({
      response,
      cachedAt: new Date().toISOString(),
    } satisfies NewsCachePayload),
  );
}

export function isNewsCacheFresh(
  cachedAt: string | undefined,
  now = Date.now(),
): boolean {
  if (!cachedAt) return false;
  const age = now - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < NEWS_CACHE_MAX_AGE_MS;
}

async function readNewsResponse(response: Response): Promise<NewsApiResponse> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (isRenderableNewsPayload(body)) {
    return coerceNewsApiResponse(body);
  }

  if (!response.ok) {
    return coerceNewsApiResponse(null, "News feeds are temporarily unavailable.");
  }

  return coerceNewsApiResponse(body);
}

function isRenderableNewsPayload(value: unknown): value is NewsApiResponse {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "marketBrief" in (value as NewsApiResponse)
  );
}

async function fetchPortfolioNewsFromApi(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<NewsApiResponse> {
  const response = await fetch("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings }),
    cache: "no-store",
  });

  const data = await readNewsResponse(response);
  writeNewsCache(userSub, data);
  return data;
}

async function runSharedNewsRefresh(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<NewsRefreshResult> {
  if (newsRefreshInFlight) {
    return newsRefreshInFlight;
  }

  const run = (async (): Promise<NewsRefreshResult> => {
    const response = await fetchPortfolioNewsFromApi(userSub, holdings);
    return {
      response,
      fromCache: false,
      isStale: response.dataStatus.feedsState !== "live",
    };
  })();

  newsRefreshInFlight = run;

  try {
    return await run;
  } finally {
    newsRefreshInFlight = null;
  }
}

export async function refreshPortfolioNews(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<NewsApiResponse> {
  const result = await runSharedNewsRefresh(userSub, holdings);
  return result.response;
}

export async function tryRefreshPortfolioNews(
  userSub: string | null,
  holdings: StoredPortfolioHolding[],
): Promise<NewsRefreshResult> {
  const cached = userSub ? readNewsCache(userSub) : null;

  if (userSub && cached && isNewsCacheFresh(cached.cachedAt)) {
    return { response: cached.response, fromCache: true, isStale: false };
  }

  if (!userSub) {
    try {
      const response = await fetch("/api/news", {
        method: "GET",
        cache: "no-store",
      }).then((res) => readNewsResponse(res));

      return {
        response,
        fromCache: false,
        isStale: response.dataStatus.feedsState !== "live",
      };
    } catch {
      return {
        response: coerceNewsApiResponse(
          null,
          "News feeds are temporarily unavailable.",
        ),
        fromCache: false,
        isStale: false,
      };
    }
  }

  try {
    return await runSharedNewsRefresh(userSub, holdings);
  } catch {
    if (cached) {
      return { response: cached.response, fromCache: true, isStale: true };
    }

    return {
      response: coerceNewsApiResponse(
        null,
        "News feeds are temporarily unavailable.",
      ),
      fromCache: false,
      isStale: false,
    };
  }
}
