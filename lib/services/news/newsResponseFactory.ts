import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";

export function createDegradedNewsResponse(input?: {
  fetchedAt?: string;
  sourceErrors?: NewsApiResponse["sourceErrors"];
  recoveryMessage?: string;
}): NewsApiResponse {
  const fetchedAt = input?.fetchedAt ?? new Date().toISOString();
  const sourceErrors = input?.sourceErrors ?? [];

  if (input?.recoveryMessage) {
    sourceErrors.push({
      sourceId: "news-hub",
      sourceName: "News hub",
      error: input.recoveryMessage,
    });
  }

  return {
    success: true,
    marketBrief: createEmptyMarketBrief(fetchedAt),
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
    sourceErrors,
    fetchedAt,
  };
}

export function isRenderableNewsResponse(
  value: unknown,
): value is NewsApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as NewsApiResponse;
  return Boolean(candidate.marketBrief && candidate.dataStatus && candidate.fetchedAt);
}

export function coerceNewsApiResponse(
  value: unknown,
  fallbackMessage?: string,
): NewsApiResponse {
  if (isRenderableNewsResponse(value)) {
    return {
      ...value,
      success: true,
      portfolioNews: value.portfolioNews ?? [],
      macroNews: value.macroNews ?? [],
      marketVideos: value.marketVideos ?? [],
      upcomingEvents: value.upcomingEvents ?? [],
      sourceErrors: value.sourceErrors ?? [],
    };
  }

  return createDegradedNewsResponse({
    recoveryMessage: fallbackMessage,
  });
}
