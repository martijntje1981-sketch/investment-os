"use client";

import { useCallback, useEffect, useState } from "react";

import {
  isNewsCacheFresh,
  readNewsCache,
  refreshPortfolioNews,
  tryRefreshPortfolioNews,
} from "@/lib/client/portfolioNews";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const EMPTY_NEWS_RESPONSE: NewsApiResponse = {
  success: true,
  marketBrief: createEmptyMarketBrief(new Date().toISOString()),
  portfolioNews: [],
  macroNews: [],
  marketVideos: [],
  upcomingEvents: [],
  dataStatus: {
    feedsState: "unavailable",
    eventsState: "provider_unavailable",
    eodhdNewsAvailable: false,
    eodhdLastUpdated: null,
    sourceCount: 0,
    activeSourceNames: [],
    unavailableSourceCount: 0,
  },
  sourceErrors: [],
  fetchedAt: new Date().toISOString(),
};

function readInitialNewsPayload(userSub: string | null): NewsApiResponse {
  if (!userSub) return EMPTY_NEWS_RESPONSE;
  return readNewsCache(userSub)?.response ?? EMPTY_NEWS_RESPONSE;
}

function initialNewsLoading(userSub: string | null, enabled: boolean): boolean {
  if (!enabled || !userSub) return false;
  const cached = readNewsCache(userSub);
  return !(cached && isNewsCacheFresh(cached.cachedAt));
}

export function usePortfolioNews(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const [payload, setPayload] = useState<NewsApiResponse>(() =>
    readInitialNewsPayload(userSub),
  );
  const [isLoading, setIsLoading] = useState(() =>
    initialNewsLoading(userSub, enabled),
  );
  const [isStale, setIsStale] = useState(false);

  const reload = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled) {
        setPayload(EMPTY_NEWS_RESPONSE);
        setIsLoading(false);
        setIsStale(false);
        return;
      }

      const cached = userSub ? readNewsCache(userSub) : null;
      const hasFreshCache = Boolean(
        cached && isNewsCacheFresh(cached.cachedAt) && !options?.force,
      );

      if (!hasFreshCache) {
        setIsLoading(true);
      }

      try {
        if (userSub) {
          const result = options?.force
            ? {
                response: await refreshPortfolioNews(userSub, holdings),
                fromCache: false,
                isStale: false,
              }
            : await tryRefreshPortfolioNews(userSub, holdings);

          setPayload(result.response);
          setIsStale(
            result.isStale || result.response.dataStatus.feedsState !== "live",
          );
          return;
        }

        const result = await tryRefreshPortfolioNews(userSub, holdings);
        setPayload(result.response);
        setIsStale(result.isStale);
      } catch {
        const fallback = userSub ? readNewsCache(userSub) : null;
        setPayload(fallback?.response ?? EMPTY_NEWS_RESPONSE);
        setIsStale(true);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, holdings, userSub],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    payload,
    isLoading,
    isStale,
    reload,
  };
}
