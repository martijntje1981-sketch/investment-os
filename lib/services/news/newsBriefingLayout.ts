import {
  isLowQualityVideo,
  isStrongMacroItem,
  isStrongPortfolioItem,
} from "@/lib/services/news/newsFeedRanking";
import { prepareBriefingCandidatePool } from "@/lib/services/news/newsBriefingDedup";
import { buildMacroTopicGroups, type MacroTopicGroup } from "@/lib/services/news/newsMacroGroups";
import {
  buildMarketsTodayRegions,
  type MarketsTodayRegion,
} from "@/lib/services/news/newsMarketsToday";
import {
  createPageDedupState,
  filterPageDuplicates,
  markPageItemUsed,
  seedPageDedupState,
  takeUniquePageItems,
} from "@/lib/services/news/newsPageDedup";
import { rankNewsItemsForBriefing } from "@/lib/services/news/newsPortfolioRanking";
import {
  affectedHoldingsForItem,
  detectPortfolioMarketImpact,
  portfolioImpactConfidence,
  type PortfolioMarketImpact,
} from "@/lib/services/news/newsPortfolioSentiment";
import { isTrustedVideoSource } from "@/lib/services/news/newsSourceQuality";
import { selectTrustedNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import { isNavigableNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import { resolveNewsMediaTypeFromItem } from "@/lib/services/news/newsMediaType";
import { mergePortfolioSectionItems } from "@/lib/services/news/newsHubModel";
import { buildHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates";
import {
  buildNewsHubHoldingRows,
  type NewsHubHoldingRow,
} from "@/lib/services/holdingIntelligence/newsHubRows";
import {
  exposureLabelForNewsItem,
  orderNewsItemsForPortfolioCoverage,
  selectCoverageFirstNewsItems,
  COVERAGE_STORY_TARGET_MAX,
} from "@/lib/services/news/portfolioCoverage";
import { compareHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/rankHoldingIntelligence";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type {
  NewsApiResponse,
  NewsContentItem,
  NewsMarketCategory,
  NewsSourceType,
  TodaysMarketBrief,
  UpcomingMarketEvent,
} from "@/lib/types/newsContent";
import type { NewsMediaType } from "@/lib/services/news/newsMediaType";

export const BRIEFING_SECTION_LIMIT = 5;
export const MARKET_BRIEF_HEADLINE_LIMIT = 10;
export const PORTFOLIO_NEWS_LIMIT = 8;
export const TRUSTED_VIDEO_LIMIT = 5;

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

export type NewsBriefHeadline = {
  id: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  affectedMarket: string;
  marketCategory: NewsMarketCategory;
  publishedAt: string;
  sourceName: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  mediaType: NewsMediaType;
  sourceType: NewsSourceType;
};

export type PortfolioNewsCard = {
  item: NewsContentItem;
  affectedHoldings: string[];
  marketImpact: PortfolioMarketImpact;
  confidence: string | null;
  exposureLabel: string | null;
};

export type NewsBriefingLayoutOptions = {
  now?: number;
  /** Items already shown in Today's Portfolio Intelligence (Top Story + Supporting). */
  pageDedupSeed?: NewsContentItem[];
  /** Eligible holdings for portfolio-first ranking. No extra fetch. */
  holdings?: StoredPortfolioHolding[];
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
};

export type NewsBriefingLayout = {
  marketBriefHeadlines: NewsBriefHeadline[];
  portfolioCards: PortfolioNewsCard[];
  holdingIntelligenceRows: NewsHubHoldingRow[];
  macroGroups: MacroTopicGroup[];
  marketsToday: MarketsTodayRegion[];
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

function formatAffectedMarket(category: NewsContentItem["marketCategory"]): string {
  switch (category) {
    case "macro":
      return "Macro";
    case "equities":
      return "Equities";
    case "crypto":
      return "Crypto";
    case "commodities":
      return "Commodities";
    case "geopolitics":
      return "Geopolitics";
    default:
      return "Markets";
  }
}

function toBriefHeadline(item: NewsContentItem): NewsBriefHeadline {
  return {
    id: item.id,
    headline: item.title,
    summary:
      item.summary?.trim() ||
      (item.description ?? "").trim().slice(0, 180) ||
      "Verified headline in today's briefing.",
    whyItMatters:
      item.interpretation?.trim() ||
      "This development may influence risk sentiment across your monitored markets.",
    affectedMarket: formatAffectedMarket(item.marketCategory),
    marketCategory: item.marketCategory,
    publishedAt: item.publishedAt,
    sourceName: item.sourceName,
    canonicalUrl: item.canonicalUrl,
    thumbnailUrl: selectTrustedNewsThumbnail(item),
    mediaType: resolveNewsMediaTypeFromItem(item),
    sourceType: item.sourceType,
  };
}

function insightToHeadline(
  insight: TodaysMarketBrief["keyInsights"][number],
  index: number,
): NewsBriefHeadline {
  const canonicalUrl = isNavigableNewsUrl(insight.canonicalUrl)
    ? insight.canonicalUrl
    : "#";

  return {
    id: `brief-insight-${index}`,
    headline: insight.label,
    summary: insight.text,
    whyItMatters:
      insight.insightType === "interpretation"
        ? insight.text
        : "Confirmed headline from verified sources in today's brief.",
    affectedMarket:
      insight.kind === "macro"
        ? "Macro"
        : insight.kind === "portfolio"
          ? "Portfolio"
          : "Markets",
    marketCategory:
      insight.kind === "macro"
        ? "macro"
        : insight.kind === "portfolio"
          ? "equities"
          : "general",
    publishedAt: new Date().toISOString(),
    sourceName: insight.sourceName ?? "Verified feed",
    canonicalUrl,
    thumbnailUrl: selectTrustedNewsThumbnail({
      thumbnailUrl: insight.thumbnailUrl ?? null,
      sourceType: insight.sourceType ?? "news",
    }),
    mediaType: insight.sourceType === "youtube" ? "video" : "article",
    sourceType: insight.sourceType ?? "news",
  };
}

function buildMarketBriefHeadlines(
  marketBrief: TodaysMarketBrief,
  candidates: NewsContentItem[],
  state: ReturnType<typeof createPageDedupState>,
  now: number,
): NewsBriefHeadline[] {
  const headlines: NewsBriefHeadline[] = [];

  for (const [index, insight] of marketBrief.keyInsights.entries()) {
    headlines.push(insightToHeadline(insight, index));
  }

  const rankedItems = takeUniquePageItems(
    candidates,
    state,
    Number.POSITIVE_INFINITY,
    now,
  );

  for (const item of rankedItems) {
    headlines.push(toBriefHeadline(item));
  }

  return headlines;
}

function toPortfolioCard(
  item: NewsContentItem,
  holdings: StoredPortfolioHolding[] = [],
): PortfolioNewsCard {
  return {
    item,
    affectedHoldings: affectedHoldingsForItem(item),
    marketImpact: detectPortfolioMarketImpact(item),
    confidence: portfolioImpactConfidence(item),
    exposureLabel: exposureLabelForNewsItem(item, holdings),
  };
}

function isTrustedVideo(item: NewsContentItem): boolean {
  return (
    item.sourceType === "youtube" &&
    isTrustedVideoSource(item.sourceName) &&
    !isLowQualityVideo(item)
  );
}

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
  holdings?: StoredPortfolioHolding[];
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

  const rankedHoldings =
    (input.holdings?.length ?? 0) > 0
      ? buildHoldingIntelligenceCandidates({
          holdings: input.holdings ?? [],
          newsItems: input.portfolioItems,
        })
      : [];
  const materiality = new Map(
    rankedHoldings.map((candidate) => [candidate.symbol.trim().toUpperCase(), candidate]),
  );

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
    .sort((left, right) => {
      const leftCandidate = materiality.get(left.symbol);
      const rightCandidate = materiality.get(right.symbol);
      if (leftCandidate && rightCandidate) {
        return compareHoldingIntelligenceCandidates(leftCandidate, rightCandidate);
      }
      if (leftCandidate && !rightCandidate) return -1;
      if (!leftCandidate && rightCandidate) return 1;
      return left.symbol.localeCompare(right.symbol);
    });
}

function markMarketsTodayStoriesUsed(
  regions: MarketsTodayRegion[],
  itemsById: Map<string, NewsContentItem>,
  state: ReturnType<typeof createPageDedupState>,
): void {
  for (const region of regions) {
    for (const story of region.stories) {
      const item = itemsById.get(story.id);
      if (item) {
        markPageItemUsed(item, state);
      }
    }
  }
}

export function buildNewsBriefingLayout(
  payload: NewsApiResponse,
  options: NewsBriefingLayoutOptions | number = {},
): NewsBriefingLayout {
  const resolvedOptions: NewsBriefingLayoutOptions =
    typeof options === "number" ? { now: options } : options;
  const now = resolvedOptions.now ?? Date.now();

  const portfolioMerged = mergePortfolioSectionItems({
    portfolioNews: payload.portfolioNews,
    dividendNews: payload.dividendNews,
    analystNews: payload.analystNews,
  });

  const pool = prepareBriefingCandidatePool(
    eligibleItems([
      ...portfolioMerged,
      ...payload.macroNews,
      ...payload.marketVideos,
    ]),
  );

  const pageDedupState = createPageDedupState();
  seedPageDedupState(pageDedupState, resolvedOptions.pageDedupSeed ?? []);

  const rankedAll = rankNewsItemsForBriefing(pool, now);
  const itemsById = new Map(rankedAll.map((item) => [item.id, item]));

  const portfolioPool = rankedAll.filter(
    (item) => isStrongPortfolioItem(item) && item.sourceType !== "youtube",
  );
  const holdings = resolvedOptions.holdings ?? [];
  const coverageOrderedPool =
    holdings.length > 0
      ? orderNewsItemsForPortfolioCoverage({
          holdings,
          items: portfolioPool,
        })
      : portfolioPool;
  const portfolioSelected = takeUniquePageItems(
    coverageOrderedPool,
    pageDedupState,
    Number.POSITIVE_INFINITY,
    now,
  );
  const featuredPortfolioItems =
    holdings.length > 0
      ? selectCoverageFirstNewsItems({
          holdings,
          items: portfolioSelected,
        }).items.slice(0, COVERAGE_STORY_TARGET_MAX)
      : portfolioSelected;
  const portfolioCards = featuredPortfolioItems.map((item) =>
    toPortfolioCard(item, holdings),
  );

  const marketsTodayCandidates = filterPageDuplicates(rankedAll, pageDedupState);
  const marketsToday = buildMarketsTodayRegions({
    items: marketsTodayCandidates,
  });
  markMarketsTodayStoriesUsed(marketsToday, itemsById, pageDedupState);

  const macroPool = rankedAll.filter((item) => isStrongMacroItem(item));
  const macroSelected = takeUniquePageItems(
    macroPool,
    pageDedupState,
    Number.POSITIVE_INFINITY,
    now,
  );
  const macroGroups = buildMacroTopicGroups(macroSelected);

  const marketBriefHeadlines = buildMarketBriefHeadlines(
    payload.marketBrief,
    rankedAll.filter((item) => !isStrongPortfolioItem(item)),
    pageDedupState,
    now,
  );

  const videoPool = rankedAll.filter((item) => isTrustedVideo(item));
  const videoSelected = takeUniquePageItems(
    videoPool,
    pageDedupState,
    Number.POSITIVE_INFINITY,
    now,
  );

  const portfolioItems = portfolioSelected;
  const macroItems = macroSelected;
  const marketItems = takeUniquePageItems(
    rankedAll.filter(
      (item) => isMarketNewsItem(item) && item.sourceType !== "youtube",
    ),
    pageDedupState,
    Number.POSITIVE_INFINITY,
    now,
  );
  const videoItems = videoSelected;

  const holdingGroups = groupItemsByHolding({
    portfolioItems: payload.portfolioNews,
    videos: payload.marketVideos.filter((item) => isStrongPortfolioItem(item)),
    analystItems: payload.analystNews ?? [],
    dividendItems: payload.dividendNews ?? [],
    holdings: resolvedOptions.holdings,
  });

  const holdingIntelligenceRows =
    (resolvedOptions.holdings?.length ?? 0) > 0
      ? buildNewsHubHoldingRows(
          buildHoldingIntelligenceCandidates({
            holdings: resolvedOptions.holdings ?? [],
            newsItems: [
              ...portfolioMerged,
              ...payload.macroNews,
            ],
          }),
          resolvedOptions.intelligenceDepth === "free" ? "free" : "complete",
        )
      : [];

  const events = [...payload.upcomingEvents]
    .filter((event) => event.date >= new Date(now).toISOString().slice(0, 10))
    .sort((left, right) => {
    const impactScore = (event: UpcomingMarketEvent) =>
      event.impact === "High" ? 2 : 1;
    const impactDiff = impactScore(right) - impactScore(left);
    if (impactDiff !== 0) return impactDiff;
    return left.date.localeCompare(right.date);
  });

  return {
    marketBriefHeadlines,
    portfolioCards,
    holdingIntelligenceRows,
    macroGroups,
    marketsToday,
    portfolioNews: toSection(portfolioItems),
    holdingGroups: holdingGroups.slice(0, BRIEFING_SECTION_LIMIT),
    marketNews: toSection(marketItems),
    macroNews: toSection(macroItems),
    videos: toSection(videoItems, TRUSTED_VIDEO_LIMIT),
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
  now?: number;
}): NewsContentItem[] {
  const normalizedDecision = input.decisionText.toLowerCase();
  const symbols = new Set(
    (input.relatedSymbols ?? []).map((symbol) => symbol.toUpperCase()),
  );
  const now = input.now ?? Date.now();

  return rankNewsItemsForBriefing(input.items, now)
    .filter((item) => {
      if (input.mustWatchId && item.id === input.mustWatchId) {
        return false;
      }
      if (
        item.matchedSymbols.some((symbol) => symbols.has(symbol.toUpperCase())) ||
        item.matchedHoldings.some((holding) =>
          symbols.has(holding.symbol.toUpperCase()),
        )
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
