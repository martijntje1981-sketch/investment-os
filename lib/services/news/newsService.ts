import { assignMarketCategories, isMacroNewsCandidate } from "@/lib/services/news/categorizeNews";
import {
  deduplicateCrossSourceNews,
  excludeNewsItemIds,
} from "@/lib/services/news/deduplicateNews";
import { fetchSharedRawNewsItems } from "@/lib/services/news/fetchNewsFeed";
import { filterFinancialNewsItems } from "@/lib/services/news/financialContentFilter";
import {
  buildTodaysMarketBrief,
  createEmptyMarketBrief,
} from "@/lib/services/news/marketBrief";
import { enrichNewsItems } from "@/lib/services/news/newsSummary";
import { filterPortfolioAnalystNews } from "@/lib/services/news/analystNews";
import { filterPortfolioDividendNews } from "@/lib/services/news/dividendNews";
import {
  providerSymbolsFromProfiles,
  rankPortfolioNews,
  resolveNewsHoldingProfiles,
  scoreNewsItemWithProfiles,
} from "@/lib/services/news/portfolioNewsMatching";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import { fetchUpcomingMarketEvents } from "@/lib/services/news/upcomingEvents";
import { createDegradedNewsResponse } from "@/lib/services/news/newsResponseFactory";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export async function buildNewsResponse(
  holdings: StoredPortfolioHolding[] = [],
): Promise<NewsApiResponse> {
  const profiles = await resolveNewsHoldingProfiles(holdings);
  const providerSymbols = providerSymbolsFromProfiles(profiles);

  const [
    {
      items,
      sourceErrors,
      fetchedAt,
      eodhdAvailable,
      eodhdLastUpdated,
      eodhdServedFromCache,
    },
    upcomingResult,
  ] = await Promise.all([
    fetchSharedRawNewsItems(providerSymbols),
    fetchUpcomingMarketEvents(),
  ]);

  const financialItems = filterFinancialNewsItems(items);
  const categorized = assignMarketCategories(financialItems);
  const deduped = deduplicateCrossSourceNews(categorized);

  const scored = deduped.map((item) => scoreNewsItemWithProfiles(item, profiles));
  const enriched = enrichNewsItems(scored);
  const sections = partitionNewsHub(enriched);

  const dividendNews = filterPortfolioDividendNews(sections.portfolioNews);
  const analystNews = filterPortfolioAnalystNews(sections.portfolioNews);
  const intelligenceIds = new Set([
    ...dividendNews.map((item) => item.id),
    ...analystNews.map((item) => item.id),
  ]);

  const portfolioNews = excludeNewsItemIds(sections.portfolioNews, intelligenceIds);

  const activeSourceNames = Array.from(
    new Set(enriched.map((item) => item.sourceName)),
  );

  const unavailableSourceCount =
    sourceErrors.length + (!eodhdAvailable && !eodhdServedFromCache ? 1 : 0);

  const wireUnavailable = !eodhdAvailable;

  const feedsState =
    enriched.length === 0
      ? "unavailable"
      : eodhdServedFromCache && wireUnavailable && eodhdLastUpdated
        ? "cached"
        : sourceErrors.length > 0 || (wireUnavailable && !eodhdServedFromCache)
          ? "partial"
          : "live";

  const marketBrief = buildTodaysMarketBrief(
    portfolioNews,
    sections.macroNews,
    upcomingResult.events,
    fetchedAt,
  );

  return {
    success: true,
    marketBrief,
    portfolioNews,
    macroNews: sections.macroNews,
    marketVideos: sections.marketVideos,
    dividendNews,
    analystNews,
    upcomingEvents: upcomingResult.events,
    dataStatus: {
      feedsState,
      eventsState: upcomingResult.state,
      eodhdNewsAvailable: eodhdAvailable,
      eodhdLastUpdated,
      sourceCount: activeSourceNames.length,
      activeSourceNames,
      unavailableSourceCount,
    },
    sourceErrors: [],
    fetchedAt,
  };
}

export async function safeBuildNewsResponse(
  holdings: StoredPortfolioHolding[] = [],
): Promise<NewsApiResponse> {
  try {
    return await buildNewsResponse(holdings);
  } catch (error) {
    console.error("[news] buildNewsResponse failed", error);
    return createDegradedNewsResponse({
      recoveryMessage:
        error instanceof Error
          ? "News matching or provider setup failed temporarily."
          : "News could not be loaded.",
    });
  }
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function partitionNewsHub(items: NewsContentItem[]) {
  const portfolioNews = rankPortfolioNews(
    items.filter((item) => item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE),
  ).slice(0, 12);

  const portfolioKeys = new Set(
    portfolioNews.flatMap((item) => [
      item.canonicalUrl.toLowerCase(),
      normalizeTitleKey(item.title),
    ]),
  );

  const macroNews = items
    .filter(
      (item) =>
        item.relevanceScore < STRONG_PORTFOLIO_MATCH_SCORE &&
        isMacroNewsCandidate(item) &&
        !portfolioKeys.has(item.canonicalUrl.toLowerCase()) &&
        !portfolioKeys.has(normalizeTitleKey(item.title)),
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 12);

  const marketVideos = items
    .filter((item) => item.sourceType === "youtube")
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 12);

  return {
    portfolioNews,
    macroNews,
    marketVideos,
  };
}

export { createEmptyMarketBrief };
