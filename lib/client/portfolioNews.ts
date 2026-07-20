/**
 * Client-side news cache and refresh.
 */

import { newsCacheKey } from "@/lib/client/portfolioStorageKeys";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CACHE_MAX_AGE_MS = 1000 * 60 * 45;

type NewsCachePayload = {
  response: NewsApiResponse;
  cachedAt: string;
};

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

export function isNewsCacheFresh(cachedAt: string | undefined): boolean {
  if (!cachedAt) return false;
  const age = Date.now() - new Date(cachedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < CACHE_MAX_AGE_MS;
}

export async function refreshPortfolioNews(
  userSub: string,
  holdings: StoredPortfolioHolding[],
): Promise<NewsApiResponse> {
  const response = await fetch("/api/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdings }),
    cache: "no-store",
  });

  const data = (await response.json()) as NewsApiResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "News could not be loaded.");
  }

  writeNewsCache(userSub, data);
  return data;
}

export async function tryRefreshPortfolioNews(
  userSub: string | null,
  holdings: StoredPortfolioHolding[],
): Promise<{ response: NewsApiResponse; fromCache: boolean; isStale: boolean }> {
  const cached = userSub ? readNewsCache(userSub) : null;

  if (userSub && cached && isNewsCacheFresh(cached.cachedAt)) {
    return { response: cached.response, fromCache: true, isStale: false };
  }

  if (!userSub) {
    const response = await fetch("/api/news", {
      method: "GET",
      cache: "no-store",
    }).then((res) => res.json() as Promise<NewsApiResponse>);

    return { response, fromCache: false, isStale: false };
  }

  try {
    const response = await refreshPortfolioNews(userSub, holdings);
    return { response, fromCache: false, isStale: false };
  } catch {
    if (cached) {
      return { response: cached.response, fromCache: true, isStale: true };
    }
    throw new Error("News could not be loaded.");
  }
}
