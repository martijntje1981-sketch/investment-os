import type { NewsApiResponse, NewsDataStatus } from "@/lib/types/newsContent";

export const NEWS_PARTIAL_SOURCES_MESSAGE =
  "Some news sources are temporarily unavailable. Available verified news is shown below.";

export const NEWS_UNAVAILABLE_MESSAGE =
  "Verified news feeds are unavailable right now. No placeholder headlines are shown.";

export const NEWS_STALE_REFRESH_MESSAGE_PREFIX =
  "Showing the last successful news refresh from";

/** Enough verified items that one missing wire provider is immaterial. */
export const MIN_VERIFIED_ITEMS_TO_SUPPRESS_WARNING = 6;

export function countVerifiedNewsItems(payload: Pick<
  NewsApiResponse,
  "portfolioNews" | "macroNews" | "marketVideos" | "dividendNews" | "analystNews"
>): number {
  return (
    payload.portfolioNews.length +
    payload.macroNews.length +
    payload.marketVideos.length +
    (payload.dividendNews?.length ?? 0) +
    (payload.analystNews?.length ?? 0)
  );
}

export function hasPartialSourceFailures(
  dataStatus: NewsDataStatus,
  sourceErrorCount: number,
): boolean {
  return (
    dataStatus.feedsState === "partial" ||
    dataStatus.feedsState === "cached" ||
    sourceErrorCount > 0 ||
    dataStatus.unavailableSourceCount > 0
  );
}

export function resolveNewsPageWarning(input: {
  dataStatus: NewsDataStatus;
  sourceErrorCount: number;
  verifiedItemCount: number;
  isStale?: boolean;
}): { show: boolean; message: string | null } {
  if (input.isStale) {
    return { show: true, message: null };
  }

  if (
    input.dataStatus.feedsState === "unavailable" &&
    input.verifiedItemCount === 0
  ) {
    return { show: true, message: NEWS_UNAVAILABLE_MESSAGE };
  }

  if (
    input.dataStatus.feedsState === "cached" &&
    input.dataStatus.eodhdLastUpdated
  ) {
    return { show: true, message: null };
  }

  if (!hasPartialSourceFailures(input.dataStatus, input.sourceErrorCount)) {
    return { show: false, message: null };
  }

  if (
    input.verifiedItemCount >= MIN_VERIFIED_ITEMS_TO_SUPPRESS_WARNING &&
    input.dataStatus.feedsState !== "unavailable"
  ) {
    return { show: false, message: null };
  }

  if (input.verifiedItemCount > 0) {
    return { show: true, message: NEWS_PARTIAL_SOURCES_MESSAGE };
  }

  if (input.dataStatus.feedsState === "unavailable") {
    return { show: true, message: NEWS_UNAVAILABLE_MESSAGE };
  }

  return { show: true, message: NEWS_PARTIAL_SOURCES_MESSAGE };
}

export function shouldRenderSourceErrorList(): boolean {
  return false;
}
