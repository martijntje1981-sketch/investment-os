"use client";

import { useMemo } from "react";

import {
  tryRefreshPortfolioNews,
  readNewsCache,
} from "@/lib/client/portfolioNews";
import {
  EMPTY_NEWS_RESPONSE,
  usePortfolioNews,
} from "@/lib/client/usePortfolioNews";
import {
  buildInvestmentIntelligence,
  type InvestmentIntelligence,
} from "@/lib/services/news/investmentIntelligence";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function deriveInvestmentIntelligence(
  payload: NewsApiResponse,
): InvestmentIntelligence {
  return buildInvestmentIntelligence(payload);
}

export function useInvestmentIntelligence(
  holdings: StoredPortfolioHolding[],
  userSub: string | null,
  enabled = true,
) {
  const { payload, isLoading, isStale, reload } = usePortfolioNews(
    holdings,
    userSub,
    enabled,
  );

  const intelligence = useMemo(
    () => deriveInvestmentIntelligence(payload),
    [payload],
  );

  return {
    intelligence,
    payload,
    isLoading,
    isStale,
    reload,
  };
}

export { EMPTY_NEWS_RESPONSE, readNewsCache, tryRefreshPortfolioNews };
