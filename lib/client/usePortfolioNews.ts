"use client";

import { useCallback, useEffect, useState } from "react";

import {
  readNewsCache,
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

export function usePortfolioNews(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const [payload, setPayload] = useState<NewsApiResponse>(() => {
    if (!userSub) return EMPTY_NEWS_RESPONSE;
    return readNewsCache(userSub)?.response ?? EMPTY_NEWS_RESPONSE;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setPayload(EMPTY_NEWS_RESPONSE);
      setIsLoading(false);
      setIsStale(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await tryRefreshPortfolioNews(userSub, holdings);
      setPayload(result.response);
      setIsStale(result.isStale);
    } catch {
      const cached = userSub ? readNewsCache(userSub) : null;
      setPayload(cached?.response ?? EMPTY_NEWS_RESPONSE);
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, holdings, userSub]);

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
