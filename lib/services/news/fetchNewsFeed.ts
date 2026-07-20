import { unstable_cache } from "next/cache";

import { CURATED_YOUTUBE_SOURCES } from "@/lib/services/news/newsSources";
import { createYouTubeProviders } from "@/lib/services/news/providers/youtubeRssProvider";
import { fetchEodhdNewsFeed } from "@/lib/services/news/providers/eodhdNewsProvider";
import type { NewsContentItem } from "@/lib/types/newsContent";

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_SECONDS = 45 * 60;

const youtubeProviders = createYouTubeProviders(CURATED_YOUTUBE_SOURCES);

export async function fetchYouTubeNewsItems(): Promise<{
  items: NewsContentItem[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
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
  return { items, sourceErrors };
}

const getCachedYouTubeNewsItems = unstable_cache(
  fetchYouTubeNewsItems,
  ["investment-os-news-youtube-v4"],
  { revalidate: CACHE_SECONDS },
);

export async function fetchSharedRawNewsItems(providerSymbols: string[]): Promise<{
  items: NewsContentItem[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
  fetchedAt: string;
  eodhdAvailable: boolean;
}> {
  const fetchedAt = new Date().toISOString();

  const [youtube, eodhd] = await Promise.all([
    getCachedYouTubeNewsItems(),
    fetchEodhdNewsFeed({ providerSymbols, fetchedAt }),
  ]);

  const sourceErrors = [...youtube.sourceErrors];
  if (eodhd.error) {
    sourceErrors.push({
      sourceId: eodhd.sourceId,
      sourceName: eodhd.sourceName,
      error: eodhd.error,
    });
  }

  return {
    items: [...youtube.items, ...eodhd.items],
    sourceErrors,
    fetchedAt,
    eodhdAvailable: eodhd.providerAvailable,
  };
}

export { CACHE_SECONDS };
