import { unstable_cache } from "next/cache";

import { CURATED_YOUTUBE_SOURCES } from "@/lib/services/news/newsSources";
import { OFFICIAL_MACRO_FEEDS } from "@/lib/services/news/officialMacro/feeds";
import { createOfficialMacroProviders } from "@/lib/services/news/officialMacro/provider";
import { createYouTubeProviders } from "@/lib/services/news/providers/youtubeRssProvider";
import { fetchEodhdNewsFeed } from "@/lib/services/news/providers/eodhdNewsProvider";
import type { NewsContentItem } from "@/lib/types/newsContent";

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_SECONDS = 45 * 60;

const youtubeProviders = createYouTubeProviders(CURATED_YOUTUBE_SOURCES);
const officialMacroProviders = createOfficialMacroProviders(OFFICIAL_MACRO_FEEDS);

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

export async function fetchOfficialMacroNewsItems(): Promise<{
  items: NewsContentItem[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
}> {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(
    officialMacroProviders.map((provider) =>
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

  return {
    items: results.flatMap((result) => result.items),
    sourceErrors,
  };
}

const getCachedOfficialMacroNewsItems = unstable_cache(
  fetchOfficialMacroNewsItems,
  ["investment-os-news-official-macro-v1"],
  { revalidate: CACHE_SECONDS },
);

export async function fetchSharedRawNewsItems(providerSymbols: string[]): Promise<{
  items: NewsContentItem[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
  fetchedAt: string;
  eodhdAvailable: boolean;
  eodhdLastUpdated: string | null;
  eodhdServedFromCache: boolean;
}> {
  const fetchedAt = new Date().toISOString();

  const [youtube, officialMacro, eodhd] = await Promise.all([
    getCachedYouTubeNewsItems(),
    getCachedOfficialMacroNewsItems(),
    fetchEodhdNewsFeed({ providerSymbols, fetchedAt }),
  ]);

  const sourceErrors = [...youtube.sourceErrors, ...officialMacro.sourceErrors];

  if (eodhd.error) {
    console.info("[news] wire_news_source_unavailable", {
      errorCode: eodhd.error,
      servedFromCache: eodhd.servedFromCache,
      lastSuccessfulUpdate: eodhd.lastSuccessfulUpdate,
      diagnostics: eodhd.diagnostics,
    });
  }

  return {
    items: [...youtube.items, ...officialMacro.items, ...eodhd.items],
    sourceErrors,
    fetchedAt,
    eodhdAvailable: eodhd.providerAvailable,
    eodhdLastUpdated: eodhd.lastSuccessfulUpdate,
    eodhdServedFromCache: eodhd.servedFromCache,
  };
}

export { CACHE_SECONDS };
