/**
 * Holding-page news list from the existing cached pool.
 * No extra fetch. Direct/alias matches first; verified sector/theme
 * is allowed only as labeled context. Weak filler is dropped.
 */

import { CONTEXTUAL_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import {
  classifyHoldingNewsMatchType,
  newsItemMatchesHolding,
} from "@/lib/services/holdingIntelligence/attachHoldingNews";
import { newsItemStoryKeys } from "@/lib/services/holdingIntelligence/storyIdentity";
import type { HoldingNewsMatchType } from "@/lib/services/holdingIntelligence/types";

export const HOLDING_PAGE_NEWS_MAX = 4;

export type HoldingPageNewsMatchRole = "direct" | "alias" | "sector_context";

export type HoldingPageNewsItem = {
  item: NewsContentItem;
  matchType: HoldingNewsMatchType;
  matchRole: HoldingPageNewsMatchRole;
};

function matchRank(matchType: HoldingNewsMatchType): number {
  if (matchType === "direct_instrument") return 3;
  if (matchType === "instrument_alias") return 2;
  if (matchType === "sector_theme") return 1;
  return 0;
}

function matchRoleFor(
  matchType: HoldingNewsMatchType,
): HoldingPageNewsMatchRole | null {
  if (matchType === "direct_instrument") return "direct";
  if (matchType === "instrument_alias") return "alias";
  if (matchType === "sector_theme") return "sector_context";
  return null;
}

export function isDisplayableHoldingPageNewsMatch(
  matchType: HoldingNewsMatchType,
  relevanceScore: number,
  options: { isBitcoin?: boolean } = {},
): boolean {
  if (matchType === "direct_instrument" || matchType === "instrument_alias") {
    return true;
  }
  if (matchType !== "sector_theme") return false;
  if (options.isBitcoin) return false;
  return relevanceScore >= CONTEXTUAL_PORTFOLIO_MATCH_SCORE;
}

export function selectHoldingPageNewsItems(
  items: NewsContentItem[],
  holding: Pick<StoredPortfolioHolding, "id" | "symbol">,
  options?: { isBitcoin?: boolean; limit?: number },
): HoldingPageNewsItem[] {
  const isBitcoin = options?.isBitcoin ?? false;
  const limit = Math.min(
    Math.max(options?.limit ?? HOLDING_PAGE_NEWS_MAX, 0),
    HOLDING_PAGE_NEWS_MAX,
  );
  if (limit === 0) return [];

  const ranked = items
    .filter((item) => newsItemMatchesHolding(item, holding))
    .map((item) => {
      const relevanceScore = item.relevanceScore ?? 0;
      const matchType = classifyHoldingNewsMatchType(relevanceScore);
      return { item, matchType, relevanceScore };
    })
    .filter((row) =>
      isDisplayableHoldingPageNewsMatch(row.matchType, row.relevanceScore, {
        isBitcoin,
      }),
    )
    .sort((a, b) => {
      const rankDiff = matchRank(b.matchType) - matchRank(a.matchType);
      if (rankDiff !== 0) return rankDiff;
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (scoreDiff !== 0) return scoreDiff;
      return b.item.publishedAt.localeCompare(a.item.publishedAt);
    });

  const selected: HoldingPageNewsItem[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    const keys = newsItemStoryKeys(row.item);
    const identity = keys.canonicalUrl || keys.articleId || keys.themeKey;
    if (!identity || seen.has(identity)) continue;
    const matchRole = matchRoleFor(row.matchType);
    if (!matchRole) continue;
    seen.add(identity);
    selected.push({
      item: row.item,
      matchType: row.matchType,
      matchRole,
    });
    if (selected.length >= limit) break;
  }
  return selected;
}
