/**
 * Premium News glance — presentation only.
 * Reuses existing briefing, holding rows, coverage matching, and intelligence.
 * Does not fetch, scrape, or invent news.
 */

import {
  resolveNewsMediaFallbackCategory,
  type NewsMediaFallbackCategory,
} from "@/components/news/newsMediaFallback";
import type { NewsHubHoldingRow } from "@/lib/services/holdingIntelligence";
import { compareHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence";
import { newsItemsAreSameDevelopment } from "@/lib/services/holdingIntelligence/storyIdentity";
import {
  buildPortfolioCoverageCandidates,
  isMeaningfulCoverage,
} from "@/lib/services/news/portfolioCoverage";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { buildNewsBriefingLayout } from "@/lib/services/news/newsBriefingLayout";
import { selectStoredNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import { isNavigableNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import type {
  NewsApiResponse,
  NewsContentItem,
} from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import {
  NEWS_GLANCE_BIGGER_PICTURE_LIMIT,
  NEWS_GLANCE_NO_MATERIAL,
  type NewsGlanceBiggerPictureItem,
  type NewsGlanceHoldingRow,
  type NewsGlanceMatchKind,
  type NewsGlanceMoveDirection,
  type NewsGlanceSynthesis,
  type NewsGlanceView,
  type NewsGlanceVisualFamily,
} from "@/lib/services/newsGlance/types";

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

  return {
    holdingRows,
    biggerPicture,
    synthesis: buildNewsSynthesis({
      holdingRows,
      intelligence: input.intelligence,
      holdings: input.holdings,
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
  if (kind === "sector") return "Sector / theme context";
  if (kind === "macro") return "Macro context";
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

function buildNewsSynthesis(input: {
  holdingRows: NewsGlanceHoldingRow[];
  intelligence: InvestmentIntelligence;
  holdings: StoredPortfolioHolding[];
}): NewsGlanceSynthesis {
  if (input.intelligence.quietMarket) return null;
  if (input.holdings.length === 0) return null;

  const withNews = input.holdingRows.filter(
    (row) => row.matchKind !== "none" && row.sourceItem,
  );
  if (withNews.length === 0) return null;

  const lead = withNews[0]!;
  const leadWeight = weightFromRow(lead);
  const otherWeights = withNews.slice(1).map(weightFromRow);
  const maxOther = otherWeights.reduce((max, value) => Math.max(max, value), 0);
  const distinctThemes = uniqueLabels(withNews.map((row) => row.exposureLabel));

  if (
    leadWeight >= 25 &&
    (withNews.length === 1 || leadWeight >= maxOther * 1.5)
  ) {
    return {
      kicker: "Today’s theme",
      text: `${lead.exposureLabel} has relevant coverage today and represents ${Math.round(leadWeight)}% of portfolio value.`,
    };
  }

  if (distinctThemes.length >= 2) {
    const shown = distinctThemes.slice(0, 2);
    return {
      kicker: "Today’s theme",
      text: `Relevant coverage spans ${shown.join(" and ")} today.`,
    };
  }

  return null;
}

function weightFromRow(row: NewsGlanceHoldingRow): number {
  return row.weightPercent ?? 0;
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}
