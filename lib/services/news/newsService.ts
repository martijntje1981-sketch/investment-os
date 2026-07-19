import { unstable_cache } from "next/cache";

import { CURATED_YOUTUBE_SOURCES } from "@/lib/services/news/newsSources";
import { createYouTubeProviders } from "@/lib/services/news/providers/youtubeRssProvider";
import {
  partitionNewsSections,
  personalizeNewsItems,
} from "@/lib/services/news/relevanceMatching";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_SECONDS = 45 * 60;

const youtubeProviders = createYouTubeProviders(CURATED_YOUTUBE_SOURCES);

async function fetchRawNewsItems(): Promise<{
  items: NewsContentItem[];
  sourceErrors: NewsApiResponse["sourceErrors"];
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(
    youtubeProviders.map((provider) =>
      provider.fetchItems({ fetchedAt, timeoutMs: FETCH_TIMEOUT_MS }),
    ),
  );

  const sourceErrors = results
    .filter((result) => result.error)
    .map((result) => ({
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      error: result.error ?? "Unknown feed error",
    }));

  const items = results.flatMap((result) => result.items);

  return { items, sourceErrors, fetchedAt };
}

const getCachedRawNewsItems = unstable_cache(
  fetchRawNewsItems,
  ["investment-os-news-youtube-v1"],
  { revalidate: CACHE_SECONDS },
);

export async function buildNewsResponse(
  holdings: StoredPortfolioHolding[] = [],
): Promise<NewsApiResponse> {
  const { items, sourceErrors, fetchedAt } = await getCachedRawNewsItems();
  const personalized = personalizeNewsItems(items, holdings);
  const displayItems =
    personalized.some((item) => item.relevanceScore > 0)
      ? personalized
      : sortRecentOnly(personalized);

  const sections = partitionNewsSections(displayItems);

  return {
    success: true,
    items: displayItems,
    forYou: sections.forYou.length > 0 ? sections.forYou : displayItems.slice(0, 8),
    markets: sections.markets.length > 0 ? sections.markets : displayItems,
    videos: sections.videos.length > 0 ? sections.videos : displayItems,
    sourceErrors,
    fetchedAt,
  };
}

function sortRecentOnly(items: NewsContentItem[]): NewsContentItem[] {
  return [...items].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
