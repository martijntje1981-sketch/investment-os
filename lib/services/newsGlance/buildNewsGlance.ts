/**
 * Premium News glance — presentation only.
 * Reuses existing briefing, holding rows, coverage matching, and intelligence.
 * Does not fetch, scrape, or invent news.
 */

import {
  resolveNewsMediaFallbackCategory,
  type NewsMediaFallbackCategory,
} from "@/components/news/newsMediaFallback";
import type {
  HoldingIntelligenceCandidate,
  NewsHubHoldingRow,
} from "@/lib/services/holdingIntelligence";
import {
  buildHoldingIntelligenceCandidates,
  compareHoldingIntelligenceCandidates,
} from "@/lib/services/holdingIntelligence";
import { newsItemsAreSameDevelopment } from "@/lib/services/holdingIntelligence/storyIdentity";
import {
  buildPortfolioCoverageCandidates,
  coverageThemeFromCandidate,
  isMeaningfulCoverage,
} from "@/lib/services/news/portfolioCoverage";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { buildNewsBriefingLayout } from "@/lib/services/news/newsBriefingLayout";
import {
  clampMarketsTodayText,
  type MarketsTodayRegion,
  type MarketsTodaySentiment,
} from "@/lib/services/news/newsMarketsToday";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import { selectStoredNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import { isNavigableNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import type {
  NewsApiResponse,
  NewsContentItem,
} from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import {
  NEWS_GLANCE_BIGGER_PICTURE_LIMIT,
  NEWS_GLANCE_MARKET_REGION_IDS,
  NEWS_GLANCE_NO_MATERIAL,
  type NewsGlanceBiggerPictureItem,
  type NewsGlanceHoldingRow,
  type NewsGlanceMarketRegionId,
  type NewsGlanceMarketTile,
  type NewsGlanceMatchKind,
  type NewsGlanceMoveDirection,
  type NewsGlanceSynthesis,
  type NewsGlanceView,
  type NewsGlanceVisualFamily,
} from "@/lib/services/newsGlance/types";

const MEANINGFUL_MOVE_PERCENT = 1;
const MATERIAL_SLEEVE_WEIGHT = 10;
const MARKET_TILE_LABELS: Record<NewsGlanceMarketRegionId, string> = {
  us: "US",
  europe: "Europe",
  asia: "Asia",
  crypto: "Crypto",
};

export function buildNewsGlance(input: {
  payload: NewsApiResponse;
  intelligence: InvestmentIntelligence;
  holdings: StoredPortfolioHolding[];
  intelligenceDepth?: "free" | "complete";
}): NewsGlanceView {
  const briefing = buildNewsBriefingLayout(input.payload, {
    holdings: input.holdings,
    intelligenceDepth: input.intelligenceDepth === "free" ? "free" : "complete",
  });

  const holdingRows = briefing.holdingIntelligenceRows.map(toGlanceHoldingRow);
  const biggerPicture = selectBiggerPictureItems({
    payload: input.payload,
    holdings: input.holdings,
    holdingRows: briefing.holdingIntelligenceRows,
    macroItems: [
      ...briefing.allMacroItems,
      ...briefing.macroGroups.flatMap((group) => group.items),
    ],
  });
  const coverageCandidates = buildHoldingIntelligenceCandidates({
    holdings: input.holdings,
    newsItems: [...input.payload.portfolioNews, ...input.payload.macroNews],
  });

  return {
    holdingRows,
    aroundTheMarkets: buildAroundTheMarkets(briefing.marketsToday),
    biggerPicture,
    synthesis: buildNewsSynthesis({
      holdingRows,
      biggerPicture,
      intelligence: input.intelligence,
      holdings: input.holdings,
      coverageCandidates,
    }),
    fetchedAt: input.payload.fetchedAt || null,
  };
}

function toGlanceHoldingRow(row: NewsHubHoldingRow): NewsGlanceHoldingRow {
  const item = row.contextItem;
  const matchKind = matchKindFromRole(row.matchRole);
  const thumbnailUrl = item
    ? selectStoredNewsThumbnail({
        thumbnailUrl: item.thumbnailUrl,
        canonicalUrl: item.canonicalUrl,
        sourceType: item.sourceType,
      })
    : null;
  const visualFamily = visualFamilyFromHoldingRow(row);

  return {
    holdingId: row.candidate.holdingId,
    symbol: row.candidate.symbol,
    name: row.candidate.name,
    exposureLabel: row.exposureLabel,
    weightPercent:
      row.candidate.weightPercent != null && Number.isFinite(row.candidate.weightPercent)
        ? row.candidate.weightPercent
        : null,
    changePercent:
      row.candidate.changePercent != null && Number.isFinite(row.candidate.changePercent)
        ? row.candidate.changePercent
        : null,
    moveLabel: row.moveLabel,
    moveDirection: moveDirectionFromPercent(row.candidate.changePercent),
    headline: item && matchKind !== "none" ? item.title : null,
    sourceName: item && matchKind !== "none" ? item.sourceName : null,
    publishedAt: item && matchKind !== "none" ? item.publishedAt : null,
    canonicalUrl:
      item && matchKind !== "none" && isNavigableNewsUrl(item.canonicalUrl)
        ? item.canonicalUrl
        : null,
    thumbnailUrl,
    hasThumbnail: Boolean(thumbnailUrl),
    matchRole: row.matchRole,
    matchKind,
    classificationLabel: classificationLabelFromKind(matchKind),
    emptyCopy: matchKind === "none" ? NEWS_GLANCE_NO_MATERIAL : null,
    visualFamily,
    fallbackCategory: item
      ? resolveNewsMediaFallbackCategory(item)
      : fallbackCategoryFromFamily(visualFamily),
    sourceItem: item,
  };
}

function matchKindFromRole(
  role: NewsHubHoldingRow["matchRole"],
): NewsGlanceMatchKind {
  if (role === "catalyst_context") return "direct";
  if (role === "sector_context") return "sector";
  if (role === "macro_context") return "macro";
  return "none";
}

function classificationLabelFromKind(
  kind: NewsGlanceMatchKind,
): NewsGlanceHoldingRow["classificationLabel"] {
  if (kind === "direct") return "Direct";
  if (kind === "sector") return "Context";
  if (kind === "macro") return "Macro";
  return null;
}

function moveDirectionFromPercent(
  value: number | null | undefined,
): NewsGlanceMoveDirection {
  if (value == null || !Number.isFinite(value)) return "unknown";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function visualFamilyFromHoldingRow(
  row: NewsHubHoldingRow,
): NewsGlanceVisualFamily {
  const candidate = row.candidate;
  if (
    candidate.isCrypto ||
    candidate.isBitcoin ||
    candidate.exposureGroupId === "crypto"
  ) {
    return "crypto";
  }
  if (candidate.exposureGroupId === "precious_metals") {
    return "commodities";
  }
  if (row.matchRole === "macro_context" || candidate.matchType === "macro_context") {
    return "macro";
  }
  return "holding";
}

function visualFamilyFromItem(
  item: NewsContentItem,
  matchKind: "sector" | "macro",
): NewsGlanceVisualFamily {
  if (item.marketCategory === "crypto" || item.category === "crypto") {
    return "crypto";
  }
  if (item.marketCategory === "commodities") {
    return "commodities";
  }
  if (matchKind === "macro" || item.marketCategory === "macro" || item.category === "macro") {
    return "macro";
  }
  return "holding";
}

function fallbackCategoryFromFamily(
  family: NewsGlanceVisualFamily,
): NewsMediaFallbackCategory {
  if (family === "crypto") return "crypto";
  if (family === "commodities") return "commodities";
  if (family === "macro") return "macro";
  return "portfolio";
}

function themeLabelFromItem(item: NewsContentItem, coverageLabel: string): string {
  if (
    item.macroTopic === "interest_rates" ||
    item.macroTopic === "monetary_policy" ||
    item.macroTopic === "inflation"
  ) {
    return "Rates";
  }
  if (item.marketCategory === "crypto" || item.category === "crypto") {
    return "Crypto";
  }
  if (item.marketCategory === "commodities") {
    return "Commodities";
  }
  return coverageLabel;
}

function selectBiggerPictureItems(input: {
  payload: NewsApiResponse;
  holdings: StoredPortfolioHolding[];
  holdingRows: NewsHubHoldingRow[];
  macroItems: NewsContentItem[];
}): NewsGlanceBiggerPictureItem[] {
  if (input.holdings.length === 0) return [];

  const holdingStories = input.holdingRows
    .map((row) => row.contextItem)
    .filter((item): item is NewsContentItem => Boolean(item));

  const seenIds = new Set<string>();
  const pool: NewsContentItem[] = [];
  for (const item of [...input.macroItems, ...input.payload.macroNews]) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    if (holdingStories.some((holdingItem) => newsItemsAreSameDevelopment(holdingItem, item))) {
      continue;
    }
    pool.push(item);
  }

  if (pool.length === 0) return [];

  const coverage = buildPortfolioCoverageCandidates({
    holdings: input.holdings,
    newsItems: pool,
  });

  const ordered = [...coverage].sort((left, right) =>
    compareHoldingIntelligenceCandidates(left.candidate, right.candidate),
  );

  const selected: NewsGlanceBiggerPictureItem[] = [];

  for (const row of ordered) {
    if (selected.length >= NEWS_GLANCE_BIGGER_PICTURE_LIMIT) break;
    if (!isMeaningfulCoverage(row.candidate) || !row.strongestItem) continue;

    const matchType = row.candidate.matchType;
    if (matchType !== "sector_theme" && matchType !== "macro_context") continue;

    const item = row.strongestItem;
    if (
      selected.some((existing) =>
        newsItemsAreSameDevelopment(existing.sourceItem, item),
      )
    ) {
      continue;
    }

    const relevanceCue = relevanceCueForCoverage(row.candidate.weightPercent, row.coverageLabel);
    if (!relevanceCue) continue;

    const matchKind: "sector" | "macro" =
      matchType === "macro_context" ? "macro" : "sector";
    const thumbnailUrl = selectStoredNewsThumbnail({
      thumbnailUrl: item.thumbnailUrl,
      canonicalUrl: item.canonicalUrl,
      sourceType: item.sourceType,
    });
    const visualFamily = visualFamilyFromItem(item, matchKind);

    selected.push({
      id: item.id,
      themeLabel: themeLabelFromItem(item, row.coverageLabel),
      headline: item.title,
      sourceName: item.sourceName,
      publishedAt: item.publishedAt,
      canonicalUrl: isNavigableNewsUrl(item.canonicalUrl) ? item.canonicalUrl : null,
      thumbnailUrl,
      hasThumbnail: Boolean(thumbnailUrl),
      relevanceCue,
      matchKind,
      visualFamily,
      fallbackCategory: resolveNewsMediaFallbackCategory(item),
      sourceItem: item,
    });
  }

  return selected;
}

function relevanceCueForCoverage(
  weightPercent: number | null | undefined,
  coverageLabel: string,
): string | null {
  if (weightPercent != null && Number.isFinite(weightPercent) && weightPercent >= 1) {
    return `Relevant to ${Math.round(weightPercent)}% of portfolio value`;
  }
  const label = coverageLabel.trim();
  if (!label) return null;
  return `Relevant to your ${label.toLowerCase()} exposure`;
}

function marketStatusLabel(
  sentiment: MarketsTodaySentiment,
  available: boolean,
): string {
  if (!available) return "Unavailable";
  if (sentiment === "Positive") return "Higher";
  if (sentiment === "Negative") return "Lower";
  return "Mixed";
}

function marketVisualFamily(
  id: NewsGlanceMarketRegionId,
): NewsGlanceVisualFamily {
  if (id === "crypto") return "crypto";
  return "macro";
}

function buildAroundTheMarkets(
  regions: MarketsTodayRegion[],
): NewsGlanceMarketTile[] {
  const byId = new Map(regions.map((region) => [region.id, region]));
  return NEWS_GLANCE_MARKET_REGION_IDS.map((id) => {
    const region = byId.get(id);
    const available = Boolean(region && region.stories.length > 0);
    const sentiment = region?.sentiment ?? "unavailable";
    const signal = available
      ? clampMarketsTodayText(region?.highestImpactStory?.title ?? "", 42) || null
      : null;

    return {
      id,
      label: MARKET_TILE_LABELS[id],
      href: NEWS_MARKETS_TODAY_HREF,
      sentiment: available ? sentiment : "unavailable",
      statusLabel: marketStatusLabel(sentiment, available),
      signal,
      available,
      visualFamily: marketVisualFamily(id),
    };
  });
}

function hasMeaningfulMove(row: NewsGlanceHoldingRow): boolean {
  return (
    row.changePercent != null &&
    Number.isFinite(row.changePercent) &&
    Math.abs(row.changePercent) >= MEANINGFUL_MOVE_PERCENT
  );
}

function buildNewsSynthesis(input: {
  holdingRows: NewsGlanceHoldingRow[];
  biggerPicture: NewsGlanceBiggerPictureItem[];
  intelligence: InvestmentIntelligence;
  holdings: StoredPortfolioHolding[];
  coverageCandidates: HoldingIntelligenceCandidate[];
}): NewsGlanceSynthesis {
  if (input.intelligence.quietMarket) return null;
  if (input.holdings.length === 0) return null;

  const withNews = input.holdingRows.filter(
    (row) => row.matchKind !== "none" && row.sourceItem,
  );
  const coveredCandidates = input.coverageCandidates.filter(
    (candidate) =>
      candidate.newsItem &&
      candidate.matchType !== "none" &&
      (candidate.weightPercent ?? 0) >= 1,
  );
  if (
    withNews.length === 0 &&
    coveredCandidates.length === 0 &&
    input.biggerPicture.length === 0
  ) {
    return null;
  }

  const moveAndCoverage = withNews.filter(
    (row) => hasMeaningfulMove(row) && (row.weightPercent ?? 0) >= MATERIAL_SLEEVE_WEIGHT,
  );
  if (moveAndCoverage.length > 0) {
    const lead = moveAndCoverage[0]!;
    return {
      kicker: "Today’s theme",
      text: `${lead.exposureLabel} moved ${lead.moveLabel} today, with relevant coverage.`,
    };
  }

  const themeGroups = new Map<string, HoldingIntelligenceCandidate[]>();
  for (const candidate of coveredCandidates) {
    const key = coverageThemeFromCandidate(candidate).label.trim();
    if (!key) continue;
    const list = themeGroups.get(key) ?? [];
    list.push(candidate);
    themeGroups.set(key, list);
  }
  const sharedTheme = [...themeGroups.entries()].find(([, rows]) => rows.length >= 2);
  if (sharedTheme) {
    return {
      kicker: "Today’s theme",
      text: `${sharedTheme[0]} coverage reaches more than one holding today.`,
    };
  }

  const materialContext = withNews.find(
    (row) =>
      (row.matchKind === "sector" || row.matchKind === "macro") &&
      (row.weightPercent ?? 0) >= MATERIAL_SLEEVE_WEIGHT,
  );
  if (input.biggerPicture.length > 0 && materialContext) {
    const theme = input.biggerPicture[0]!;
    return {
      kicker: "Today’s theme",
      text: `${theme.themeLabel} is relevant to your ${materialContext.exposureLabel.toLowerCase()} exposure.`,
    };
  }

  return null;
}
