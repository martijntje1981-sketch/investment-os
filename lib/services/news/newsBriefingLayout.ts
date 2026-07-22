import {
  computeNewsRankScore,
  isLowQualityVideo,
  isStrongMacroItem,
  isStrongPortfolioItem,
} from "@/lib/services/news/newsFeedRanking";
import { mergePortfolioSectionItems } from "@/lib/services/news/newsHubModel";
import type { NewsApiResponse, NewsContentItem, UpcomingMarketEvent } from "@/lib/types/newsContent";

export const BRIEFING_SECTION_LIMIT = 5;

export type NewsBriefingSection<T> = {
  items: T[];
  totalCount: number;
  hasMore: boolean;
};

export type HoldingNewsGroup = {
  symbol: string;
  name: string;
  articles: NewsContentItem[];
  videos: NewsContentItem[];
  analystUpdates: NewsContentItem[];
  dividendUpdates: NewsContentItem[];
  totalCount: number;
};

export type NewsBriefingLayout = {
  portfolioNews: NewsBriefingSection<NewsContentItem>;
  holdingGroups: HoldingNewsGroup[];
  marketNews: NewsBriefingSection<NewsContentItem>;
  macroNews: NewsBriefingSection<NewsContentItem>;
  videos: NewsBriefingSection<NewsContentItem>;
  upcomingEvents: NewsBriefingSection<UpcomingMarketEvent>;
  allPortfolioItems: NewsContentItem[];
  allMacroItems: NewsContentItem[];
  allMarketItems: NewsContentItem[];
  allVideos: NewsContentItem[];
};

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function rankItems(items: NewsContentItem[], now = Date.now()): NewsContentItem[] {
  return [...items].sort(
    (left, right) => computeNewsRankScore(right, now) - computeNewsRankScore(left, now),
  );
}

function eligibleItems(items: NewsContentItem[]): NewsContentItem[] {
  return items.filter(
    (item) => !(item.sourceType === "youtube" && isLowQualityVideo(item)),
  );
}

function toSection<T>(items: T[], limit = BRIEFING_SECTION_LIMIT): NewsBriefingSection<T> {
  return {
    items: items.slice(0, limit),
    totalCount: items.length,
    hasMore: items.length > limit,
  };
}

function isMarketNewsItem(item: NewsContentItem): boolean {
  return !isStrongPortfolioItem(item) && !isStrongMacroItem(item);
}

function groupItemsByHolding(input: {
  portfolioItems: NewsContentItem[];
  videos: NewsContentItem[];
  analystItems: NewsContentItem[];
  dividendItems: NewsContentItem[];
}): HoldingNewsGroup[] {
  const groups = new Map<string, HoldingNewsGroup>();

  function ensureGroup(symbol: string, name: string): HoldingNewsGroup {
    const key = symbol.toUpperCase();
    const existing = groups.get(key);
    if (existing) return existing;

    const created: HoldingNewsGroup = {
      symbol: key,
      name,
      articles: [],
      videos: [],
      analystUpdates: [],
      dividendUpdates: [],
      totalCount: 0,
    };
    groups.set(key, created);
    return created;
  }

  function addItems(
    items: NewsContentItem[],
    bucket: "articles" | "videos" | "analystUpdates" | "dividendUpdates",
  ) {
    for (const item of items) {
      const holdings =
        item.matchedHoldings.length > 0
          ? item.matchedHoldings.map((holding) => ({
              symbol: holding.symbol,
              name: holding.name,
            }))
          : item.matchedSymbols.map((symbol) => ({ symbol, name: symbol }));

      for (const holding of holdings) {
        const group = ensureGroup(holding.symbol, holding.name);
        if (bucket === "articles") group.articles.push(item);
        if (bucket === "videos") group.videos.push(item);
        if (bucket === "analystUpdates") group.analystUpdates.push(item);
        if (bucket === "dividendUpdates") group.dividendUpdates.push(item);
      }
    }
  }

  addItems(input.portfolioItems.filter((item) => item.sourceType !== "youtube"), "articles");
  addItems(input.videos, "videos");
  addItems(input.analystItems, "analystUpdates");
  addItems(input.dividendItems, "dividendUpdates");

  return [...groups.values()]
    .map((group) => ({
      ...group,
      articles: dedupeById(group.articles),
      videos: dedupeById(group.videos),
      analystUpdates: dedupeById(group.analystUpdates),
      dividendUpdates: dedupeById(group.dividendUpdates),
      totalCount:
        dedupeById(group.articles).length +
        dedupeById(group.videos).length +
        dedupeById(group.analystUpdates).length +
        dedupeById(group.dividendUpdates).length,
    }))
    .filter((group) => group.totalCount > 0)
    .sort((left, right) => right.totalCount - left.totalCount);
}

export function buildNewsBriefingLayout(
  payload: NewsApiResponse,
  now = Date.now(),
): NewsBriefingLayout {
  const portfolioMerged = mergePortfolioSectionItems({
    portfolioNews: payload.portfolioNews,
    dividendNews: payload.dividendNews,
    analystNews: payload.analystNews,
  });

  const allItems = eligibleItems([
    ...portfolioMerged,
    ...payload.macroNews,
    ...payload.marketVideos,
  ]);

  const rankedAll = rankItems(allItems, now);
  const portfolioItems = rankItems(
    rankedAll.filter((item) => isStrongPortfolioItem(item)),
    now,
  );
  const macroItems = rankItems(
    rankedAll.filter((item) => isStrongMacroItem(item)),
    now,
  );
  const marketItems = rankItems(
    rankedAll.filter((item) => isMarketNewsItem(item) && item.sourceType !== "youtube"),
    now,
  );
  const videoItems = rankItems(
    rankedAll.filter((item) => item.sourceType === "youtube"),
    now,
  );

  const holdingGroups = groupItemsByHolding({
    portfolioItems: payload.portfolioNews,
    videos: payload.marketVideos.filter((item) => isStrongPortfolioItem(item)),
    analystItems: payload.analystNews ?? [],
    dividendItems: payload.dividendNews ?? [],
  });

  const events = [...payload.upcomingEvents].sort((left, right) => {
    const impactScore = (event: UpcomingMarketEvent) =>
      event.impact === "High" ? 2 : 1;
    const impactDiff = impactScore(right) - impactScore(left);
    if (impactDiff !== 0) return impactDiff;
    return left.date.localeCompare(right.date);
  });

  return {
    portfolioNews: toSection(portfolioItems),
    holdingGroups: holdingGroups.slice(0, BRIEFING_SECTION_LIMIT),
    marketNews: toSection(marketItems),
    macroNews: toSection(macroItems),
    videos: toSection(videoItems),
    upcomingEvents: toSection(events),
    allPortfolioItems: portfolioItems,
    allMacroItems: macroItems,
    allMarketItems: marketItems,
    allVideos: videoItems,
  };
}

export function findSupportingBriefingItems(input: {
  items: NewsContentItem[];
  decisionText: string;
  mustWatchId?: string | null;
  relatedSymbols?: string[];
}): NewsContentItem[] {
  const normalizedDecision = input.decisionText.toLowerCase();
  const symbols = new Set((input.relatedSymbols ?? []).map((symbol) => symbol.toUpperCase()));

  return rankItems(input.items, Date.now())
    .filter((item) => {
      if (input.mustWatchId && item.id === input.mustWatchId) return true;
      if (
        item.matchedSymbols.some((symbol) => symbols.has(symbol.toUpperCase())) ||
        item.matchedHoldings.some((holding) => symbols.has(holding.symbol.toUpperCase()))
      ) {
        return true;
      }
      const title = item.title.toLowerCase();
      return (
        normalizedDecision.includes(title.slice(0, 24)) ||
        title.includes(normalizedDecision.slice(0, 24))
      );
    })
    .slice(0, 3);
}
