import { unstable_cache } from "next/cache";

import { CURATED_YOUTUBE_SOURCES } from "@/lib/services/news/newsSources";
import { filterFinancialNewsItems } from "@/lib/services/news/financialContentFilter";
import { createYouTubeProviders } from "@/lib/services/news/providers/youtubeRssProvider";
import {
  partitionNewsHub,
  personalizeNewsItems,
} from "@/lib/services/news/relevanceMatching";
import {
  buildTodaysMarketBrief,
  createEmptyMarketBrief,
} from "@/lib/services/news/marketBrief";
import { enrichNewsItems } from "@/lib/services/news/newsSummary";
import { filterPortfolioAnalystNews } from "@/lib/services/news/analystNews";
import { filterPortfolioDividendNews } from "@/lib/services/news/dividendNews";
import { fetchUpcomingMarketEvents } from "@/lib/services/news/upcomingEvents";
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
  ["investment-os-news-youtube-v3"],
  { revalidate: CACHE_SECONDS },
);

export async function buildNewsResponse(
  holdings: StoredPortfolioHolding[] = [],
): Promise<NewsApiResponse> {
  const [{ items, sourceErrors, fetchedAt }, upcomingEvents] = await Promise.all([
    getCachedRawNewsItems(),
    fetchUpcomingMarketEvents(),
  ]);

  const financialItems = filterFinancialNewsItems(items);
  const personalized = enrichNewsItems(
    personalizeNewsItems(financialItems, holdings),
  );
  const sections = partitionNewsHub(personalized);
  const dividendNews = filterPortfolioDividendNews(sections.portfolioNews);
  const analystNews = filterPortfolioAnalystNews(sections.portfolioNews);
  const marketBrief = buildTodaysMarketBrief(
    sections.portfolioNews,
    sections.macroNews,
    upcomingEvents,
    fetchedAt,
  );

  return {
    success: true,
    marketBrief,
    portfolioNews: sections.portfolioNews,
    macroNews: sections.macroNews,
    marketVideos: sections.marketVideos,
    dividendNews,
    analystNews,
    upcomingEvents,
    sourceErrors,
    fetchedAt,
  };
}

export { CURATED_YOUTUBE_SOURCES, createEmptyMarketBrief };
