import type { NewsContentItem } from "@/lib/types/newsContent";

/** Fresh window — matches YouTube/server news cache cadence. */
export const EODHD_NEWS_FRESH_MS = 45 * 60 * 1000;

/** Stale window — keep verified wire headlines during provider outages. */
export const EODHD_NEWS_STALE_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = {
  items: NewsContentItem[];
  fetchedAt: string;
  lastSuccessfulUpdate: string;
  expiresAt: number;
  staleUntil: number;
};

const cache = new Map<string, CacheEntry>();

export function buildEodhdNewsCacheKey(providerSymbols: string[]): string {
  const normalized = [
    ...new Set(
      providerSymbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].sort();

  return normalized.length > 0 ? normalized.join("|") : "__macro_only__";
}

export function readEodhdNewsCache(key: string): {
  items: NewsContentItem[];
  fetchedAt: string;
  lastSuccessfulUpdate: string;
  fresh: boolean;
} | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.staleUntil) {
    cache.delete(key);
    return null;
  }

  return {
    items: entry.items,
    fetchedAt: entry.fetchedAt,
    lastSuccessfulUpdate: entry.lastSuccessfulUpdate,
    fresh: now <= entry.expiresAt,
  };
}

export function writeEodhdNewsCache(
  key: string,
  items: NewsContentItem[],
  fetchedAt: string,
): void {
  const now = Date.now();
  cache.set(key, {
    items,
    fetchedAt,
    lastSuccessfulUpdate: fetchedAt,
    expiresAt: now + EODHD_NEWS_FRESH_MS,
    staleUntil: now + EODHD_NEWS_STALE_MS,
  });
}

export function resetEodhdNewsCacheForTests(): void {
  cache.clear();
}
