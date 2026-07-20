"use client";

import { useCallback, useEffect, useState } from "react";

import {
  readNewsCache,
  tryRefreshPortfolioNews,
} from "@/lib/client/portfolioNews";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const EMPTY_RESPONSE: NewsApiResponse = {
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
    sourceCount: 0,
    activeSourceNames: [],
  },
  sourceErrors: [],
  fetchedAt: new Date().toISOString(),
};

export function usePortfolioNews(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const [payload, setPayload] = useState<NewsApiResponse | null>(() => {
    if (!userSub) return null;
    return readNewsCache(userSub)?.response ?? null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setPayload(EMPTY_RESPONSE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await tryRefreshPortfolioNews(userSub, holdings);
      setPayload(result.response);
      setIsStale(result.isStale);
    } catch (caught) {
      setPayload(null);
      setError(
        caught instanceof Error ? caught.message : "News could not be loaded.",
      );
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
    error,
    isStale,
    reload,
  };
}
